import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Vector3 } from 'three'
import {
  WorldUtils,
  WorldEnv,
  ProcessingTask,
  LowerChunksBatch,
  UpperChunksBatch,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable, combine, typed_on } from '../utils/iterator.js'
import { to_engine_chunk_format } from '../utils/terrain/world_utils.js'
import { world_shared_setup } from '../utils/terrain/world_setup.js'
import { FLAGS, LOD_MODE } from '../utils/terrain/setup.js'
import { voxel_engine_setup } from '../utils/terrain/engine_setup.js'

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
          const view_center = WorldUtils.convert.asVect2(current_pos).floor()
          const view_far = state.settings.view_distance
          const view_near = WorldEnv.current.nearViewDist
          if (upper_chunks_batch.isSyncNeeded(view_center, view_far)) {
            lower_chunks_batch.syncView(view_center, view_near)
            upper_chunks_batch.syncView(view_center, view_far)
            voxelmap_viewer.setVisibility(upper_chunks_batch.chunkIds)
          }
          // Board
        }
        FLAGS.LOD_MODE === LOD_MODE.DYNAMIC &&
          terrain_viewer.setLod(camera.position, 50, camera.far)
      })

      aiter(
        abortable(typed_on(events, 'FORCE_RENDER_CHUNKS', { signal })),
      ).forEach(chunks => chunks.forEach(render_world_chunk))

      aiter(abortable(setInterval(200, null))).reduce(async () => {
        voxelmap_viewer.setAdaptativeQuality({
          distanceThreshold: 75,
          cameraPosition: camera.getWorldPosition(new Vector3()),
        })
      })
    },
  }
}
