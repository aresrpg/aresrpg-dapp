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

import { current_three_character } from '../game/game.js'
import { abortable, state_iterator, typed_on } from '../utils/iterator.js'
import { to_engine_chunk_format } from '../utils/terrain/world_utils.js'
import { create_voxel_engine } from '../game/voxel_engine.js'

// The server won't send twice the same chunk for a session, unless time has passed
// If the cache was too full, then local generation would be used to retrieve missing ones
const COMPRESSED_CHUNK_CACHE = new LRUCache({
  maxSize: 100 * 1024 * 1024, // 100mb limit
  // @ts-ignore - Use a rough estimation of the base64 size of a chunk
  sizeCalculation: item => Math.ceil(item.length * 0.75), // base64 size in bytes
})

// From 0 to top, there are 6 chunks stacked in a column
const CHUNKS_PER_COLUMN = 6

function exclude_positions(positions) {
  return ({ x, y, z }) =>
    !positions.some(
      position => position.x === x && position.y === y && position.z === z,
    )
}

function column_to_chunk_ids({ x, z }) {
  return Array.from({ length: CHUNKS_PER_COLUMN }).map((_, y) => ({ x, y, z }))
}

function column_to_surface_ids({ x, z }) {
  const surface = CHUNKS_PER_COLUMN / 2
  return Array.from({ length: surface }).map((_, y) => ({
    x,
    y: y + surface,
    z,
  }))
}

const chunks_processing_worker_pool = new WorkerPool()

chunks_processing_worker_pool.init(navigator.hardwareConcurrency)

await chunks_processing_worker_pool.loadWorldEnv(world_settings.rawSettings)

/** @type {Type.Module} */
export default function () {
  // engine setup
  const { terrain_viewer, voxelmap_viewer } = create_voxel_engine()

  return {
    observe({ camera, events, signal, scene, get_state, physics }) {
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

      events.on('packet/chunk', async ({ key, column }) =>
        COMPRESSED_CHUNK_CACHE.set(key, column),
      )

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

            const { use_caverns } = get_state().settings.terrain

            // queue new columns to generate if they are not already in the queue
            columns_to_generate
              .filter(key => !queue.has(key))
              .forEach(key => {
                const processing_task = use_caverns
                  ? ChunksProcessing.fullChunks(key)
                  : // this isn't used for the gameplay, it's mostly for map editors as it ignores the caverns
                    ChunksProcessing.upperChunks(key)

                queue.set(key, processing_task)

                processing_task.processingParams.skipBlobCompression = true
                processing_task
                  .delegate(chunks_processing_worker_pool)
                  .then(async chunks => {
                    chunks.forEach(chunk => render_world_chunk(chunk))
                    // after processing, we can save the compressed column
                    const compressed_column =
                      await compress_chunk_column(chunks)
                    COMPRESSED_CHUNK_CACHE.set(key, compressed_column)
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

          const missing_columns = current_columns_positions
            .map(column_position => {
              const chunks_positions = state.settings.terrain.use_caverns
                ? column_to_chunk_ids(column_position)
                : column_to_surface_ids(column_position)
              const missing = chunks_positions.some(position =>
                voxelmap_viewer.doesChunkRequireVoxelsData(position),
              )
              if (missing) return column_position
              return null
            })
            .filter(Boolean)

          // no update needed
          if (!columns_positions_to_remove.length && !missing_columns.length)
            return current_columns_positions

          columns_positions_to_remove.forEach(position => {
            voxelmap_viewer.invalidateChunk(position)
          })

          const [
            // Positions which should be seen but are unknown to the cache
            columns_to_generate,
            // Positions which should be seen and are known to the cache
            columns_to_add,
          ] = await Promise.all(
            missing_columns.reduce(
              ([to_generate, to_add], { x, z }) => {
                const id = `${x}:${z}`
                const column = COMPRESSED_CHUNK_CACHE.get(id)

                if (column) to_add.push(column)
                else to_generate.push(id)

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

          if (
            state.settings.terrain.use_local_generation ||
            character.id === 'default'
          )
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

      state_iterator().reduce(
        ({ last_lod, last_use_caverns }, { settings: { terrain } }) => {
          const { use_lod, use_caverns } = terrain

          if (use_lod !== last_lod)
            terrain_viewer.parameters.lod.enabled = use_lod

          // going from not using caverns to using them, will break the cache as half of the chunks are missing
          if (use_caverns !== last_use_caverns) COMPRESSED_CHUNK_CACHE.clear()

          return { last_lod: use_lod, last_use_caverns: use_caverns }
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
