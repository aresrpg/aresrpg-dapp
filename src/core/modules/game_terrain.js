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
  BlocksContainer,
  BoardContainer,
  CacheContainer,
  PatchContainer,
  PlateauLegacy,
  WorldComputeApi,
  WorldUtils,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable, typed_on } from '../utils/iterator.js'
import { blocks_colors } from '../utils/terrain/world_settings.js'
import { convert_to_engine_chunk } from '../utils/terrain/world_utils.js'

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
let board_ref
let last_player_pos = new Vector3(0, 0, 0)

const use_legacy_plateau = false
/** @type {Type.Module} */
export default function () {
  // World setup
  // use world compute worker version
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

  return {
    tick() {
      // process patch queue to generate and render corresponding chunks
      if (patch_render_queue.length > 0) {
        const patch_key = patch_render_queue.pop()
        const patch = CacheContainer.instance.patchLookup[patch_key]
        // build engine chunk out of patch
        const chunks = patch
          .toChunks(min_patch_id_y, max_patch_id_y)
          .map(chunk => convert_to_engine_chunk(chunk))
        // send chunks to engine for rendering
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
            // restore previous patches content
            if (board_ref) {
              const original_patches_container = new PatchContainer(
                board_ref.bbox,
              )
              original_patches_container.populateFromExisting(
                CacheContainer.instance.availablePatches,
                true,
              )
              const original_chunks = original_patches_container
                .toChunks(min_patch_id_y, max_patch_id_y)
                .map(chunk => convert_to_engine_chunk(chunk))
              original_chunks.forEach(chunk => chunk_render(chunk))
              // unset board ref
              board_ref = null
            }
            // compute board
            if (use_legacy_plateau) {
              PlateauLegacy.computePlateau(player_position).then(
                board_struct => {
                  const board_dims = new Vector3(
                    board_struct.size.x,
                    0,
                    board_struct.size.z,
                  )
                  const board_end = board_struct.origin.clone().add(board_dims)
                  const board_box = new Box3(board_struct.origin, board_end)
                  // prepare board
                  const board_blocks_container = new BlocksContainer(
                    board_box,
                    0,
                  )
                  const size = Math.sqrt(board_struct.squares.length)
                  const { min, max } = board_blocks_container.bbox
                  board_struct.squares.forEach((v, i) => {
                    const z = Math.floor(i / size)
                    const x = i % size
                    const index = z + size * x
                    const block_level = v.floorY || 0
                    const block_type = v.materialId
                    board_blocks_container.groundBlocks.level[index] =
                      block_level
                    board_blocks_container.groundBlocks.type[index] = block_type
                    min.y =
                      block_level > 0 ? Math.min(min.y, block_level) : min.y
                    max.y = Math.max(max.y, block_level)
                  })
                  const y_diff = max.y - min.y
                  min.y += Math.round(y_diff / 2)
                  // create container covering board area filled with patches from cache

                  board_ref = new BoardContainer(board_box)
                  board_ref.fillFromPatches(
                    CacheContainer.instance.availablePatches,
                    true,
                  )
                  // merge with board blocks
                  board_ref.mergeBoardBlocks(board_blocks_container)
                  // render board
                  const board_chunks = board_ref
                    .toChunks(min_patch_id_y, max_patch_id_y)
                    .map(chunk => convert_to_engine_chunk(chunk))
                  board_chunks.forEach(chunk => chunk_render(chunk))
                },
              )
            } else {
              board_ref = new BoardContainer(player_position, 48)
              board_ref.populateFromExisting(
                CacheContainer.instance.availablePatches,
                true,
              )
              board_ref.shapeBoard()
              // render board
              const board_chunks = board_ref
                .toChunks(min_patch_id_y, max_patch_id_y)
                .map(chunk => convert_to_engine_chunk(chunk))
              board_chunks.forEach(chunk => chunk_render(chunk))
            }
          }
        }
        terrain_viewer.setLod(camera.position, 50, camera.far)
      })
    },
  }
}
