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

export const patch_size = { xz: 64, y: 64 }
export const altitude = { min: -1, max: 400 }

// TODO: this function should be removed and the config should be given to world creation
// ? @see https://github.com/aresrpg/aresrpg-dapp/issues/237
export async function apply_world_env_configuration() {
  // chunks gen
  WorldEnv.current.chunks.range.bottomId = Math.floor(
    altitude.min / patch_size.y,
  )
  WorldEnv.current.chunks.range.topId = Math.floor(altitude.max / patch_size.y)

  WorldEnv.current.seeds.main = 'aresrpg' // common seed use everywhere
  WorldEnv.current.seaLevel = 76 // TODO: remove hardcoded sea
  WorldEnv.current.chunks.dataEncoder = chunk_data_encoder
  WorldEnv.current.chunks.dataDecoder = val =>
    voxelmapDataPacking.getMaterialId(val)
  WorldEnv.current.patchViewCount.near = 4 // chunks view below ground surface

  // EXTERNAL CONFIGS/RESOURCES
  WorldEnv.current.biomes.rawConf = LANDSCAPE
  WorldEnv.current.schematics.globalBlocksMapping = SCHEMATICS_BLOCKS_MAPPING
  // @ts-ignore
  WorldEnv.current.schematics.filesIndex = SCHEMATICS_FILES

  // WORKER POOL
  WorldEnv.current.workerPool.url = WORLD_WORKER_URL
  WorldEnv.current.workerPool.count = WORLD_WORKER_COUNT

  // BOARDS conf
  WorldEnv.current.boardSettings.boardRadius = 15
  WorldEnv.current.boardSettings.boardThickness = 3

  // BIOME tuning
  WorldEnv.current.biomes.periodicity = 8 // biome size
  WorldEnv.current.biomes.bilinearInterpolationRange = 0.1
}
