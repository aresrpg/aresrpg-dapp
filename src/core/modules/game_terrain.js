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
  ChunkFactory,
  PatchContainer,
  WorldCacheContainer,
  WorldComputeApi,
  WorldConfig,
  WorldUtils,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable } from '../utils/iterator.js'
import { blocks_colors } from '../utils/terrain/world_settings.js'
import {
  chunk_data_encoder,
  make_board,
  make_legacy_board,
  to_engine_chunk_format,
} from '../utils/terrain/world_utils.js'

// global config
const SHOW_BOARD_POC = false
const USE_LEGACY_PLATEAU = false
const SHOW_LOD = true
// settings
const min_altitude = -1
const max_altitude = 400

const world_worker = new Worker(
  new URL('../utils/terrain/world_compute_worker.js', import.meta.url),
  { type: 'module' },
)

const voxel_materials_list = Object.values(blocks_colors).map(col => ({
  color: new Color(col),
}))

let board_container_ref
let last_player_pos = new Vector3(0, 0, 0)

/** @type {Type.Module} */
export default function () {
  // Common settings
  const patch_size = { xz: 64, y: 64 }
  const min_patch_id_y = Math.floor(min_altitude / patch_size.y)
  const max_patch_id_y = Math.floor(max_altitude / patch_size.y)
  // World setup
  // Run world-compute module in dedicated worker
  WorldComputeApi.useWorker(world_worker)
  WorldCacheContainer.instance.builtInCache = true
  ChunkFactory.instance.chunkDataEncoder = chunk_data_encoder
  ChunkFactory.instance.setChunksGenRange(min_patch_id_y, max_patch_id_y)

  // Engine setup
  const map = {
    minAltitude: min_altitude,
    maxAltitude: max_altitude,
    voxelMaterialsList: voxel_materials_list,
    getLocalMapData: async (block_start, block_end) => {
      return null
    },
    async sampleHeightmap(coords) {
      const res = await WorldComputeApi.instance.computeBlocksBatch(coords, {
        includeEntitiesBlocks: true,
      })
      const data = res.map(block => ({
        altitude: block.pos.y + 0.25,
        color: new Color(blocks_colors[block.type]),
      }))
      return data
    },
  }

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
  terrain_viewer.parameters.lod.enabled = SHOW_LOD

  const chunk_render = world_chunk => {
    const engine_chunk = to_engine_chunk_format(world_chunk)
    voxelmap_viewer.invalidatePatch(engine_chunk.id)
    voxelmap_viewer.doesPatchRequireVoxelsData(engine_chunk.id) &&
      voxelmap_viewer.enqueuePatch(engine_chunk.id, engine_chunk)
  }

  const render_patch_container = board_container => {
    const board_chunks = board_container.toChunks()
    board_chunks.forEach(chunk => chunk_render(chunk))
  }

  return {
    tick() {
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
          const view_center = player_position.clone().floor()
          const view_radius = state.settings.view_distance
          const view_dims = new Vector3(
            view_radius,
            view_radius,
            view_radius,
          ).multiplyScalar(2)
          const view_box = new Box3().setFromCenterAndSize(
            view_center,
            view_dims,
          )
          const is_visible_patch = patch_bbox =>
            WorldUtils.asVect2(patch_bbox.getCenter(new Vector3())).distanceTo(
              WorldUtils.asVect2(view_center),
            ) <= view_radius
          // Query patches surrounding player
          !WorldCacheContainer.instance.pendingRefresh &&
            WorldCacheContainer.instance
              .refresh(view_box, is_visible_patch)
              .then(async changes_diff => {
                const changes_count = Object.keys(changes_diff).length
                if (changes_count > 0) {
                  // prevent other refresh while pending refresh
                  WorldCacheContainer.instance.pendingRefresh = true
                  const update_batch = Object.keys(changes_diff).filter(
                    key => changes_diff[key],
                  )
                  console.log(
                    `batch size: ${update_batch.length} (total cache size ${WorldCacheContainer.instance.count})`,
                  )
                  const chunks_ids = Object.keys(
                    WorldCacheContainer.instance.patchLookup,
                  )
                    .map(patch_key => WorldUtils.parsePatchKey(patch_key))
                    .map(patch_id =>
                      ChunkFactory.instance.genChunksIdsFromPatchId(patch_id),
                    )
                    .flat()
                  voxelmap_viewer.setVisibility(chunks_ids)
                  // this.pendingRefresh = true
                  // retrieve patches from cache or compute them
                  const visible_patches = WorldComputeApi.instance.builtInCache
                    ? WorldComputeApi.instance.availablePatches
                    : WorldComputeApi.instance.iterPatchCompute(update_batch)
                  // for each patch, generate chunks and render
                  for await (const patch of visible_patches) {
                    // build engine chunks from world patch and send to engine for rendering
                    patch.toChunks().forEach(chunk => chunk_render(chunk))
                  }
                  WorldCacheContainer.instance.pendingRefresh = false
                }
              })
          // Board POC
          if (
            SHOW_BOARD_POC &&
            last_player_pos.distanceTo(player_position) > 2
          ) {
            last_player_pos = player_position
            // remove previous board by restoring original terrain patches
            if (board_container_ref) {
              const original_patches_container = new PatchContainer(
                board_container_ref.bbox,
              )
              original_patches_container.populateFromExisting(
                WorldCacheContainer.instance.availablePatches,
                true,
              )
              render_patch_container(original_patches_container)
              // unset board ref
              board_container_ref = null
            }
            // build and render updated battle board
            if (USE_LEGACY_PLATEAU) {
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
