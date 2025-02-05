import {
  EComputationMethod,
  HeightmapViewer,
  TerrainViewer,
  VoxelmapViewer,
} from '@aresrpg/aresrpg-engine'
import { BlocksProcessing, WorldEnv, WorkerPool } from '@aresrpg/aresrpg-world'
import { Color, Vector3 } from 'three'

import { altitude, FLAGS, LOD_MODE, patch_size } from './setup.js'
import {
  WORLD_WORKER_URL,
  // BLOCKS_COLOR_MAPPING,  // DEV ONLY: LEAVE THIS LINE COMMENTED
} from './world_setup.js'
import { BLOCKS_COLOR_MAPPING } from './world_settings.js'

const blocks_color_mapping = Object.values(BLOCKS_COLOR_MAPPING)
const voxel_materials_list = blocks_color_mapping.map(col => ({
  color: new Color(col),
  emission: 0, // TODO: add emissive
}))

const chunks_range = WorldEnv.current.chunks.range

// use dedicated workerpool for LOD
const lod_dedicated_worker_pool = new WorkerPool()
lod_dedicated_worker_pool.init(WORLD_WORKER_URL, 1)

export const voxel_engine_setup = () => {
  const map = {
    minAltitude: altitude.min,
    maxAltitude: altitude.max,
    voxelMaterialsList: voxel_materials_list,
    async sampleHeightmap(coords) {
      FLAGS.LOD_MODE === LOD_MODE.DYNAMIC &&
        console.log(`block batch compute size: ${coords.length}`)
      const pos_batch = coords.map(({ x, z }) => new Vector3(x, 0, z))
      const blocks_request = BlocksProcessing.getPeakPositions(pos_batch)
      const blocks_batch = await blocks_request.delegate(
        lod_dedicated_worker_pool,
      )

      const data = blocks_batch.map(block => {
        const block_type = block.data.type // voxelmapDataPacking.getMaterialId(block.data.type)
        const item = {
          altitude: block.data.level, // block.pos.y + 0.25,
          // @ts-ignore
          color: new Color(BLOCKS_COLOR_MAPPING[block_type]),
        }
        return item
      })
      return data
    },
  }
  const voxelmap_viewer = new VoxelmapViewer(
    chunks_range.bottomId + 1,
    chunks_range.topId,
    voxel_materials_list,
    {
      patchSize: patch_size,
      computationOptions: {
        method: EComputationMethod.CPU_MULTITHREADED,
        threadsCount: 4,
        greedyMeshing: false,
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
  return { voxelmap_viewer, terrain_viewer }
}
