import { setInterval } from 'timers/promises'

import {
  compress_chunk_column,
  decompress_chunk_column,
  spiral_array,
  to_chunk_position,
} from '@aresrpg/aresrpg-sdk/chunk'
import { ChunksProcessing } from '@aresrpg/aresrpg-world'
import { aiter } from 'iterator-helper'
import { LRUCache } from 'lru-cache'
import { Vector3 } from 'three'

import { chunk_rendering_mode, current_three_character } from '../game/game.js'
import { abortable, state_iterator, typed_on } from '../utils/iterator.js'
import { to_engine_chunk_format } from '../utils/terrain/world_utils.js'
import { TERRAIN_WORKER_POOL } from '../worker/workers.js'

// The server won't send twice the same chunk for a session, unless time has passed
// If the cache was too full, then local generation would be used to retrieve missing ones
const COMPRESSED_CHUNK_CACHE = new LRUCache({
  maxSize: 100 * 1024 * 1024, // 100mb limit
  // @ts-ignore - Use a rough estimation of the base64 size of a chunk
  sizeCalculation: (item) => Math.ceil(item.length * 0.75), // base64 size in bytes
})

// From 0 to top, there are 6 chunks stacked in a column
const CHUNKS_PER_COLUMN = 6
const SERVER_MAX_CHUNK_DISTANCE = 2

function exclude_positions(positions) {
  return ({ x, y, z }) =>
    !positions.some(
      (position) => position.x === x && position.y === y && position.z === z
    )
}

function column_to_chunk_ids({ x, z }) {
  return Array.from({ length: CHUNKS_PER_COLUMN }).map((_, y) => ({ x, y, z }))
}

/** @type {Type.Module} */
export default function () {
  return {
    tick(state, { renderer, voxel_engine, camera }) {
      const { clutter_viewer, heightmap_atlas, terrain_viewer } = voxel_engine

      terrain_viewer.update(renderer)
      heightmap_atlas.update(renderer)

      const player = state.characters.find(
        (character) => character.id === state.selected_character_id
      )
      if (player) {
        clutter_viewer.update(camera, player.position)
      } else {
        clutter_viewer.update(camera)
      }
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
      const {
        voxelmap_viewer,
        heightmap_viewer,
        terrain_viewer,
        clutter_viewer,
      } = voxel_engine

      clutter_viewer.parameters.viewDistance = 150
      clutter_viewer.parameters.viewDistanceMargin = 25

      function render_world_chunk(
        world_chunk,
        { ignore_collision = false } = {}
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
        if (
          is_chunk_mode(chunk_rendering_mode.REMOTE) ||
          is_chunk_mode(chunk_rendering_mode.HYBRID)
        ) {
          const [x, z] = key.split(':').map(Number)
          // when receiving a server chunk, we invalidate the cache to make sure it will have priority
          // because it may contain data we don't have locally (underground, etc..)
          column_to_chunk_ids({ x, z }).forEach((position) =>
            voxelmap_viewer.invalidateChunk(position)
          )
          COMPRESSED_CHUNK_CACHE.set(key, column)
        }
      })

      function is_chunk_mode(mode, state = get_state()) {
        return state.settings.terrain.chunk_generation === mode
      }

      function chunk_processor() {
        const queue = new Map()
        const processing_options = {
          skipBlobCompression: true,
          fakeEmpty: true,
        }

        return {
          async schedule_chunks_generation({
            columns_to_generate = [],
            /** @type {string[]} */
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
            const get_processing_task = (key) => {
              switch (chunk_generation) {
                case chunk_rendering_mode.HYBRID:
                  return ChunksProcessing.upperChunks(key, processing_options)
                case chunk_rendering_mode.LOCAL:
                  return ChunksProcessing.fullChunks(key, processing_options)
                case chunk_rendering_mode.LOCAL_SURFACE:
                  return ChunksProcessing.upperChunks(key, processing_options)
                case chunk_rendering_mode.LOCAL_UNDERGROUND:
                  return ChunksProcessing.lowerChunks(key, processing_options)
                case chunk_rendering_mode.REMOTE:
                  throw new Error(
                    'Remote chunks should not be generated locally'
                  )
              }
            }

            TERRAIN_WORKER_POOL.processQueue()

            return Promise.all(
              columns_to_generate
                .filter((key) => !queue.has(key))
                .map((key) => {
                  const processing_task = get_processing_task(key)

                  queue.set(key, processing_task)

                  return processing_task
                    .delegate(TERRAIN_WORKER_POOL)
                    .then((chunks) => {
                      if (!chunks) return
                      chunks.forEach((chunk) => render_world_chunk(chunk))
                      return chunks
                    })
                    .then(async (chunks) => {
                      if (!chunks) return
                      const remapped_chunks = chunks.map((chunk) => ({
                        ...chunk,
                        rawdata: chunk.rawdata || [],
                      }))
                      // After processing, we can save the compressed column
                      const compressed_column =
                        await compress_chunk_column(remapped_chunks)
                      // During this time we might have received a server packet, so let's check
                      if (!COMPRESSED_CHUNK_CACHE.has(key))
                        COMPRESSED_CHUNK_CACHE.set(key, compressed_column)
                      queue.delete(key)
                    })
                    .catch((error) => {
                      console.error('Error in processing_task', error)
                    })
                    .finally(() => {
                      events.emit('CHUNKS_GENERATING', queue.size)
                    })
                })
            )
          },
          async decompress_and_show_column(compressed_column) {
            const chunks = await decompress_chunk_column(compressed_column)
            chunks.forEach((chunk) => render_world_chunk(chunk))
          },
        }
      }

      const { schedule_chunks_generation, decompress_and_show_column } =
        chunk_processor()

      // Handling of visibility
      aiter(abortable(setInterval(1000, null)))
        .reduce(async (last_columns_ids) => {
          const state = get_state()
          const character = current_three_character(state)

          if (!character) return last_columns_ids

          const chunk_position = to_chunk_position(character.position)

          // Positions of chunk columns which the player should currently see
          const current_columns_positions = spiral_array(
            chunk_position,
            0,
            state.settings.terrain.view_distance
          )

          // Positions of chunk columns which are tracked by the server (nearby)
          const current_nearby_columns_positions = spiral_array(
            chunk_position,
            0,
            SERVER_MAX_CHUNK_DISTANCE + 1
          )

          // Positions which the player saw in the last update but not anymore
          const columns_positions_to_remove = last_columns_ids.filter(
            exclude_positions(current_columns_positions)
          )

          // Positions which the player didn't see in the last update but now does
          const columns_positions_to_add = current_columns_positions.filter(
            exclude_positions(last_columns_ids)
          )

          const missing_chunks = current_columns_positions.filter(
            ({ x, z }) => {
              return column_to_chunk_ids({ x, z }).some(({ x, y, z }) =>
                voxelmap_viewer.doesChunkRequireVoxelsData({ x, y, z })
              )
            }
          )

          const view_changed =
            columns_positions_to_add.length ||
            columns_positions_to_remove.length

          columns_positions_to_remove.forEach((position) => {
            voxelmap_viewer.invalidateChunk(position)
          })

          // no update needed
          if (!view_changed && !missing_chunks.length)
            return current_columns_positions

          const { chunk_generation } = state.settings.terrain
          const should_generate_nearby_chunks =
            chunk_generation !== chunk_rendering_mode.HYBRID &&
            chunk_generation !== chunk_rendering_mode.REMOTE

          const [
            // Positions which should be seen but are unknown to the cache
            columns_to_generate,
            // Positions which should be seen and are known to the cache
            columns_to_add,
          ] = await Promise.all(
            missing_chunks.reduce(
              ([to_generate, to_add], { x, z }) => {
                const id = `${x}:${z}`
                const column = COMPRESSED_CHUNK_CACHE.get(id)
                const column_is_nearby = current_nearby_columns_positions.find(
                  (column) => column.x === x && column.z === z
                )
                const column_should_not_be_generated =
                  (column_is_nearby && !should_generate_nearby_chunks) ||
                  is_chunk_mode(chunk_rendering_mode.REMOTE, state)

                // if the column is already in the cache, we can add it to the list of columns to re-use
                if (column) to_add.push(column)
                // if we use hybrid mode, we only generate the column if it was not received from the server
                // basically if it's more than SERVER_MAX_CHUNK_DISTANCE chunks away from the player
                else if (!column_should_not_be_generated) to_generate.push(id)

                // since we renders those chunks, they also need to be invalidated in case they previously existed
                column_to_chunk_ids({ x, z }).forEach((key) =>
                  voxelmap_viewer.invalidateChunk(key)
                )

                return [to_generate, to_add]
              },
              [[], []]
            )
          )

          await Promise.all(
            columns_to_add.map(decompress_and_show_column)
          ).catch((error) => {
            console.error('Error in columns_to_add', error)
          })

          schedule_chunks_generation({
            columns_to_generate,
            all_visible_columns: current_columns_positions.map(
              ({ x, z }) => `${x}:${z}`
            ),
          }).catch((error) => {
            console.error('Error in schedule_chunks_generation', error)
          })

          if (view_changed) {
            voxelmap_viewer.setVisibility(
              current_columns_positions.flatMap(column_to_chunk_ids)
            )
            terrain_viewer.setLod(camera.position, 50, camera.far)
          }

          return current_columns_positions
        }, [])
        .catch((error) => {
          console.error('Error in terrain visibility update', error)
        })

      aiter(
        abortable(typed_on(events, 'FORCE_RENDER_CHUNKS', { signal }))
      ).forEach((chunks) =>
        chunks.forEach((chunk) =>
          render_world_chunk(chunk, { ignore_collision: true })
        )
      )

      events.once('STATE_UPDATED', () =>
        terrain_viewer.setLod(camera.position, 50, camera.far)
      )

      state_iterator().reduce(
        ({ last_lod, last_chunk_generation }, { settings: { terrain } }) => {
          const { use_lod, chunk_generation } = terrain

          if (use_lod !== last_lod) heightmap_viewer.enabled = use_lod

          // going from not using caverns to using them, will break the cache as half of the chunks are missing
          if (chunk_generation !== last_chunk_generation) {
            COMPRESSED_CHUNK_CACHE.forEach((_, key) => {
              // @ts-ignore
              const [x, z] = key.split(':').map(Number)
              column_to_chunk_ids({ x, z }).forEach((position) =>
                voxelmap_viewer.invalidateChunk(position)
              )
            })
            COMPRESSED_CHUNK_CACHE.clear()

            if (
              chunk_generation === chunk_rendering_mode.REMOTE ||
              chunk_generation === chunk_rendering_mode.HYBRID
            )
              events.emit(
                'SYSTEM_MESSAGE',
                `The serveur won't resend chunks, please refresh the page to use the Remote/Hybrid only mode`
              )
          }

          return { last_lod: use_lod, last_chunk_generation: chunk_generation }
        }
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
