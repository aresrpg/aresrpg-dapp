import { on } from 'events'
import { setInterval } from 'timers/promises'

import {
  EComputationMethod,
  HeightmapViewer,
  TerrainViewer,
  voxelmapDataPacking,
  VoxelmapViewer,
} from '@aresrpg/aresrpg-engine'
import { aiter } from 'iterator-helper'
import { Box3, Color, Vector3 } from 'three'
import {
  BlocksContainer,
  BoardContainer,
  ChunkTools,
  PlateauLegacy,
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
let board_container_ref
let last_player_pos = new Vector3(0, 0, 0)

const use_legacy_plateau = true
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
  terrain_viewer.parameters.lod.enabled = false

  const render_patch_container = patch_container => {
    patch_container.availablePatches.forEach(board_patch => {
      const chunks_ids = ChunkTools.genChunkIds(
        board_patch,
        min_patch_id_y,
        max_patch_id_y,
      )
      const board_chunks = chunks_ids.map(chunk_id =>
        ChunkTools.makeChunk(board_patch, chunk_id),
      )
      board_chunks.forEach(chunk => {
        chunk.data.forEach(
          (val, i) =>
            (chunk.data[i] = val
              ? voxelmapDataPacking.encode(false, val)
              : voxelmapDataPacking.encodeEmpty()),
        )
        voxelmap_viewer.invalidatePatch(chunk.id)
        voxelmap_viewer.enqueuePatch(chunk.id, chunk)
      })
    })
  }

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
          // Board POC
          if (last_player_pos.distanceTo(player_position) > 2) {
            last_player_pos = player_position
            // restore previous patches content
            if (board_container_ref) {
              const board_original_patches = new BoardContainer(
                board_container_ref.bbox,
              )
              board_original_patches.fillFromPatches(
                WorldCache.patchContainer.availablePatches,
                true,
              )
              render_patch_container(board_original_patches)
              board_container_ref = null
            }
            if (use_legacy_plateau) {
              PlateauLegacy.computePlateau(player_position).then(board => {
                console.log(board)
                const board_dims = new Vector3(board.size.x, 0, board.size.z)
                const board_end = board.origin.clone().add(board_dims)
                const board_box = new Box3(board.origin, board_end)
                // prepare board
                const board_blocks_container = new BlocksContainer(board_box, 0)
                const size = Math.sqrt(board.squares.length)
                const { min, max } = board_blocks_container.bbox
                board.squares.forEach((v, i) => {
                  const z = Math.floor(i / size)
                  const x = i % size
                  const index = z + size * x
                  const block_level = v.floorY || 0
                  const block_type = v.materialId
                  board_blocks_container.groundBlocks.level[index] = block_level
                  board_blocks_container.groundBlocks.type[index] = block_type
                  min.y = block_level > 0 ? Math.min(min.y, block_level) : min.y
                  max.y = Math.max(max.y, block_level)
                })
                const y_diff = max.y - min.y
                min.y += Math.round(y_diff / 2)
                // create container covering board area filled with patches from cache

                board_container_ref = new BoardContainer(board_box)
                board_container_ref.fillFromPatches(
                  WorldCache.patchContainer.availablePatches,
                  true,
                )
                // merge with board blocks
                board_container_ref.mergeBoardBlocks(board_blocks_container)
                board_container_ref &&
                  render_patch_container(board_container_ref)
              })
            } else {
              const board_radius = Math.pow(2, 5)
              const board_dims = new Vector3(
                board_radius,
                board_radius,
                board_radius,
              )
              const board_box = new Box3().setFromCenterAndSize(
                player_position,
                board_dims,
              )
              board_container_ref = new BoardContainer(board_box)
              board_container_ref.fillFromPatches(
                WorldCache.patchContainer.availablePatches,
                true,
              )
              let min = board_container_ref.bbox.max.y
              let max = board_container_ref.bbox.min.y
              board_container_ref.availablePatches.forEach(patch => {
                const blocks = patch.iterOverBlocks(board_box)
                for (const block of blocks) {
                  const block_level = block.pos.y
                  min = Math.min(block_level, min)
                  max = Math.max(block_level, max)
                }
              })
              const avg = Math.round(min + (max - min) / 2)
              board_container_ref.availablePatches.forEach(patch => {
                const blocks = patch.iterOverBlocks(board_box)
                for (const block of blocks) {
                  patch.writeBlockAtIndex(block.index, avg, block.type)
                }
              })
              // merge with board blocks
              // board_container_ref.mergeBoardBlocks(board_blocks_container)
              board_container_ref && render_patch_container(board_container_ref)
            }
          }
        }
        terrain_viewer.setLod(camera.position, 50, camera.far)
      })
    },
  }
}
