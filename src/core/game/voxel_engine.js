import {
  ClutterViewer,
  EComputationMethod,
  HeightmapAtlasAutonomous,
  HeightmapViewerGpu,
  MaterialsStore,
  Minimap,
  TerrainViewer,
  VoxelmapViewer,
  WaterData,
} from '@aresrpg/aresrpg-engine'
import {
  BLOCKS_COLOR_MAPPING,
  world_settings,
} from '@aresrpg/aresrpg-sdk/world'
import { BlocksDataFormat, BlocksTask } from '@aresrpg/aresrpg-world'
import { Color } from 'three'

import { LOD_WORKER_POOL } from '../worker/workers.js'
// import { fake_lod_data } from '../utils/terrain/local/world_local.js'

export const chunk_size = { xz: 64, y: 64 }
const altitude = { min: -1, max: 400 }

const blocks_color_mapping = Object.values(BLOCKS_COLOR_MAPPING)
const voxel_materials_list = blocks_color_mapping.map(material =>
  typeof material === 'object'
    ? { color: new Color(material.color), emissiveness: material.emission ?? 1 }
    : { color: new Color(material), emissiveness: 0 },
)

// use dedicated workerpool for LOD

export function create_voxel_engine() {
  const /** @type Set<import("@aresrpg/aresrpg-world").ProcessingTask> */ pending_sampleheightmap_tasks =
      new Set()

  const cancel_sampleheightmap_tasks = () => {
    for (const task of pending_sampleheightmap_tasks.values()) {
      task.cancel()
    }
    pending_sampleheightmap_tasks.clear()
  }

  const map = {
    altitude,
    voxelTypesDefininitions: {
      solidMaterials: voxel_materials_list,
      clutterVoxels: [],
    },
    waterLevel: 0,
    getWaterColorForPatch(
      /** @type number */ patch_x,
      /** @type number */ patch_z,
    ) {
      const /** @type [number, number, number] */ color = [41, 182, 246]
      return color
    },
    async sampleHeightmap(/** @type Float32Array */ samples) {
      return new Promise((resolve, reject) => {
        const blocks_request = new BlocksTask().peakPositions(samples)
        blocks_request.processingParams.dataFormat =
          BlocksDataFormat.FloatArrayXZ
        try {
          pending_sampleheightmap_tasks.add(blocks_request)
          blocks_request
            .delegate(LOD_WORKER_POOL)
            .then(lod_data => {
              if (!lod_data) {
                reject(
                  new Error(
                    'Request was in success but returned an invalid result',
                  ),
                )
              }

              // const faked_lod_data = fake_lod_data(samples)

              const result = {
                altitudes: lod_data.elevation, // faked_lod_data.elevations,
                materialIds: lod_data.type, // faked_lod_data.types,
              }

              resolve(result)
            })
            .catch(reason => {
              reject(new Error(`Request was in error: ${reason}`))
            })
        } finally {
          pending_sampleheightmap_tasks.delete(blocks_request)
        }
      })
    },
  }

  const voxels_materials_store = new MaterialsStore({
    voxelMaterialsList: voxel_materials_list,
    maxShininess: 400,
  })

  const voxels_chunk_data_ordering = 'zxy'

  const clutter_viewer = new ClutterViewer({
    clutterVoxelsDefinitions: map.voxelTypesDefininitions.clutterVoxels,
    chunkSize: chunk_size,
    computationOptions: {
      method: 'worker',
      threadsCount: 1,
    },
    voxelsChunkOrdering: voxels_chunk_data_ordering,
  })

  const /** @type Set<number> */ required_chunksy = new Set()
  for (
    let i = world_settings.rawSettings.chunks.verticalRange.bottomId + 1;
    i < world_settings.rawSettings.chunks.verticalRange.topId;
    i++
  ) {
    required_chunksy.add(i)
  }
  const voxelmap_viewer = new VoxelmapViewer({
    chunkSize: chunk_size,
    requiredChunksYForColumnCompleteness: required_chunksy,
    voxelMaterialsStore: voxels_materials_store,
    clutterViewer: clutter_viewer,
    options: {
      computationOptions: {
        method: EComputationMethod.CPU_MULTITHREADED,
        threadsCount: 4,
        greedyMeshing: false,
      },
      voxelsChunkOrdering: voxels_chunk_data_ordering,
    },
  })

  const heightmap_atlas = new HeightmapAtlasAutonomous({
    heightmap: map,
    heightmapQueries: {
      interval: 200,
      batchSize: 2,
      maxParallelQueries: 20,
    },
    materialsStore: voxels_materials_store,
    texelSizeInWorld: 2,
    leafTileSizeInWorld: voxelmap_viewer.chunkSize.xz,
  })

  const heightmap_viewer = new HeightmapViewerGpu({
    heightmapAtlas: heightmap_atlas,
    flatShading: true,
  })

  const terrain_viewer = new TerrainViewer(heightmap_viewer, voxelmap_viewer)

  const water_view_distance = 3000
  const patch_size = chunk_size.xz
  const water_data = new WaterData({
    map,
    patchesCount: Math.ceil((2 * water_view_distance) / patch_size),
    patchSize: chunk_size.xz,
  })

  const minimap = new Minimap({
    heightmapAtlas: heightmap_atlas,
    waterData: water_data,
    heightmapAtlasDownscalingFactor: 3,
    meshPrecision: 64,
    minViewDistance: 100,
    maxViewDistance: 750,
    markersSize: 0.025,
  })

  function set_water_level(level) {
    map.waterLevel = level
  }

  return {
    cancel_sampleheightmap_tasks,
    clutter_viewer,
    heightmap_viewer,
    voxelmap_viewer,
    terrain_viewer,
    minimap,
    heightmap_atlas,
    water_data,
    set_water_level,
  }
}
