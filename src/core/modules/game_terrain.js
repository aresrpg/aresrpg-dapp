import { on } from 'events'
import { setInterval } from 'timers/promises'

import {
  EComputationMethod,
  HeightmapViewer,
  TerrainViewer,
  VoxelmapViewer,
} from '@aresrpg/aresrpg-engine'
import { aiter } from 'iterator-helper'
import { Box2, Color, Vector3 } from 'three'
import {
  BoardContainer,
  ChunkFactory,
  DataContainer,
  WorldCacheContainer,
  WorldComputeProxy,
  WorldUtils,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable } from '../utils/iterator.js'
import { blocks_colors } from '../utils/terrain/world_settings.js'
import {
  chunk_data_encoder,
  get_patches_changes,
  to_engine_chunk_format,
} from '../utils/terrain/world_utils.js'

// global config
const BOARD_POC = true
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

let last_board_pos = new Vector3(10, 0, 10)
let prev_board_bounds = new Box2()
let pending_board_refresh = false
const is_pending_task = () => {
  if (pending_board_refresh) console.log(`pending board refresh: wait`)
  return pending_board_refresh || WorldCacheContainer.instance.pendingRefresh
}

const board_needs_refresh = current_pos => {
  return (
    WorldUtils.asVect2(last_board_pos).distanceTo(
      WorldUtils.asVect2(current_pos),
    ) > 1
  )
}

/** @type {Type.Module} */
export default function () {
  // Common settings
  const patch_size = { xz: 64, y: 64 }
  const min_patch_id_y = Math.floor(min_altitude / patch_size.y)
  const max_patch_id_y = Math.floor(max_altitude / patch_size.y)
  // World setup
  // Run world-compute module in dedicated worker
  WorldComputeProxy.instance.worker = world_worker
  WorldCacheContainer.instance.builtInCache = true
  // default chunk factory
  ChunkFactory.default.voxelDataEncoder = chunk_data_encoder
  ChunkFactory.default.setChunksGenRange(min_patch_id_y, max_patch_id_y)
  // ground map

  // Engine setup
  const map = {
    minAltitude: min_altitude,
    maxAltitude: max_altitude,
    voxelMaterialsList: voxel_materials_list,
    getLocalMapData: async (block_start, block_end) => {
      return null
    },
    async sampleHeightmap(coords) {
      const res = await WorldComputeProxy.instance.computeBlocksBatch(coords, {
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
  const update_chunks_visibility = () => {
    const chunks_ids = Object.keys(WorldCacheContainer.instance.patchLookup)
      .map(patch_key => WorldUtils.parsePatchKey(patch_key))
      .map(patch_id => ChunkFactory.default.genChunksIdsFromPatchId(patch_id))
      .flat()
    voxelmap_viewer.setVisibility(chunks_ids)
  }

  const render_chunk = world_chunk => {
    const engine_chunk = to_engine_chunk_format(world_chunk)
    voxelmap_viewer.invalidatePatch(engine_chunk.id)
    voxelmap_viewer.doesPatchRequireVoxelsData(engine_chunk.id) &&
      voxelmap_viewer.enqueuePatch(engine_chunk.id, engine_chunk)
  }

  const render_patch_chunks = (patch, entities_chunks = []) => {
    // assemble ground and entities to form world chunks
    const world_patch_chunks = ChunkFactory.defaultInstance.chunkify(
      patch,
      entities_chunks,
    )
    // feed engine with chunks
    world_patch_chunks.forEach(world_chunk => render_chunk(world_chunk))

    // If not using on-the-fly gen, delay patch processing to prevents
    // too many chunks rendering at the same time (TODO)
    // setTimeout(() =>
    //   patch.toChunks().forEach(chunk => render_chunk(chunk)),
    // )
  }

  // Battle board POC
  const request_render_board_container = async pos => {
    const current_pos = pos.clone().floor()
    if (board_needs_refresh(current_pos) && !is_pending_task()) {
      pending_board_refresh = true
      const board_params = {
        radius: 32,
        thickness: 4,
      }
      const board_container = new BoardContainer(
        current_pos,
        board_params,
        prev_board_bounds,
      )
      // if provided will call worker under the hood to retrieve data
      await board_container.retrieveBoardData()
      // uncomment following line to get board data
      // const board_output_data = board_container.exportBoardData()
      // console.log(board_output_data)
      // perform board local computations
      const board_output_bounds = board_container.overridingContainer.bounds
      const overlapping_patches =
        WorldCacheContainer.instance.getOverlappingPatches(board_output_bounds)

      for await (const patch of overlapping_patches) {
        DataContainer.copySourceOverTargetContainer(board_container, patch)
        const entities_chunks = await WorldComputeProxy.instance.bakeEntities(
          patch.bounds,
        )
        // discard overlapping entities
        const non_overlapping = entities_chunks.filter(
          entity_chunk =>
            !board_container.isOverlappingWithBoard(
              WorldUtils.asBox2(entity_chunk.entityData.bbox),
            ),
        )
        // rerender all patches overlapped by the board
        render_patch_chunks(patch, non_overlapping)
      }
      // remember bounds to ease board removal later
      prev_board_bounds = board_output_bounds
      last_board_pos = current_pos
      pending_board_refresh = false
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
          if (!is_pending_task()) {
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
              update_chunks_visibility()
              // Bake world patches and sends chunks to engine
              for await (const patch of patches_changes) {
                // request and bake all entities belonging to this patch
                const entities_chunks =
                  await WorldComputeProxy.instance.bakeEntities(patch.bounds)
                render_patch_chunks(patch, entities_chunks)
              }
              WorldCacheContainer.instance.pendingRefresh = false
            }
            BOARD_POC && request_render_board_container(player_position) // render_board_container(player_position)
          }
        }
        terrain_viewer.setLod(camera.position, 50, camera.far)
      })
    },
  }
}
