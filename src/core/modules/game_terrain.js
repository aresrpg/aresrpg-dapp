import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Vector3 } from 'three'
import { ChunksProcessing } from '@aresrpg/aresrpg-world'
import { WorkerPool } from '@aresrpg/aresrpg-world/workerpool'
import {
  decompress_chunk_column,
  compress_chunk_column,
  spiral_array,
  to_chunk_position,
} from '@aresrpg/aresrpg-sdk/chunk'
import { world_settings } from '@aresrpg/aresrpg-sdk/world'
import { LRUCache } from 'lru-cache'

import { chunk_rendering_mode, current_three_character } from '../game/game.js'
import { abortable, state_iterator, typed_on } from '../utils/iterator.js'
import { to_engine_chunk_format } from '../utils/terrain/world_utils.js'

// The server won't send twice the same chunk for a session, unless time has passed
// If the cache was too full, then local generation would be used to retrieve missing ones
const COMPRESSED_CHUNK_CACHE = new LRUCache({
  maxSize: 100 * 1024 * 1024, // 100mb limit
  // @ts-ignore - Use a rough estimation of the base64 size of a chunk
  sizeCalculation: item => Math.ceil(item.length * 0.75), // base64 size in bytes
})

// From 0 to top, there are 6 chunks stacked in a column
const CHUNKS_PER_COLUMN = 6
const SERVER_MAX_CHUNK_DISTANCE = 2

function exclude_positions(positions) {
  return ({ x, y, z }) =>
    !positions.some(
      position => position.x === x && position.y === y && position.z === z,
    )
}

function column_to_chunk_ids({ x, z }) {
  return Array.from({ length: CHUNKS_PER_COLUMN }).map((_, y) => ({ x, y, z }))
}

const chunks_processing_worker_pool = new WorkerPool()

chunks_processing_worker_pool.init(navigator.hardwareConcurrency)

await chunks_processing_worker_pool.loadWorldEnv(world_settings.rawSettings)

function create_empty_chunk_from_array({ ref_metadata, chunk_index, x, z }) {
  const y_base = chunk_index * 64 // Y spans from 0 to 320 (0, 64, 128, 192, 256, 320)

  return {
    metadata: {
      chunkKey: `chunk_${x}_${chunk_index}_${z}`,
      bounds: {
        isBox3: true,
        min: {
          x: ref_metadata.bounds.min.x,
          y: y_base,
          z: ref_metadata.bounds.min.z,
        },
        max: {
          x: ref_metadata.bounds.max.x,
          y: y_base + 64,
          z: ref_metadata.bounds.max.z,
        },
      },
      margin: ref_metadata.margin,
      isEmpty: true,
    },
    rawdata: new Uint16Array(),
  }
}

/** @type {Type.Module} */
export default function () {
  return {
    tick(_, { renderer, voxel_engine }) {
      voxel_engine.terrain_viewer.update(renderer)
      voxel_engine.heightmap_atlas.update(renderer)
    },
    observe({
      camera,
      events,
      signal,
      scene,
      get_state,
      physics,
      voxel_engine,
    }) {
      const { voxelmap_viewer, terrain_viewer } = voxel_engine

      function render_world_chunk(
        world_chunk,
        { ignore_collision = false } = {},
      ) {
        const { id, voxels_chunk_data } = to_engine_chunk_format(world_chunk)

        voxelmap_viewer.invalidateChunk(id)
        // @ts-ignore
        voxelmap_viewer.enqueueChunk(id, voxels_chunk_data)

        if (!ignore_collision)
          // @ts-ignore
          physics.voxelmap_collider.setChunk(id, voxels_chunk_data)
      }

      window.dispatchEvent(new Event('assets_loading'))
      // this notify the player_movement module that the terrain is ready

      scene.add(terrain_viewer.container)

      events.on('packet/chunk', async ({ key, column }) => {
        COMPRESSED_CHUNK_CACHE.set(key, column)
      })

      function is_chunk_mode(mode, state = get_state()) {
        return state.settings.terrain.chunk_generation === mode
      }

      function chunk_processor() {
        const queue = new Map()

        return {
          schedule_chunks_generation({
            columns_to_generate = [],
            all_visible_columns = [],
          }) {
            // simply remove unwanted columns from the queue
            queue.forEach((task, key) => {
              if (!all_visible_columns.includes(key)) {
                task.cancel()
                queue.delete(key)
              }
            })

            const {
              settings: {
                terrain: { chunk_generation },
              },
            } = get_state()
            const get_processing_task = key => {
              switch (chunk_generation) {
                case chunk_rendering_mode.HYBRID:
                  return ChunksProcessing.upperChunks(key)
                case chunk_rendering_mode.LOCAL:
                  return ChunksProcessing.fullChunks(key)
                case chunk_rendering_mode.LOCAL_SURFACE:
                  return ChunksProcessing.upperChunks(key)
                case chunk_rendering_mode.LOCAL_UNDERGROUND:
                  return ChunksProcessing.lowerChunks(key)
                case chunk_rendering_mode.REMOTE:
                  throw new Error(
                    'Remote chunks should not be generated locally',
                  )
              }
            }

            // Queue new columns to generate if they are not already in the queue
            columns_to_generate
              .filter(key => !queue.has(key))
              .forEach(key => {
                const processing_task = get_processing_task(key)

                queue.set(key, processing_task)

                processing_task.processingParams.skipBlobCompression = true
                processing_task
                  .delegate(chunks_processing_worker_pool)
                  .then(async chunks => {
                    // Ensure we have 6 chunks (y from 0 to 320 in 64-unit increments) by filling with empty chunks if needed
                    const final_chunks = Array.from({ length: 6 }, (_, i) => {
                      // Parse key to get x and z (format: "x:z")
                      const [x, z] = key.split(':').map(Number)
                      const existing_chunk = chunks.find(
                        ({ metadata: { chunkKey } }) =>
                          chunkKey === `chunk_${x}_${i}_${z}`,
                      )
                      return (
                        existing_chunk ||
                        create_empty_chunk_from_array({
                          ref_metadata: chunks[0].metadata,
                          chunk_index: i,
                          x,
                          z,
                        })
                      )
                    })

                    final_chunks.forEach(chunk => render_world_chunk(chunk))
                    // After processing, we can save the compressed column
                    const compressed_column =
                      await compress_chunk_column(final_chunks)
                    // During this time we might have received a server packet, so let's check
                    if (!COMPRESSED_CHUNK_CACHE.has(key))
                      COMPRESSED_CHUNK_CACHE.set(key, compressed_column)
                  })
                  .catch(error => {
                    console.error('Error in chunk generation', error)
                  })
                  .finally(() => {
                    queue.delete(key)
                    events.emit('CHUNKS_GENERATING', queue.size)
                  })
              })
          },
          async decompress_and_show_column(compressed_column) {
            const chunks = await decompress_chunk_column(compressed_column)
            chunks.forEach(chunk => render_world_chunk(chunk))
          },
        }
      }

      const { schedule_chunks_generation, decompress_and_show_column } =
        chunk_processor()

      // Handling of visibility
      aiter(abortable(setInterval(1000, null)))
        .reduce(async last_columns_ids => {
          const state = get_state()
          const character = current_three_character(state)

          if (!character) return last_columns_ids

          const chunk_position = to_chunk_position(character.position)

          // Positions of chunk columns which the player should currently see
          const current_columns_positions = spiral_array(
            chunk_position,
            0,
            state.settings.terrain.view_distance,
          )

          // Positions of chunk columns which are tracked by the server (nearby)
          const current_nearby_columns_positions = spiral_array(
            chunk_position,
            0,
            SERVER_MAX_CHUNK_DISTANCE + 1,
          )

          // Positions which the player saw in the last update but not anymore
          const columns_positions_to_remove = last_columns_ids.filter(
            exclude_positions(current_columns_positions),
          )

          // Positions which the player didn't see in the last update but now does
          const columns_positions_to_add = current_columns_positions.filter(
            exclude_positions(last_columns_ids),
          )

          const view_changed =
            columns_positions_to_add.length ||
            columns_positions_to_remove.length

          // no update needed
          if (
            !columns_positions_to_remove.length &&
            !columns_positions_to_add.length
          )
            return current_columns_positions

          columns_positions_to_remove.forEach(position => {
            voxelmap_viewer.invalidateChunk(position)
          })

          let missing_chunks_from_server = false

          const [
            // Positions which should be seen but are unknown to the cache
            columns_to_generate,
            // Positions which should be seen and are known to the cache
            columns_to_add,
          ] = await Promise.all(
            columns_positions_to_add.reduce(
              ([to_generate, to_add], { x, z }) => {
                const id = `${x}:${z}`
                const column = COMPRESSED_CHUNK_CACHE.get(id)
                const is_hybrid_mode =
                  state.settings.terrain.chunk_generation ===
                  chunk_rendering_mode.HYBRID
                const is_remote_mode =
                  state.settings.terrain.chunk_generation ===
                  chunk_rendering_mode.REMOTE
                const column_is_nearby = current_nearby_columns_positions.find(
                  column => column.x === x && column.z === z,
                )

                // if the column is already in the cache, we can add it to the list of columns to re-use
                if (column) to_add.push(column)
                // if we use hybrid mode, we only generate the column if it was not received from the server
                // basically if it's more than SERVER_MAX_CHUNK_DISTANCE chunks away from the player
                else if (
                  column_is_nearby &&
                  (is_hybrid_mode || is_remote_mode)
                ) {
                  missing_chunks_from_server = true
                } else to_generate.push(id)

                // since we renders those chunks, they also need to be invalidated in case they previously existed
                column_to_chunk_ids({ x, z }).forEach(key =>
                  voxelmap_viewer.invalidateChunk(key),
                )

                return [to_generate, to_add]
              },
              [[], []],
            ),
          )

          await Promise.all(
            columns_to_add.map(decompress_and_show_column),
          ).catch(error => {
            console.error('Error in columns_to_add', error)
          })

          if (!is_chunk_mode(chunk_rendering_mode.REMOTE, state))
            schedule_chunks_generation({
              columns_to_generate,
              all_visible_columns: current_columns_positions,
            })

          if (view_changed) {
            voxelmap_viewer.setVisibility(
              current_columns_positions.flatMap(column_to_chunk_ids),
            )
            terrain_viewer.setLod(camera.position, 50, camera.far)
          }

          if (missing_chunks_from_server) return last_columns_ids
          return current_columns_positions
        }, [])
        .catch(error => {
          console.error('Error in terrain visibility update', error)
        })

      aiter(
        abortable(typed_on(events, 'FORCE_RENDER_CHUNKS', { signal })),
      ).forEach(chunks =>
        chunks.forEach(chunk =>
          render_world_chunk(chunk, { ignore_collision: true }),
        ),
      )

      events.once('STATE_UPDATED', () =>
        terrain_viewer.setLod(camera.position, 50, camera.far),
      )

      state_iterator().reduce(
        ({ last_lod, last_chunk_generation }, { settings: { terrain } }) => {
          const { use_lod, chunk_generation } = terrain

          if (use_lod !== last_lod)
            terrain_viewer.parameters.lod.enabled = use_lod

          // going from not using caverns to using them, will break the cache as half of the chunks are missing
          if (chunk_generation !== last_chunk_generation) {
            COMPRESSED_CHUNK_CACHE.forEach((_, key) => {
              // @ts-ignore
              const [x, z] = key.split(':').map(Number)
              column_to_chunk_ids({ x, z }).forEach(position =>
                voxelmap_viewer.invalidateChunk(position),
              )
            })
            COMPRESSED_CHUNK_CACHE.clear()

            if (
              chunk_generation === chunk_rendering_mode.REMOTE ||
              chunk_generation === chunk_rendering_mode.HYBRID
            )
              events.emit(
                'SYSTEM_MESSAGE',
                `The serveur won't resend chunks, please refresh the page to use the Remote/Hybrid only mode`,
              )
          }

          return { last_lod: use_lod, last_chunk_generation: chunk_generation }
        },
      )

      aiter(abortable(setInterval(200, null))).reduce(async () => {
        voxelmap_viewer.setAdaptativeQuality({
          distanceThreshold: 75,
          cameraPosition: camera.getWorldPosition(new Vector3()),
        })
      })
    },
  }
}
