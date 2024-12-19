import {
  EComputationMethod,
  HeightmapViewer,
  TerrainViewer,
  VoxelmapViewer,
} from '@aresrpg/aresrpg-engine'
import { BlocksBatch , WorldEnv } from '@aresrpg/aresrpg-world'
import { Color, Vector2 } from 'three'

import { BLOCKS_COLOR_MAPPING } from './world_settings.js'
// DEV ONLY: LEAVE THIS LINE COMMENTED
// import { BLOCKS_COLOR_MAPPING } from './world_setup.js'
import { altitude, FLAGS, LOD_MODE, patch_size } from './setup.js'

const voxel_materials_list = Object.values(BLOCKS_COLOR_MAPPING).map(col => ({
  color: new Color(col),
}))

const chunks_range = WorldEnv.current.chunks.range

export const voxel_engine_setup = () => {
  const map = {
    minAltitude: altitude.min,
    maxAltitude: altitude.max,
    voxelMaterialsList: voxel_materials_list,
    async sampleHeightmap(coords) {
      FLAGS.LOD_MODE === LOD_MODE.DYNAMIC &&
        console.log(`block batch compute size: ${coords.length}`)
      const pos_batch = coords.map(({ x, z }) => new Vector2(x, z))
      const blocks_batch = await BlocksBatch.proxyGen(pos_batch)
      // const res = await WorldComputeProxy.current.computeBlocksBatch(
      //   pos_batch,
      //   {
      //     includeEntitiesBlocks: true,
      //   },
      // )
      const data = blocks_batch.map(block => ({
        altitude: block.pos.y + 0.25,
        // @ts-ignore
        color: new Color(BLOCKS_COLOR_MAPPING[block.data.type]),
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
  return { voxelmap_viewer, terrain_viewer }
}
