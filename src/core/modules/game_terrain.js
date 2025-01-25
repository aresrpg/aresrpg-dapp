import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Vector3 } from 'three'
import { ChunksProvider, WorkerPool } from '@aresrpg/aresrpg-world'
import {
  decompress_chunk_column,
  spiral_array,
  to_chunk_position,
} from '@aresrpg/aresrpg-sdk/chunk'

import { current_three_character } from '../game/game.js'
import { abortable, state_iterator, typed_on } from '../utils/iterator.js'
import {
  get_view_settings,
  to_engine_chunk_format,
} from '../utils/terrain/world_utils.js'
import {
  world_shared_setup,
  WORLD_WORKER_COUNT,
  WORLD_WORKER_URL,
} from '../utils/terrain/world_setup.js'
import { voxel_engine_setup } from '../utils/terrain/engine_setup.js'

// TODO: The server won't send twice the same chunk for a session, unless time has passed
// TODO: monitor this map to avoid killing the client's memory
// TODO: it should not be a lru because we don't want to loose chunks, unless we are able to regenerate them efficiently on the client
const COMPRESSED_CHUNK_CACHE = new Map()

function chunk_is_different(chunk_position, last_chunk_position) {
  if (!last_chunk_position) return true
  return (
    chunk_position.x !== last_chunk_position.x ||
    chunk_position.y !== last_chunk_position.y ||
    chunk_position.z !== last_chunk_position.z
  )
}

/** @type {Type.Module} */
export default function () {
  // world setup (main thread environement)
  world_shared_setup()
  const chunks_processing_worker_pool = new WorkerPool(
    WORLD_WORKER_URL,
    WORLD_WORKER_COUNT,
  )
  // chunks batch processing
  const chunks_provider = new ChunksProvider(chunks_processing_worker_pool)
  // engine setup
  const { terrain_viewer, voxelmap_viewer } = voxel_engine_setup()

  return {
    tick() {
      terrain_viewer.update()
    },
    observe({ camera, events, signal, scene, get_state, physics }) {
      function render_world_chunk(
        world_chunk,
        { ignore_collision = false } = {},
      ) {
        const engine_chunk = to_engine_chunk_format(world_chunk)

        // make sure the chunk is not already rendered
        voxelmap_viewer.invalidatePatch(engine_chunk.id)

        if (voxelmap_viewer.doesPatchRequireVoxelsData(engine_chunk.id)) {
          console.log('rendering', engine_chunk.id, engine_chunk)
          voxelmap_viewer.enqueuePatch(
            engine_chunk.id,
            engine_chunk.voxels_chunk_data,
          )
        }

        if (!ignore_collision)
          physics.voxelmap_collider.setChunk(
            engine_chunk.id,
            // @ts-ignore
            engine_chunk.voxels_chunk_data,
          )
      }

      const on_chunks_processed = chunks => {
        chunks?.forEach(chunk => {
          render_world_chunk(chunk)
        })
      }

      chunks_provider.onChunkProcessed = on_chunks_processed

      window.dispatchEvent(new Event('assets_loading'))
      // this notify the player_movement module that the terrain is ready

      scene.add(terrain_viewer.container)

      events.on('packet/chunk', async ({ key, column }) => {
        COMPRESSED_CHUNK_CACHE.set(key, column)
      })

      aiter(abortable(setInterval(1000, null))).reduce(async last_chunk_pos => {
        const state = get_state()
        const character = current_three_character(state)

        if (!character || character.id === 'default') return last_chunk_pos

        const chunk_position = to_chunk_position(character.position)
        const view_dist = state.settings.terrain.view_distance

        if (
          !last_chunk_pos ||
          chunk_is_different(chunk_position, last_chunk_pos)
        ) {
          const chunks_to_load = spiral_array(chunk_position, 0, 2)

          console.log('chunks_to_load', chunks_to_load)
          const has_all_chunks = chunks_to_load.every(({ x, z }) =>
            COMPRESSED_CHUNK_CACHE.has(`${x}:${z}`),
          )

          if (!has_all_chunks) return last_chunk_pos

          const chunk_ids = []

          await Promise.all(
            chunks_to_load
              .map(({ x, z }) => COMPRESSED_CHUNK_CACHE.get(`${x}:${z}`))
              .map(async column => {
                const decompressed_column =
                  await decompress_chunk_column(column)

                decompressed_column
                  // @ts-ignore
                  .map(ChunkContainer.fromStub)
                  .forEach(chunk => {
                    chunk_ids.push(chunk.id)
                    render_world_chunk(chunk)
                  })
              }),
          )

          console.log('set visibility', chunk_ids)
          voxelmap_viewer.setVisibility(chunk_ids)
        }
        return chunk_position
      })

      aiter(
        abortable(typed_on(events, 'FORCE_RENDER_CHUNKS', { signal })),
      ).forEach(chunks =>
        chunks.forEach(chunk =>
          render_world_chunk(chunk, { ignore_collision: true }),
        ),
      )

      state_iterator().forEach(({ settings: { terrain } }) => {
        const { use_lod } = terrain
        terrain_viewer.parameters.lod.enabled = use_lod
      })

      aiter(abortable(setInterval(200, null))).reduce(async () => {
        voxelmap_viewer.setAdaptativeQuality({
          distanceThreshold: 75,
          cameraPosition: camera.getWorldPosition(new Vector3()),
        })
      })
    },
  }
}
