import {
  EComputationMethod,
  HeightmapViewerGpu,
  MaterialsStore,
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
const lod_dedicated_worker_pool = new WorkerPool(WORLD_WORKER_URL, 1)

export const voxel_engine_setup = () => {
  const map = {
    altitude,
    voxelMaterialsList: voxel_materials_list,
    async sampleHeightmap(/** @type Float32Array */ coords) {
      const samples_count = coords.length / 2
      if (FLAGS.LOD_MODE === LOD_MODE.DYNAMIC) {
        console.log(`block batch compute size: ${samples_count}`)
      }

      const pos_batch = []
      for (let i = 0; i < samples_count; i++) {
        pos_batch.push(new Vector3(coords[2 * i + 0], 0, coords[2 * i + 1]))
      }

      const blocks_request = BlocksProcessing.getPeakPositions(pos_batch)
      const blocks_batch = await blocks_request.delegate(
        lod_dedicated_worker_pool,
      )

      const result = {
        altitudes: new Float32Array(samples_count),
        materialIds: new Uint32Array(samples_count),
      }

      for (let i = 0; i < samples_count; i++) {
        const block_processing_output = blocks_batch[i]
        result.altitudes[i] = block_processing_output.data.level
        result.materialIds[i] = block_processing_output.data.type
      }

      return result
    },
  }

  const voxels_materials_store = new MaterialsStore({
    voxelMaterialsList: voxel_materials_list,
    maxShininess: 400,
  })

  const voxelmap_viewer = new VoxelmapViewer(
    chunks_range.bottomId + 1,
    chunks_range.topId,
    voxels_materials_store,
    {
      chunkSize: patch_size,
      computationOptions: {
        method: EComputationMethod.CPU_MULTITHREADED,
        threadsCount: 4,
        greedyMeshing: false,
      },
      voxelsChunkOrdering: 'zxy',
    },
  )

  const heightmap_viewer = new HeightmapViewerGpu({
    materialsStore: voxels_materials_store,
    basePatch: {
      worldSize: voxelmap_viewer.chunkSize.xz,
      segmentsCount: voxelmap_viewer.chunkSize.xz / 2,
    },
    maxNesting: 5,
    heightmap: map,
    flatShading: true,
  })

  const terrain_viewer = new TerrainViewer(heightmap_viewer, voxelmap_viewer)
  terrain_viewer.parameters.lod.enabled = FLAGS.LOD_MODE > 0
  return { voxelmap_viewer, terrain_viewer }
}
