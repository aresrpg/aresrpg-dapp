import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Vector3 } from 'three'
import { Biome, ChunkContainer } from '@aresrpg/aresrpg-world'
import {
  decompress_chunk_column,
  spiral_array,
  to_chunk_position,
} from '@aresrpg/aresrpg-sdk/chunk'

import { current_three_character } from '../game/game.js'
import { abortable, state_iterator, typed_on } from '../utils/iterator.js'
import {
  format_chunk_data,
  init_chunks_polling_service,
} from '../utils/terrain/world_utils.js'
import { voxel_engine_setup } from '../utils/terrain/engine_setup.js'
import { FLAGS, LOD_MODE } from '../utils/terrain/setup.js'
import logger from '../../logger.js'
import { world_shared_env } from '../utils/terrain/world_setup.js'

// TODO: The server won't send twice the same chunk for a session, unless time has passed
// TODO: monitor this map to avoid killing the client's memory
// TODO: it should not be a lru because we don't want to loose chunks, unless we are able to regenerate them efficiently on the client
const COMPRESSED_CHUNK_CACHE = new Map()

Biome.instance.parseBiomesConfig(world_shared_env.rawSettings.biomes.rawConf)

function exclude_positions(positions) {
  return ({ x, y, z }) =>
    !positions.some(
      position => position.x === x && position.y === y && position.z === z,
    )
}

function column_to_chunk_ids({ x, z }) {
  return Array.from({ length: 6 }).map((_, y) => ({ x, y, z }))
}

/** @type {Type.Module} */
export default function () {
  const columns_to_render_queue = []

  // engine setup
  const { terrain_viewer, voxelmap_viewer } = voxel_engine_setup()

  let busy_rendering = false
  let supposed_visible_chunks = []

  return {
    tick(_, { physics }) {
      if (!busy_rendering) {
        const next_column = columns_to_render_queue.shift()
        if (next_column) {
          busy_rendering = true
          decompress_chunk_column(next_column)
            .then(
              decompressed_column => {
                decompressed_column
                  // @ts-ignore
                  .map(ChunkContainer.fromStub)
                  .filter(({ id }) =>
                    voxelmap_viewer.doesPatchRequireVoxelsData(id),
                  )
                  .forEach(chunk => {
                    const { id, voxels_chunk_data } = format_chunk_data(chunk, {
                      encode: true,
                    })
                    voxelmap_viewer.enqueuePatch(id, voxels_chunk_data)
                    // @ts-ignore
                    physics.voxelmap_collider.setChunk(id, voxels_chunk_data)
                    voxelmap_viewer.setVisibility(supposed_visible_chunks)
                  })
              },
              error => console.error(error),
            )
            .finally(() => (busy_rendering = false))
        }
      }

      terrain_viewer.update()
    },
    observe({ camera, events, signal, scene, get_state, physics }) {
      function render_world_chunk(
        chunk_data,
        {
          ignore_collision = false,
          skip_formatting = false,
          skip_encoding = false,
        } = {},
      ) {
        const engine_chunk = skip_formatting
          ? chunk_data
          : format_chunk_data(chunk_data, {
              encode: !skip_encoding,
            })

        // allow replacing exisiting chunks (needed for board)
        voxelmap_viewer.invalidatePatch(engine_chunk.id)

        if (voxelmap_viewer.doesPatchRequireVoxelsData(engine_chunk.id)) {
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

      const on_chunk_ready = chunk =>
        render_world_chunk(chunk, { skip_formatting: false })
      const { poll_chunks, get_visible_chunk_ids } =
        init_chunks_polling_service(on_chunk_ready)

      window.dispatchEvent(new Event('assets_loading'))
      // this notify the player_movement module that the terrain is ready

      scene.add(terrain_viewer.container)

      events.on('packet/chunk', async ({ key, column }) => {
        COMPRESSED_CHUNK_CACHE.set(key, column)
        if (COMPRESSED_CHUNK_CACHE.size > 300) {
          logger.WARNING(
            `Cached chunks from the servers are getting too big! (${COMPRESSED_CHUNK_CACHE.size})`,
          )
        }
      })

      // ? Handling of server chunks
      aiter(abortable(setInterval(1000, null))).reduce(
        async last_columns_ids => {
          const state = get_state()
          const character = current_three_character(state)

          if (
            !character ||
            character.id === 'default' ||
            !state.settings.terrain.chunk_streaming
          )
            return last_columns_ids

          const chunk_position = to_chunk_position(character.position)
          const current_columns_ids = spiral_array(chunk_position, 0, 4).filter(
            ({ x, z }) => COMPRESSED_CHUNK_CACHE.has(`${x}:${z}`),
          )

          // ? "chunk id" is just the position of the chunk
          const columns_to_remove = last_columns_ids.filter(
            exclude_positions(current_columns_ids),
          )

          const columns_to_add = current_columns_ids.filter(
            exclude_positions(last_columns_ids),
          )

          columns_to_remove.forEach(id => voxelmap_viewer.invalidatePatch(id))
          columns_to_add.forEach(id => {
            // since we renders those chunks, they also need to be invalidated in case they previously existed
            voxelmap_viewer.invalidatePatch(id)
            columns_to_render_queue.push(
              COMPRESSED_CHUNK_CACHE.get(`${id.x}:${id.z}`),
            )
          })

          supposed_visible_chunks = spiral_array(chunk_position, 0, 4).flatMap(
            column_to_chunk_ids,
          )

          return current_columns_ids
        },
        [],
      )

      // ? Handling of client chunks, the only difference is that when server chunks are enabled, the client view.near starts after the server view.far
      aiter(abortable(setInterval(1000, null))).forEach(async () => {
        const state = get_state()

        if (state.settings.terrain.chunk_streaming) return

        // Query chunks around player position
        const current_pos = current_three_character(state)
          ?.position?.clone()
          .floor()
        if (current_pos) {
          const { view_distance } = state.settings.terrain
          const scheduled_tasks = poll_chunks(current_pos, view_distance)
          if (scheduled_tasks) {
            voxelmap_viewer.setVisibility(get_visible_chunk_ids())
            scheduled_tasks.forEach(scheduled_task =>
              scheduled_task.then(task_chunks =>
                task_chunks.forEach(chunk =>
                  render_world_chunk(chunk, { skip_formatting: false }),
                ),
              ),
            )
            if (FLAGS.LOD_MODE === LOD_MODE.STATIC)
              terrain_viewer.setLod(camera.position, 50, camera.far)
          }
        }
        if (FLAGS.LOD_MODE === LOD_MODE.DYNAMIC)
          terrain_viewer.setLod(camera.position, 50, camera.far)
      })

      aiter(
        abortable(typed_on(events, 'FORCE_RENDER_CHUNKS', { signal })),
      ).forEach(chunks =>
        chunks.forEach(chunk =>
          render_world_chunk(chunk.toStub(), {
            ignore_collision: true,
            skip_encoding: true,
          }),
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
