import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Vector3 } from 'three'
import {
  ChunksProvider,
  BoardProvider,
  WorkerPool,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable, combine, typed_on } from '../utils/iterator.js'
import {
  get_view_settings,
  to_engine_chunk_format,
} from '../utils/terrain/world_utils.js'
import {
  world_shared_setup,
  WORLD_WORKER_COUNT,
  WORLD_WORKER_URL,
} from '../utils/terrain/world_setup.js'
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
  const chunks_processing_worker_pool = new WorkerPool(
    WORLD_WORKER_URL,
    WORLD_WORKER_COUNT,
  )
  // chunks batch processing
  const chunks_provider = new ChunksProvider(chunks_processing_worker_pool)
  // engine setup
  const { terrain_viewer, voxelmap_viewer } = voxel_engine_setup()

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

      const get_view_pos = () => {
        const state = get_state()
        return current_three_character(state)?.position?.clone().floor()
      }

      const get_view_dist = () => {
        const state = get_state()
        return state.settings.terrain.view_distance
      }

      const on_board_visible = async () => {
        if (!BoardProvider.instance) {
          const view_pos = get_view_pos()
          BoardProvider.createInstance(view_pos)
          const board = await BoardProvider.instance.genBoardContent()
          const modified_chunks =
            BoardProvider.instance.overrideOriginalChunksContent(board.chunk)
          for (const chunk of modified_chunks) {
            render_world_chunk(chunk)
          }
          const board_data = board.patch.toStub()
          board_data.elevation = BoardProvider.instance.boardElevation
          const board_handler = init_board_handler(board_data)
          highlight_board_edges(board_data, board_handler)
          highlight_board_start_pos(board_data, board_handler)
          board_wrapper.handler = board_handler
          scene.add(board_handler.container)
        }
      }

      const on_board_hidden = () => {
        if (BoardProvider.instance) {
          const original_chunks =
            BoardProvider.instance.restoreOriginalChunksContent()
          for (const chunk of original_chunks) {
            render_world_chunk(chunk)
          }
          BoardProvider.deleteInstance()
          if (board_wrapper.handler?.container) {
            const board_handler = board_wrapper.handler
            board_handler.dispose()
            scene.remove(board_handler.container)
            board_wrapper.handler = null
            board_wrapper.data = null
          }
        }
      }

      chunks_provider.onChunkProcessed = on_chunks_processed

      window.dispatchEvent(new Event('assets_loading'))
      // this notify the player_movement module that the terrain is ready

      scene.add(terrain_viewer.container)

      aiter(abortable(setInterval(1000, null))).reduce(async () => {
        const current_pos = get_view_pos()
        const view_dist = get_view_dist()
        if (current_pos) {
          // Query chunks around player position
          const view = get_view_settings(current_pos, view_dist)
          const view_changed = chunks_provider.viewChanged(
            view.center,
            view.near,
            view.far,
          )
          if (view_changed) {
            chunks_provider.rescheduleTasks(view.center, view.near, view.far)
            voxelmap_viewer.setVisibility(chunks_provider.chunkIds)
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

      aiter(abortable(typed_on(events, 'STATE_UPDATED', { signal }))).reduce(
        ({ previous_show_board }, { settings: { terrain } }) => {
          const { show_board, use_lod } = terrain
          const board_state_changed = terrain.show_board !== previous_show_board
          if (board_state_changed) {
            show_board ? on_board_visible() : on_board_hidden()
          }
          terrain_viewer.parameters.lod.enabled = use_lod

          return {
            previous_show_board: terrain.show_board,
          }
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
