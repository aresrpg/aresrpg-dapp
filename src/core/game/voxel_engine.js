import {
  EComputationMethod,
  HeightmapViewerGpu,
  MaterialsStore,
  TerrainViewer,
  VoxelmapViewer,
} from '@aresrpg/aresrpg-engine'
import { BlocksProcessing } from '@aresrpg/aresrpg-world'
import { Color, Vector3 } from 'three'
import {
  BLOCKS_COLOR_MAPPING,
  world_settings,
} from '@aresrpg/aresrpg-sdk/world'
import { WorkerPool } from '@aresrpg/aresrpg-world/workerpool'

export const chunk_size = { xz: 64, y: 64 }
const altitude = { min: -1, max: 400 }

const blocks_color_mapping = Object.values(BLOCKS_COLOR_MAPPING)
const voxel_materials_list = blocks_color_mapping.map(material =>
  typeof material === 'object'
    ? { color: new Color(material.color), emissiveness: material.emission ?? 1 }
    : { color: new Color(material), emissiveness: 0 },
)

// use dedicated workerpool for LOD
const lod_dedicated_worker_pool = new WorkerPool()

lod_dedicated_worker_pool.init(1)

await lod_dedicated_worker_pool.loadWorldEnv(world_settings.rawSettings)

export function create_voxel_engine() {
  const map = {
    altitude,
    voxelMaterialsList: voxel_materials_list,
    async sampleHeightmap(/** @type Float32Array */ coords) {
      const samples_count = coords.length / 2
      const pos_batch = []
      for (let i = 0; i < samples_count; i++) {
        pos_batch.push(new Vector3(coords[2 * i + 0], 0, coords[2 * i + 1]))
      }

      console.log('peak positions', pos_batch)
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
    world_settings.rawSettings.chunks.range.bottomId + 1,
    world_settings.rawSettings.chunks.range.topId,
    voxels_materials_store,
    {
      chunkSize: chunk_size,
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
  terrain_viewer.parameters.lod.enabled = true
  return { voxelmap_viewer, terrain_viewer }
}
