import { on } from 'events'
import { setInterval } from 'timers/promises'

import {
  EComputationMethod,
  HeightmapViewer,
  TerrainViewer,
  voxelmapDataPacking,
  VoxelmapViewer,
  // VoxelmapVisibilityComputer,
} from '@aresrpg/aresrpg-engine'
import { aiter } from 'iterator-helper'
import { Box3, Color, Vector3 } from 'three'
import {
  BlocksContainer,
  ChunkTools,
  WorldApi,
  WorldCache,
  WorldWorkerApi,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable } from '../utils/iterator.js'
import { blocks_colors } from '../utils/terrain/world_settings.js'

const world_worker = new Worker(
  new URL('../utils/terrain/world_compute_worker.js', import.meta.url),
  { type: 'module' },
)

const voxel_materials_list = Object.values(blocks_colors).map(col => ({
  color: new Color(col),
}))
const min_altitude = -1
const max_altitude = 400

const patch_render_queue = []
const cache_pow_radius = 1

/** @type {Type.Module} */
export default function () {
  // World setup
  const world_worker_api = new WorldWorkerApi(world_worker)
  WorldApi.usedApi = world_worker_api

  // Engine setup
  const map = {
    minAltitude: min_altitude,
    maxAltitude: max_altitude,
    voxelMaterialsList: voxel_materials_list,
    getLocalMapData: async (block_start, block_end) => {
      return null
    },
    async sampleHeightmap(coords) {
      const res = await WorldCache.processBlocksBatch(coords)
      const data = res.map(block => ({
        altitude: block.level + 0.25,
        color: new Color(blocks_colors[block.type]),
      }))
      return data
    },
  }

  const patch_size = { xz: 64, y: 64 }
  const min_patch_id_y = Math.floor(min_altitude / patch_size.y)
  const max_patch_id_y = Math.floor(max_altitude / patch_size.y)
  const voxelmap_viewer = new VoxelmapViewer(
    min_patch_id_y,
    max_patch_id_y,
    voxel_materials_list,
    {
      patchSize: patch_size,
      computationOptions: {
        method: EComputationMethod.CPU_MULTITHREADED,
        threadsCount: 4,
      },
    },
  )
  const heightmap_viewer = new HeightmapViewer(map, {
    basePatchSize: voxelmap_viewer.chunkSize.xz,
    voxelRatio: 2,
    maxLevel: 5,
  })
  const terrain_viewer = new TerrainViewer(heightmap_viewer, voxelmap_viewer)
  terrain_viewer.parameters.lod.enabled = true

  return {
    tick() {
      // process patch queue to generate render chunks
      if (patch_render_queue.length > 0) {
        const patch_key = patch_render_queue.pop()

        const patch = WorldCache.patchContainer.patchLookup[patch_key]
        const chunks_ids = ChunkTools.genChunkIds(
          patch,
          min_patch_id_y,
          max_patch_id_y,
        )
        const chunks = chunks_ids.map(chunk_id =>
          ChunkTools.makeChunk(patch, chunk_id),
        )
        chunks
          .filter(chunk => voxelmap_viewer.doesPatchRequireVoxelsData(chunk.id))
          .forEach(chunk => {
            chunk.data.forEach(
              (val, i) =>
                (chunk.data[i] = val
                  ? voxelmapDataPacking.encode(false, val)
                  : voxelmapDataPacking.encodeEmpty()),
            )
            voxelmap_viewer.enqueuePatch(chunk.id, chunk)
          })
        // }
      }
      terrain_viewer.update()
    },
    observe({ camera, events, signal, scene, get_state }) {
      window.dispatchEvent(new Event('assets_loading'))
      // this notify the player_movement module that the terrain is ready
      events.emit('CHUNKS_LOADED')

      scene.add(terrain_viewer.container)

      aiter(abortable(on(events, 'STATE_UPDATED', { signal }))).reduce(
        async (
          { last_view_distance, last_far_view_distance },
          [
            {
              settings: { view_distance, far_view_distance },
            },
          ],
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
          // compute viewed area around player to know which patch are required
          const cache_radius = state.settings.view_distance
          const cache_dims = new Vector3(
            cache_radius,
            cache_radius,
            cache_radius,
          ).multiplyScalar(2)
          const cache_box = new Box3().setFromCenterAndSize(
            player_position,
            cache_dims,
          )
          // query patches belonging to visible area and enqueue them for render
          WorldCache.refresh(cache_box).then(changes => {
            if (changes.count > 0) {
              console.log(
                `batch size: ${changes.batch.length} (total cache size ${WorldCache.patchContainer.count})`,
              )
              // cache_pow_radius < world_cache_pow_limit &&
              // cache_pow_radius++
              const chunks_ids = WorldCache.patchContainer.availablePatches
                .map(patch =>
                  ChunkTools.genChunkIds(patch, min_patch_id_y, max_patch_id_y),
                )
                .flat()
              // declare them as visible, hide the others
              voxelmap_viewer.setVisibility(chunks_ids)
              // add patch keys requiring chunks generation
              changes.batch.forEach(patch_key =>
                patch_render_queue.push(patch_key),
              )
            }
          })
          // // compute all patches that need to be visible and prioritize them
          // voxelmap_visibility_computer.reset()
          // voxelmap_visibility_computer.showMapAroundPosition(
          //   player_position,
          //   state.settings.view_distance,
          //   context.frustum,
          // )
          // const requested_patches_ids_list = voxelmap_visibility_computer
          //   .getRequestedPatches()
          //   .map(requested_patch => requested_patch.id)

          // // declare them as visible, hide the others
          // voxelmap_viewer.setVisibility(requested_patches_ids_list)
        }
        terrain_viewer.setLod(camera.position, 50, camera.far)
      })
    },
  }
}
