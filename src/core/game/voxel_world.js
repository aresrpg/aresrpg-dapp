import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'
import { WorldEnv } from '@aresrpg/aresrpg-world'
import {
  LANDSCAPE,
  SCHEMATICS_BLOCKS_MAPPING,
} from '@aresrpg/aresrpg-sdk/world'
import { SCHEMATICS_FILES } from '@aresrpg/aresrpg-sdk/schematics'

import { chunk_data_encoder } from '../utils/terrain/world_utils.js'

// @ts-ignore
import world_worker_url from './world_compute_worker.js?url&worker'

export const WORLD_WORKER_URL = world_worker_url
export const WORLD_WORKER_COUNT = 4

// NB: LOD should be set to STATIC to limit over-computations and fix graphical issues
export const LOD_MODE = {
  NONE: 0,
  STATIC: 1,
  DYNAMIC: 2,
}

export const FLAGS = {
  LOD_MODE: LOD_MODE.STATIC,
}

export const world_settings = {
  seed: 'aresrpg',
  sea_level: 76,
  patch_view: {
    near: 4,
  },
  biomes: {
    landscape: LANDSCAPE,
    size: 8,
    interpolation_range: 0.1,
  },
  schematics: {
    blocks_mapping: SCHEMATICS_BLOCKS_MAPPING,
    files: SCHEMATICS_FILES,
  },
  boards: {
    radius: 20,
    thickness: 3,
  },
  heightmap: {
    spread: 0.42,
    harmonics: 6,
  },
  chunks: {
    size: { xz: 64, y: 64 },
    altitude: { min: -1, max: 400 },
  },
}

export async function apply_world_env_configuration() {
  // chunks gen
  WorldEnv.current.chunks.range.bottomId = Math.floor(
    world_settings.chunks.altitude.min / world_settings.chunks.size.y,
  )
  WorldEnv.current.chunks.range.topId = Math.floor(
    world_settings.chunks.altitude.max / world_settings.chunks.size.y,
  )

  WorldEnv.current.chunks.dataEncoder = chunk_data_encoder
  WorldEnv.current.chunks.dataDecoder = val =>
    voxelmapDataPacking.getMaterialId(val)

  WorldEnv.current.seeds.main = world_settings.seed
  WorldEnv.current.seaLevel = world_settings.sea_level
  WorldEnv.current.patchViewCount.near = world_settings.patch_view.near // chunks view below ground surface

  // EXTERNAL CONFIGS/RESOURCES
  WorldEnv.current.biomes.rawConf = world_settings.biomes.landscape
  WorldEnv.current.schematics.globalBlocksMapping =
    world_settings.schematics.blocks_mapping
  WorldEnv.current.schematics.filesIndex = world_settings.schematics.files

  // WORKER POOL
  WorldEnv.current.workerPool.url = WORLD_WORKER_URL
  WorldEnv.current.workerPool.count = WORLD_WORKER_COUNT

  // BOARDS conf
  WorldEnv.current.boardSettings.boardRadius = world_settings.boards.radius
  WorldEnv.current.boardSettings.boardThickness =
    world_settings.boards.thickness

  // BIOME tuning
  WorldEnv.current.biomes.periodicity = world_settings.biomes.size
  WorldEnv.current.biomes.bilinearInterpolationRange =
    world_settings.biomes.interpolation_range
}
