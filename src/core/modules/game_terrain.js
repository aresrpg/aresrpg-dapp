import { setInterval } from 'timers/promises'

import {
  EComputationMethod,
  HeightmapViewer,
  TerrainViewer,
  VoxelmapViewer,
} from '@aresrpg/aresrpg-engine'
import { aiter } from 'iterator-helper'
import { Color, Vector2 } from 'three'
import {
  WorldChunkIndexer,
  ChunksOTFGenerator,
  WorldComputeProxy,
  WorldUtils,
  WorldEnv,
  WorldDevSetup,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable, typed_on } from '../utils/iterator.js'
import {
  chunk_data_encoder,
  to_engine_chunk_format,
} from '../utils/terrain/world_utils.js'
import { BoardWrapper } from '../utils/terrain/board_wrapper.js'
import { world_shared_setup } from '../utils/terrain/world_setup.js'
import { BLOCKS_COLOR_MAPPING } from '../utils/terrain/world_settings.js'

// NB: LOD should be set to STATIC to limit over-computations and fix graphical issues
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
const blocks_color_mapping = {
  ...BLOCKS_COLOR_MAPPING,
  ...WorldDevSetup.BlocksColorMapping,
}
const altitude = { min: -1, max: 400 }

const voxel_materials_list = Object.values(blocks_color_mapping).map(col => ({
  color: new Color(col),
}))

/** @type {Type.Module} */
export default function () {
  // COMMON
  const patch_size = { xz: 64, y: 64 }
  const min_patch_id_y = Math.floor(altitude.min / patch_size.y)
  const max_patch_id_y = Math.floor(altitude.max / patch_size.y)

  // WORLD
  // setup main thread environement
  world_shared_setup()

  // chunks related
  WorldEnv.current.chunks.genRange.yMinId = min_patch_id_y
  WorldEnv.current.chunks.genRange.yMaxId = max_patch_id_y
  WorldEnv.current.chunks.dataEncoder = chunk_data_encoder

  // patch containers
  const chunks_indexer = new WorldChunkIndexer()
  const board_wrapper = new BoardWrapper()

  // ENGINE
  const map = {
    minAltitude: altitude.min,
    maxAltitude: altitude.max,
    voxelMaterialsList: voxel_materials_list,
    async sampleHeightmap(coords) {
      FLAGS.LOD_MODE === LOD_MODE.DYNAMIC &&
        console.log(`block batch compute size: ${coords.length}`)
      const pos_batch = coords.map(({ x, z }) => new Vector2(x, z))
      const res = await WorldComputeProxy.current.computeBlocksBatch(
        pos_batch,
        {
          includeEntitiesBlocks: true,
        },
      )
      const data = res.map(block => ({
        altitude: block.pos.y + 0.25,
        color: new Color(blocks_color_mapping[block.data.type]),
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

  return {
    tick() {
      terrain_viewer.update()
    },
    observe({ camera, events, signal, scene, get_state, physics }) {
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
        // check at least one world compute unit is available
        if (player_position && WorldComputeProxy.workerPool) {
          const current_pos = player_position.clone().floor()
          // Query chunks around player position
          const view_center = WorldUtils.asVect2(current_pos).floor()
          const view_radius = state.settings.view_distance
          const caves_gen_bounds = WorldUtils.getBoundsAroundPos(
            view_center,
            WorldEnv.current.cavesViewDist,
          )
          const added_patch_keys = chunks_indexer.reindexAroundPos(
            view_center,
            view_radius,
          )
          if (added_patch_keys.length > 0) {
            voxelmap_viewer.setVisibility(chunks_indexer.chunkIds)
            // TODO: prioritize patch keys near player
            for await (const patch_key of added_patch_keys) {
              const chunk_generator = new ChunksOTFGenerator(patch_key)
              await chunk_generator.init()
              // TODO: prioritize chunk keys near player
              const { emptyKeys, groundSurfaceKeys, undegroundKeys } =
                chunk_generator
              const chunks_keys = [
                ...emptyKeys,
                ...groundSurfaceKeys,
                ...undegroundKeys,
              ]
              await chunk_generator.chunksGen(chunks_keys, render_chunk)
            }
            // override chunks around player with board buffer
            // const board_chunks_otf_gen =
            terrain_viewer.setLod(camera.position, 50, camera.far)
          }
          // BOARD
          if (FLAGS.BOARD_POC) {
            const board_chunks = board_wrapper.update(current_pos)
            for await (const board_chunk of board_chunks) {
              render_chunk(board_chunk)
            }
            if (board_wrapper.handler?.container) {
              board_wrapper.handler.dispose()
              scene.remove(board_wrapper.handler.container)
              board_wrapper.highlight()
              scene.add(board_wrapper.handler.container)
            }
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
