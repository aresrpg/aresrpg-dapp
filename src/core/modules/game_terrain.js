import { on } from 'events'
import { setInterval } from 'timers/promises'

import {
  EComputationMethod,
  HeightmapViewer,
  TerrainViewer,
  VoxelmapViewer,
} from '@aresrpg/aresrpg-engine'
import { aiter } from 'iterator-helper'
import { Color, Vector3 } from 'three'
import {
  BoardContainer,
  ChunkFactory,
  WorldCacheContainer,
  WorldComputeApi,
  WorldUtils,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable, typed_on } from '../utils/iterator.js'
import { blocks_colors } from '../utils/terrain/world_settings.js'
import {
  chunk_data_encoder,
  get_patches_changes,
  to_engine_chunk_format,
} from '../utils/terrain/world_utils.js'

// global config
const SHOW_BOARD_POC = true
// const USE_LEGACY_PLATEAU = false
const SHOW_LOD = true
const ON_THE_FLY_GEN = true // when disabled patches will be baked in advance
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
let last_board_pos = new Vector3(10, 0, 10)

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
  // default chunk factory
  ChunkFactory.default.voxelDataEncoder = chunk_data_encoder
  ChunkFactory.default.setChunksGenRange(min_patch_id_y, max_patch_id_y)

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
        color: new Color(blocks_colors[block.data.type]),
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

  // Misc
  const render_chunk = world_chunk => {
    const engine_chunk = to_engine_chunk_format(world_chunk)
    voxelmap_viewer.invalidatePatch(engine_chunk.id)
    voxelmap_viewer.doesPatchRequireVoxelsData(engine_chunk.id) &&
      voxelmap_viewer.enqueuePatch(engine_chunk.id, engine_chunk)
  }

  // Battle board POC
  const render_board_container = pos => {
    const board_pos = pos.clone().floor()
    if (
      WorldUtils.asVect2(last_board_pos).distanceTo(
        WorldUtils.asVect2(board_pos),
      ) > 1
    ) {
      // remove previous board: render original version of patches
      board_container_ref
        ?.restoreOriginalPatches()
        .toChunks()
        .forEach(chunk => render_chunk(chunk))
      // make new board
      const board_container = new BoardContainer(board_pos, 32, 5)
      board_container.populateFromExisting(
        WorldCacheContainer.instance.availablePatches,
        true,
      )
      board_container.initBoard()
      // render board version of patches
      board_container.toChunks().forEach(chunk => render_chunk(chunk))
      // render_board_container(board_container_ref)
      // }
      board_container_ref = board_container
      last_board_pos = board_pos
    }
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
          if (!WorldCacheContainer.instance.pendingRefresh) {
            // Query patches around player
            const view_center = player_position.clone().floor()
            const view_radius = state.settings.view_distance
            const patches_changes = await get_patches_changes(
              view_center,
              view_radius,
              ON_THE_FLY_GEN,
            )
            if (patches_changes.length !== 0) {
              WorldCacheContainer.instance.pendingRefresh = true
              const chunks_ids = Object.keys(
                WorldCacheContainer.instance.patchLookup,
              )
                .map(patch_key => WorldUtils.parsePatchKey(patch_key))
                .map(patch_id =>
                  ChunkFactory.default.genChunksIdsFromPatchId(patch_id),
                )
                .flat()
              voxelmap_viewer.setVisibility(chunks_ids)
              // Bake world patches and feed engine with chunks
              for await (const patch of patches_changes) {
                patch.toChunks().forEach(chunk => render_chunk(chunk))
                // If not using on-the-fly gen, delay patch processing to prevents
                // too many chunks rendering at the same time (TODO)
                // setTimeout(() =>
                //   patch.toChunks().forEach(chunk => render_chunk(chunk)),
                // )
              }
              WorldCacheContainer.instance.pendingRefresh = false
            }
            SHOW_BOARD_POC && render_board_container(player_position)
          }
        }
        terrain_viewer.setLod(camera.position, 50, camera.far)
      })
    },
  }
}
