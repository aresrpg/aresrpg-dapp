import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Vector3 } from 'three'
import {
  ProcessingTask,
  LowerChunksBatch,
  UpperChunksBatch,
  BoardContainer,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable, combine, typed_on } from '../utils/iterator.js'
import {
  get_view_settings,
  to_engine_chunk_format,
} from '../utils/terrain/world_utils.js'
import { world_shared_setup } from '../utils/terrain/world_setup.js'
import { FLAGS, LOD_MODE } from '../utils/terrain/setup.js'
import { voxel_engine_setup } from '../utils/terrain/engine_setup.js'
import {
  highlight_board_edges,
  highlight_board_start_pos,
  init_board_handler,
} from '../utils/terrain/board_helper.js'

/** @type {Type.Module} */
export default function () {
  // world setup (main thread environement)
  world_shared_setup()
  ProcessingTask.initWorkerPool()
  // engine setup
  const { terrain_viewer, voxelmap_viewer } = voxel_engine_setup()

  // chunks batch processing
  const lower_chunks_batch = new LowerChunksBatch()
  const upper_chunks_batch = new UpperChunksBatch()
  lower_chunks_batch.enqueue()
  upper_chunks_batch.enqueue()
  const board_wrapper = {
    handler: null,
    data: null,
  }

  return {
    tick() {
      terrain_viewer.update()
    },
    observe({ camera, events, signal, scene, get_state, physics }) {
      const render_world_chunk = world_chunk => {
        const engine_chunk = to_engine_chunk_format(world_chunk)
        voxelmap_viewer.invalidatePatch(engine_chunk.id)
        voxelmap_viewer.doesPatchRequireVoxelsData(engine_chunk.id) &&
          voxelmap_viewer.enqueuePatch(
            engine_chunk.id,
            engine_chunk.voxels_chunk_data,
          )
        physics.voxelmap_collider.setChunk(
          engine_chunk.id,
          engine_chunk.voxels_chunk_data,
        )
      }

      const on_chunks_processed = chunks =>
        chunks?.forEach(chunk => {
          render_world_chunk(chunk)
        })

      lower_chunks_batch.onTaskCompleted = on_chunks_processed
      upper_chunks_batch.onTaskCompleted = on_chunks_processed

      window.dispatchEvent(new Event('assets_loading'))
      // this notify the player_movement module that the terrain is ready

      scene.add(terrain_viewer.container)

      aiter(abortable(typed_on(events, 'STATE_UPDATED', { signal }))).reduce(
        async (
          { last_view_distance, last_far_view_distance },
          { settings: { view_distance, far_view_distance } },
        ) => {
          if (last_view_distance) {
            if (
              last_view_distance !== view_distance ||
              last_far_view_distance !== far_view_distance
            ) {
              // await reset_chunks(true)
            }
          }

          return {
            last_view_distance: view_distance,
            last_far_view_distance: far_view_distance,
          }
        },
      )

      aiter(abortable(setInterval(1000, null))).reduce(async () => {
        const state = get_state()
        const player_position =
          current_three_character(state)?.position?.clone()
        if (player_position) {
          const current_pos = player_position.clone().floor()
          // Query chunks around player position
          const view = get_view_settings(
            current_pos,
            state.settings.view_distance,
          )
          const view_changed = upper_chunks_batch.viewChanged(
            view.center,
            view.far,
          )
          if (view_changed) {
            lower_chunks_batch.syncView(view.center, view.near)
            upper_chunks_batch.syncView(view.center, view.far)
            voxelmap_viewer.setVisibility(upper_chunks_batch.chunkIds)
            // FLAGS.LOD_MODE === LOD_MODE.STATIC &&
            // terrain_viewer.setLod(camera.position, 50, camera.far)
          }
        }
        FLAGS.LOD_MODE === LOD_MODE.DYNAMIC &&
          terrain_viewer.setLod(camera.position, 50, camera.far)
      })

      aiter(
        abortable(typed_on(events, 'FORCE_RENDER_CHUNKS', { signal })),
      ).forEach(chunks => chunks.forEach(render_world_chunk))

      aiter(
        abortable(
          combine(
            typed_on(events, 'SPAWN_BOARD', { signal }),
            typed_on(events, 'REMOVE_BOARD', { signal }),
          ),
        ),
      ).forEach(async position => {
        // remove board if showed
        if (!position && BoardContainer.instance) {
          const original_chunks =
            BoardContainer.instance.restoreOriginalChunksContent()
          for (const chunk of original_chunks) {
            render_world_chunk(chunk)
          }
          BoardContainer.deleteInstance()
          if (board_wrapper.handler?.container) {
            const board_handler = board_wrapper.handler
            board_handler.dispose()
            scene.remove(board_handler.container)
            board_wrapper.handler = null
            board_wrapper.data = null
          }
        }
        // display board if not showed
        else if (!BoardContainer.instance) {
          BoardContainer.createInstance(position)
          const board = await BoardContainer.instance.genBoardContent()
          const modified_chunks =
            BoardContainer.instance.overrideOriginalChunksContent(board.chunk)
          for (const chunk of modified_chunks) {
            render_world_chunk(chunk)
          }
          const board_data = board.patch.toStub()
          board_data.elevation = BoardContainer.instance.boardElevation
          const board_handler = init_board_handler(board_data)
          highlight_board_edges(board_data, board_handler)
          highlight_board_start_pos(board_data, board_handler)
          board_wrapper.handler = board_handler
          scene.add(board_handler.container)
        }
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
