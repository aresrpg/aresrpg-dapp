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
import { BlocksProcessing } from '@aresrpg/aresrpg-world'
import { Color, Vector3 } from 'three'

import { LOD_WORKER_POOL } from '../worker/workers.js'

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
    async sampleHeightmap(/** @type Float32Array */ coords) {
      const samples_count = coords.length / 2
      const pos_batch = []
      for (let i = 0; i < samples_count; i++) {
        pos_batch.push(new Vector3(coords[2 * i + 0], 0, coords[2 * i + 1]))
      }

      const blocks_request = BlocksProcessing.getPeakPositions(pos_batch)
      const blocks_batch = await blocks_request.delegate(LOD_WORKER_POOL)

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
  terrain_viewer.parameters.lod.enabled = true

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
    clutter_viewer,
    voxelmap_viewer,
    terrain_viewer,
    minimap,
    heightmap_atlas,
    water_data,
    set_water_level,
  }
}
