import { on } from 'events'
import { setInterval } from 'timers/promises'

import {
  EComputationMethod,
  HeightmapViewer,
  TerrainViewer,
  VoxelmapViewer,
} from '@aresrpg/aresrpg-engine'
import { aiter } from 'iterator-helper'
import { Box2, Color, Vector2, Vector3 } from 'three'
import {
  ChunkFactory,
  DataContainer,
  GroundMap,
  WorldComputeProxy,
  WorldUtils,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable, typed_on } from '../utils/iterator.js'
import { blocks_colors } from '../utils/terrain/world_settings.js'
import {
  chunk_data_encoder,
  setup_board_container,
  to_engine_chunk_format,
} from '../utils/terrain/world_utils.js'
// global config
const BOARD_POC = true
const SHOW_LOD = false
const ON_THE_FLY_GEN = true // when disabled patches will be baked in advance
// settings
const altitude = { min: -1, max: 400 }

const world_worker = new Worker(
  new URL('../utils/terrain/world_compute_worker.js', import.meta.url),
  { type: 'module' },
)

const voxel_materials_list = Object.values(blocks_colors).map(col => ({
  color: new Color(col),
}))

let last_board_pos = new Vector3(10, 0, 10)
let last_board_bounds = new Box2()
let pending_task = false

const board_refresh_trigger = current_pos => {
  return (
    WorldUtils.asVect2(last_board_pos).distanceTo(
      WorldUtils.asVect2(current_pos),
    ) > 1
  )
}

/** @type {Type.Module} */
export default function () {
  // WORLD
  // Common settings
  const patch_size = { xz: 64, y: 64 }
  const min_patch_id_y = Math.floor(altitude.min / patch_size.y)
  const max_patch_id_y = Math.floor(altitude.max / patch_size.y)
  // Run world-compute module in dedicated worker
  WorldComputeProxy.instance.worker = world_worker
  // default chunk factory
  ChunkFactory.default.voxelDataEncoder = chunk_data_encoder
  ChunkFactory.default.setChunksGenRange(min_patch_id_y, max_patch_id_y)
  // ground patch container
  const ground_patches = new GroundMap()
  // ENGINE
  const map = {
    minAltitude: altitude.min,
    maxAltitude: altitude.max,
    voxelMaterialsList: voxel_materials_list,
    getLocalMapData: async (block_start, block_end) => {
      return null
    },
    async sampleHeightmap(coords) {
      console.log(`block batch compute size: ${coords.length}`)
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

  // CHUNKS RENDERING
  const update_chunks_visibility = () => {
    const chunks_ids = Object.keys(ground_patches.patchLookup)
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

  // BATTLE BOARD POC
  const render_board_container = async board_container => {
    const extended_bounds = last_board_bounds.union(board_container.bounds)
    // duplicate and override patches with content from board
    const overridden_patches = ground_patches
      .getOverlappingPatches(extended_bounds)
      .map(patch => patch.duplicate())
    for await (const patch of overridden_patches) {
      DataContainer.copySourceOverTargetContainer(board_container, patch)
      const entities_chunks = await WorldComputeProxy.instance.bakeEntities(
        patch.bounds,
      )
      // discard entities overlapping with the board
      const entities = entities_chunks.filter(
        entity_chunk =>
          !board_container.isOverlappingWithBoard(
            WorldUtils.asBox2(entity_chunk.entityData.bbox),
          ),
      )
      // rerender all patches overlapped by the board
      render_patch_chunks(patch, entities)
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
          if (!pending_task) {
            pending_task = true
            const current_pos = player_position.clone().floor()
            // BOARD REFRSH
            if (BOARD_POC && board_refresh_trigger(current_pos)) {
              const board_container = await setup_board_container(current_pos)
              // console.log(border_blocks)
              render_board_container(board_container)
              // remember bounds for later board removal
              last_board_bounds = board_container.bounds
              last_board_pos = current_pos
            }
            // PATCHES REFRESH
            // Query patches around player
            const view_center = WorldUtils.asVect2(current_pos)
            const view_radius = state.settings.view_distance
            const view_dims = new Vector2(
              view_radius,
              view_radius,
            ).multiplyScalar(2)
            const view_box = new Box2().setFromCenterAndSize(
              view_center,
              view_dims,
            )
            const has_changed = ground_patches.rebuildPatchIndex(view_box)
            if (has_changed) {
              const changes = await ground_patches.loadEmpty(ON_THE_FLY_GEN)
              update_chunks_visibility()
              // Bake world patches and sends chunks to engine
              for await (const patch of changes) {
                // request and bake all entities belonging to this patch
                const entities_chunks =
                  await WorldComputeProxy.instance.bakeEntities(patch.bounds)
                render_patch_chunks(patch, entities_chunks)
              }
            }
            pending_task = false
          }
        }
        terrain_viewer.setLod(camera.position, 50, camera.far)
      })
    },
  }
}
