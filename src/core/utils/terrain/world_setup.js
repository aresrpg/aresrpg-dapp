import { WorldEnv } from '@aresrpg/aresrpg-world'
import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'

import { chunk_data_encoder } from './world_utils.js'
import { LANDSCAPE, SCHEMATICS_BLOCKS_MAPPING } from './world_settings.js'
import { SCHEMATICS_FILES } from './schematics_files.js'
// @ts-ignore
import world_worker_url from './world_compute_worker.js?url&worker'
export const WORLD_WORKER_URL = world_worker_url
export const WORLD_WORKER_COUNT = 4
// TODO: remove hardcoding and retrieve dynamic value from world
const SEA_LEVEL = 76

/**
 * World environment setup to be shared by main and workers threads
 * @param world_env targeted env or main thread env (no arguments) by default
 */
export const world_shared_setup = (world_env = WorldEnv.current) => {
  world_env.seeds.main = 'test' // common seed use everywhere
  world_env.seaLevel = SEA_LEVEL // TODO: remove hardcoded sea
  world_env.chunks.dataEncoder = chunk_data_encoder
  world_env.chunks.dataDecoder = val => voxelmapDataPacking.getMaterialId(val)
  world_env.patchViewCount.near = 4 // chunks view below ground surface

  // EXTERNAL CONFIGS/RESOURCES
  world_env.biomes.rawConf = LANDSCAPE
  world_env.schematics.globalBlocksMapping = SCHEMATICS_BLOCKS_MAPPING
  world_env.schematics.filesIndex = SCHEMATICS_FILES

  // WORKER POOL
  world_env.workerPool.url = WORLD_WORKER_URL
  world_env.workerPool.count = WORLD_WORKER_COUNT

  // BOARDS conf
  world_env.boardSettings.boardRadius = 15
  world_env.boardSettings.boardThickness = 3

  // BIOME tuning
  world_env.biomes.periodicity = 8 // biome size
  world_env.biomes.bilinearInterpolationRange = 0.1

  // DEV ONLY: LEAVE COMMENTED!
  // EnvOverride(world_env)
}

// DEV ONLY: LEAVE COMMENTED!
// import { EnvOverride, BlocksColorOverride } from '@aresrpg/aresrpg-world'
// import { BLOCKS_COLOR_MAPPING as BLOCKS_COLOR_MAPPING_DAPP } from './world_settings.js'

// export const BLOCKS_COLOR_MAPPING = BlocksColorOverride(
//   BLOCKS_COLOR_MAPPING_DAPP,
// )
