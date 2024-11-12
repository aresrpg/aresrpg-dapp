import { setInterval } from 'timers/promises'

import {
  EComputationMethod,
  HeightmapViewer,
  TerrainViewer,
  VoxelmapViewer,
} from '@aresrpg/aresrpg-engine'
import { aiter } from 'iterator-helper'
import { Box2, Color, Vector2 } from 'three'
import {
  WorldComputeProxy,
  SchematicLoader,
  ItemsInventory,
  Biome,
  Heightmap,
  BoardContainer,
  ChunkContainer,
  WorldConf,
  WorldChunkIndexer,
} from '@aresrpg/aresrpg-world'
import { Biome } from '@aresrpg/aresrpg-world/biomes'
import * as WorldUtils from '@aresrpg/aresrpg-world/worldUtils'

import { current_three_character } from '../game/game.js'
import { abortable, typed_on } from '../utils/iterator.js'
import {
  build_board_chunk,
  chunk_data_encoder,
  highlight_board,
  to_engine_chunk_format,
} from '../utils/terrain/world_utils.js'
import { setup_world_modules } from '../utils/terrain/world_setup.js'
import { BLOCKS_COLOR_MAPPING } from '../utils/terrain/world_settings.js'

// NB: LOD should be set to STATIC to limit over-computations
// and remove graphical issues
const LOD_MODE = {
  DISABLED: 0,
  STATIC: 1,
  DYNAMIC: 2,
}

const FLAGS = {
  LOD_MODE: LOD_MODE.DISABLED,
  BOARD_POC: false, // POC toggle until board integration is finished
  OTF_GEN: true, // bake patch progressively
}
// settings
const altitude = { min: -1, max: 400 }

// primary world worker
const world_worker = new Worker(
  new URL('../utils/terrain/world_compute_worker.js', import.meta.url),
  { type: 'module' },
)

// secondary worker used for delegating LOD computations
// and avoid monopolizing primary world worker
const delegated_tasks_worker = new Worker(
  new URL('../utils/terrain/world_compute_worker.js', import.meta.url),
  { type: 'module' },
)

const voxel_materials_list = Object.values(BLOCKS_COLOR_MAPPING).map(col => ({
  color: new Color(col),
}))

const last_board = {
  pos: new Vector2(10, 10),
  bounds: new Box2(),
  handler: null,
}
let pending_task = false

const board_refresh_trigger = current_pos =>
  last_board.pos.distanceTo(current_pos) > 1

/** @type {Type.Module} */
export default function () {
  // WORLD
  // common settings
  const patch_size = { xz: 64, y: 64 }
  const min_patch_id_y = Math.floor(altitude.min / patch_size.y)
  const max_patch_id_y = Math.floor(altitude.max / patch_size.y)
  // run world-compute module in dedicated worker
  WorldComputeProxy.instance.worker = world_worker
  // alternative proxy to route to secondary worker
  const world_delegated_proxy = new WorldComputeProxy()
  world_delegated_proxy.worker = delegated_tasks_worker
  // common world setup
  setup_world_modules({
    heightmapInstance: Heightmap.instance,
    biomeInstance: Biome.instance,
    SchematicLoader,
    ItemsInventory,
    ChunkContainer,
  })
  // chunks related
  WorldConf.instance.chunkSettings.genRange.yMinId = min_patch_id_y
  WorldConf.instance.chunkSettings.genRange.yMaxId = max_patch_id_y
  ChunkContainer.defaultDataEncoder = chunk_data_encoder

  // patch containers
  const chunks_indexer = new WorldChunkIndexer()
  // const board_container = new BoardContainer(
  //   board_params.radius,
  //   board_params.thickness,
  // )
  // ENGINE
  const map = {
    minAltitude: altitude.min,
    maxAltitude: altitude.max,
    voxelMaterialsList: voxel_materials_list,
    async sampleHeightmap(coords) {
      FLAGS.LOD_MODE === LOD_MODE.DYNAMIC &&
        console.log(`block batch compute size: ${coords.length}`)
      const pos_batch = coords.map(({ x, z }) => new Vector2(x, z))
      const res = await world_delegated_proxy.computeBlocksBatch(pos_batch, {
        includeEntitiesBlocks: true,
      })
      const data = res.map(block => ({
        altitude: block.pos.y + 0.25,
        color: new Color(BLOCKS_COLOR_MAPPING[block.data.type]),
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
      voxelsChunkOrdering: 'zxy',
    },
  )
  const heightmap_viewer = new HeightmapViewer(map, {
    basePatchSize: voxelmap_viewer.chunkSize.xz,
    voxelRatio: 2,
    maxLevel: 5,
  })
  const terrain_viewer = new TerrainViewer(heightmap_viewer, voxelmap_viewer)
  terrain_viewer.parameters.lod.enabled = FLAGS.LOD_MODE > 0

  // chunks rendering
  const render_chunk = world_chunk => {
    const engine_chunk = to_engine_chunk_format(world_chunk)
    voxelmap_viewer.invalidatePatch(engine_chunk.id)
    voxelmap_viewer.doesPatchRequireVoxelsData(engine_chunk.id) &&
      voxelmap_viewer.enqueuePatch(engine_chunk.id, engine_chunk)
  }

  return {
    tick() {
      terrain_viewer.update()
    },
    observe({ camera, events, signal, scene, get_state, physics }) {
      // CHUNKS RENDERING
      const update_chunks_visibility = () => {
        const chunks_ids = Object.keys(ground_patches.patchLookup)
          .map(patch_key => WorldUtils.parsePatchKey(patch_key))
          .map(patch_id =>
            ChunkFactory.default.genChunksIdsFromPatchId(patch_id),
          )
          .flat()
        voxelmap_viewer.setVisibility(chunks_ids)
      }

      const render_chunk = world_chunk => {
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

      const render_patch_chunks = (patch, items) => {
        // assemble ground and entities to form world chunks
        const world_patch_chunks = ChunkFactory.instance.chunkifyPatch(
          patch,
          items,
        )
        // feed engine with chunks
        world_patch_chunks.forEach(world_chunk => render_chunk(world_chunk))
        // If not using on-the-fly gen, delay patch processing to prevents
        // too many chunks rendering at the same time (TODO)
        // setTimeout(() =>
        //   patch.toChunks().forEach(chunk => render_chunk(chunk)),
        // )
      }

      const transform_items_to_chunks = async overground_items => {
        const res = []
        for await (const [item_type, spawn_places] of Object.entries(
          overground_items,
        )) {
          for await (const spawn_origin of spawn_places) {
            const item_chunk = await ItemsInventory.getInstancedChunk(
              item_type,
              spawn_origin,
            )
            res.push(item_chunk)
          }
        }
        return res
      }

      // BATTLE BOARD POC
      const render_board_container = async board_container => {
        const extended_bounds = last_board.bounds.union(board_container.bounds)
        // duplicate and override patches with content from board
        const overridden_patches = ground_patches
          .getOverlappingPatches(extended_bounds)
          .map(patch => patch.duplicate())
        for await (const patch of overridden_patches) {
          PatchContainer.copySourceOverTargetContainer(board_container, patch)
          // request all entities belonging to this patch
          const overground_items =
            await WorldComputeProxy.instance.queryOvergroundItems(patch.bounds)
          // transform to chunk list
          const items_chunk_list =
            await transform_items_to_chunks(overground_items)
          // discard entities overlapping with the board
          const non_overlapping_chunks = items_chunk_list.filter(
            item_chunk =>
              !board_container.isOverlappingWithBoard(
                WorldUtils.asBox2(item_chunk.bounds),
              ),
          )
          // rerender all patches overlapped by the board
          render_patch_chunks(patch, non_overlapping_chunks)
        }
      }

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
          if (!pending_task) {
            pending_task = true
            const current_pos = player_position.clone().floor()
            // Query chunks around player position
            const view_center = WorldUtils.asVect2(current_pos)
            const view_radius = state.settings.view_distance
            const chunks_indexing_changes = chunks_indexer.reindexAroundPos(
              view_center,
              view_radius,
            )
            if (chunks_indexing_changes) {
              chunks_indexer.chunksLookup = chunks_indexing_changes
              const chunk_ids = chunks_indexer.populateChunkIndex()
              voxelmap_viewer.setVisibility(chunk_ids)
              // process ground surface chunks first
              const surface_chunks_otf_gen =
                await chunks_indexer.otfGroundSurfaceChunksGen()
              for await (const world_chunk of surface_chunks_otf_gen) {
                render_chunk(world_chunk)
              }
              // process undeground surface chunks after
              const undeground_chunks_otf_gen =
                await chunks_indexer.otfUndegroundChunksGen()
              for await (const world_chunk of undeground_chunks_otf_gen) {
                render_chunk(world_chunk)
              }
              terrain_viewer.setLod(camera.position, 50, camera.far)
            }
            // BOARD PATCHES
            // if (FLAGS.BOARD_POC && board_refresh_trigger(view_center)) {
            //   board_container.setupBoard(view_center)
            //   const board_content = await board_container.genBoardContent()
            //   const otf_gen = await board_container.otfGen()
            //   for await (const board_patch of otf_gen) {
            //     // process external board items chunks
            //     const items_chunks = []
            //     const items_otf_gen = board_patch.itemsChunksOtfGen()
            //     for await (const item_chunk of items_otf_gen) {
            //       items_chunks.push(item_chunk)
            //     }
            //     const board_chunks = ChunkUtils.getWorldChunksFromPatchId(
            //       board_patch.id,
            //     )
            //     // generate board chunks
            //     for await (const board_chunk of board_chunks) {
            //       for (const item_chunk of items_chunks) {
            //         ChunkContainer.copySourceToTarget(item_chunk, board_chunk)
            //       }
            //       build_board_chunk(board_patch, board_chunk)
            //       // send chunk for render
            //       render_chunk(board_chunk)
            //     }
            //   }
            //   const board_handler = highlight_board(board_content)
            //   if (last_board.handler?.container) {
            //     last_board.handler.dispose()
            //     scene.remove(last_board.handler.container)
            //   }
            //   if (board_handler) {
            //     last_board.handler = board_handler
            //     scene.add(board_handler.container)
            //   }
            //   // remember bounds for later board removal
            //   last_board.bounds = board_container.boardBounds
            //   last_board.pos = view_center
            // }
            pending_task = false
          }
        }
        FLAGS.LOD_MODE === LOD_MODE.DYNAMIC &&
          terrain_viewer.setLod(camera.position, 50, camera.far)
      })

      aiter(abortable(setInterval(200, null))).reduce(async () => {
        voxelmap_viewer.setAdaptativeQuality({
          distanceThreshold: 75,
          cameraPosition: camera.getWorldPosition(new Vector3()),
        })
      })
    },
  }
}
