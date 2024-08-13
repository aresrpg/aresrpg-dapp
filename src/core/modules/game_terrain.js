import { on } from 'events'
import { setInterval } from 'timers/promises'

import {
  EComputationMethod,
  HeightmapViewer,
  TerrainViewer,
  VoxelmapViewer,
} from '@aresrpg/aresrpg-engine'
import { aiter } from 'iterator-helper'
import { Box3, Color, Vector3 } from 'three'
import {
  PatchContainer,
  CacheContainer,
  WorldComputeApi,
  WorldUtils,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable } from '../utils/iterator.js'
import { blocks_colors } from '../utils/terrain/world_settings.js'
import {
  convert_to_engine_chunk,
  make_board,
  make_legacy_board,
} from '../utils/terrain/world_utils.js'

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
let board_container_ref
let last_player_pos = new Vector3(0, 0, 0)

const use_legacy_plateau = false
/** @type {Type.Module} */
export default function () {
  // Run world-compute module in dedicated worker
  WorldComputeApi.worker = world_worker

  // Engine setup
  const map = {
    minAltitude: min_altitude,
    maxAltitude: max_altitude,
    voxelMaterialsList: voxel_materials_list,
    getLocalMapData: async (block_start, block_end) => {
      return null
    },
    async sampleHeightmap(coords) {
      const res = await CacheContainer.processBlocksBatch(coords)
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
  terrain_viewer.parameters.lod.enabled = false

  const chunk_render = chunk => {
    voxelmap_viewer.invalidatePatch(chunk.id)
    voxelmap_viewer.enqueuePatch(chunk.id, chunk)
  }

  const render_patch_container = board_container => {
    const board_chunks = board_container
      .toChunks(min_patch_id_y, max_patch_id_y)
      .map(chunk => convert_to_engine_chunk(chunk))
    board_chunks.forEach(chunk => chunk_render(chunk))
  }

  return {
    tick() {
      // Process previously enqueud patches needing chunk generation and rendering
      if (patch_render_queue.length > 0) {
        const patch_key = patch_render_queue.pop()
        const patch = CacheContainer.instance.patchLookup[patch_key]
        // build engine chunks from world patches
        const chunks = patch
          .toChunks(min_patch_id_y, max_patch_id_y)
          .map(chunk => convert_to_engine_chunk(chunk))
        // feed engine with chunks for rendering
        chunks
          .filter(chunk => voxelmap_viewer.doesPatchRequireVoxelsData(chunk.id))
          .forEach(chunk => chunk_render(chunk))
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
          // Specify area around player requiring patch generation
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
          // Query patches surrounding player and enqueue them for differred rendering
          CacheContainer.instance.refresh(cache_box).then(changes => {
            if (changes.count > 0) {
              console.log(
                `batch size: ${changes.batch.length} (total cache size ${CacheContainer.instance.count})`,
              )
              // cache_pow_radius < world_cache_pow_limit &&
              // cache_pow_radius++
              const chunks_ids = CacheContainer.instance.availablePatches
                .map(patch =>
                  WorldUtils.genChunkIds(
                    patch.coords,
                    min_patch_id_y,
                    max_patch_id_y,
                  ),
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
          // Board POC
          if (last_player_pos.distanceTo(player_position) > 2) {
            last_player_pos = player_position
            // remove previous board by restoring original terrain patches
            if (board_container_ref) {
              const original_patches_container = new PatchContainer(
                board_container_ref.bbox,
              )
              original_patches_container.populateFromExisting(
                CacheContainer.instance.availablePatches,
                true,
              )
              render_patch_container(original_patches_container)
              // unset board ref
              board_container_ref = null
            }
            // build and render updated battle board
            if (use_legacy_plateau) {
              make_legacy_board(player_position).then(board => {
                board_container_ref = board
                render_patch_container(board_container_ref)
              })
            } else {
              board_container_ref = make_board(player_position)
              render_patch_container(board_container_ref)
            }
          }
        }
        terrain_viewer.setLod(camera.position, 50, camera.far)
      })
    },
  }
}
