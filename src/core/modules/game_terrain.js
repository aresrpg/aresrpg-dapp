import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Vector3 } from 'three'
import {
  WorldComputeProxy,
  WorldUtils,
  WorldEnv,
  ChunksIndexer,
} from '@aresrpg/aresrpg-world'

import { current_three_character } from '../game/game.js'
import { abortable, combine, typed_on } from '../utils/iterator.js'
import { to_engine_chunk_format } from '../utils/terrain/world_utils.js'
import { world_shared_setup } from '../utils/terrain/world_setup.js'
import { BLOCKS_COLOR_MAPPING } from '../utils/terrain/world_settings.js'

// NB: LOD should be set to STATIC to limit over-computations and fix graphical issues
const LOD_MODE = {
  DISABLED: 0,
  STATIC: 1,
  DYNAMIC: 2,
}
export function get_board_state() {
  return board_wrapper
}
export function update_started() {
  started = false
}
let started = false
let board_wrapper
const FLAGS = {
  LOD_MODE: LOD_MODE.DISABLED,
  BOARD_POC: true, // POC toggle until board integration is finished
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
  // world setup (main thread environement)
  world_shared_setup()
  // make sure worker pool is ready
  WorldComputeProxy.current.isReady()
  // engine setup
  const { terrain_viewer, voxelmap_viewer } = voxel_engine_setup()

  // patch containers
  const chunks_indexer = new ChunksIndexer()
  board_wrapper = new BoardWrapper()

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
        // @ts-ignore
        color: new Color(blocks_color_mapping[block.data.type]),
      }))
      return data
    },
  }

  const voxelmap_viewer = new VoxelmapViewer(
    chunks_range.bottomId,
    chunks_range.topId,
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
      const render_world_chunk = world_chunk => {
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
          const view_center = WorldUtils.convert.asVect2(current_pos).floor()
          const view_radius = state.settings.view_distance
          const new_patch_keys = chunks_indexer.getIndexingChanges(
            view_center,
            view_radius,
          )
          const index_has_changed = new_patch_keys.length > 0
          if (index_has_changed) {
            // instanciate chunkset for each new patches
            chunks_indexer.indexElements(new_patch_keys)
            voxelmap_viewer.setVisibility(chunks_indexer.chunkIds())
            // first process undeground chunks near player
            // then process far chunks at ground surface
            const batch = chunks_indexer.indexedElements
            const priority_batch = batch.filter(
              chunkset =>
                chunkset.distanceTo(view_center) <=
                WorldEnv.current.nearViewDist,
            )
            const pending_batch = priority_batch.map(
              async chunkset =>
                // only process undeground for chunks within near dist
                await chunkset.processChunksBelowGroundSurface().then(chunks =>
                  chunks.forEach(chunk => {
                    render_world_chunk(chunk)
                  }),
                ),
            )
            // wait for first batch to complete before starting second batch
            await Promise.all(pending_batch)
            for (const chunkset of batch) {
              // for chunks further away: process only surface part
              chunkset.processChunksAboveGroundSurface().then(chunks =>
                chunks.forEach(chunk => {
                  render_world_chunk(chunk)
                }),
              )
            }
            // prioritize patches around player
            // const indexedElements = chunks_indexer.indexedElements
            // const prioritizedElements = prioritize_items_around_pos(
            //   indexedElements,
            //   view_center,
            // )
            // for (const chunks_processor of prioritizedElements) {

            // }
            terrain_viewer.setLod(camera.position, 50, camera.far)
          }
          // Board live test
          if (FLAGS.BOARD_POC && !started) {
            started = true
            const board_chunks = board_wrapper.update(current_pos)
            for await (const board_chunk of board_chunks) {
              render_chunk(board_chunk)
            }
            if (board_wrapper.handler?.container) {
              board_wrapper.handler.dispose()
              scene.remove(board_wrapper.handler.container)
            }
            board_wrapper.highlight()
            if (board_wrapper.handler?.container) {
              scene.add(board_wrapper.handler.container)
            }
          }
        }
        board_wrapper.updated = false
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