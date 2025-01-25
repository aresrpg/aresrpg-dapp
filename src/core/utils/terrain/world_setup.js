import { Heightmap, WorldEnv } from '@aresrpg/aresrpg-world'
import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'

import { chunk_data_encoder } from './world_utils.js'
// DEV ONLY: LEAVE THIS LINE COMMENTED
// import { EnvOverride, BlocksColorOverride } from '@aresrpg/aresrpg-world'
import {
  // BLOCKS_COLOR_MAPPING as BLOCKS_COLOR_MAPPING_DAPP, // DEV ONLY: LEAVE THIS LINE COMMENTED
  LANDSCAPE,
  SCHEMATICS_BLOCKS_MAPPING,
} from './world_settings.js'
import { SCHEMATICS_FILES } from './schematics_files.js'
// @ts-ignore
import world_worker_url from './world_compute_worker.js?url&worker'
export const WORLD_WORKER_URL = world_worker_url
export const WORLD_WORKER_COUNT = 4
// TODO: remove hardcoding and retrieve dynamic value from world
const SEA_LEVEL = 76

/**
 * World environment setup to be shared by main and workers threads
 * - for main thread: call without argument
 * - for workers: provide worker's own env as argument
 *
 * @param world_env targeted env or main thread env by default
 */
export const world_shared_setup = (
  world_env = WorldEnv.current,
  heightmap_instance = Heightmap.instance,
) => {
  world_env.seaLevel = SEA_LEVEL // TODO: remove hardcoded sea
  world_env.chunks.dataEncoder = chunk_data_encoder
  world_env.chunks.dataDecoder = val => voxelmapDataPacking.getMaterialId(val)
  world_env.patchViewCount.near = 4 // chunks view below ground surface

  // EXTERNAL CONFIGS/RESOURCES
  world_env.biomes.rawConf = LANDSCAPE
  // populate inventory with schematics
  world_env.schematics.globalBlocksMapping = SCHEMATICS_BLOCKS_MAPPING
  // @ts-ignore
  world_env.schematics.filesIndex = SCHEMATICS_FILES

  // WORKER POOL
  world_env.workerPool.url = WORLD_WORKER_URL
  world_env.workerPool.count = WORLD_WORKER_COUNT
  // @ts-ignore
  world_env.workerPool.type = 'module'

  // BOARDS
  world_env.boardSettings.boardRadius = 15
  world_env.boardSettings.boardThickness = 3

  // DEV ONLY: LEAVE THIS LINE COMMENTED
  // EnvOverride(world_env)
  heightmap_instance.heightmap.params.spreading = 0.42 // (1.42 - 1)
  heightmap_instance.heightmap.sampling.harmonicsCount = 6
  heightmap_instance.amplitude.sampling.seed = 'amplitude_mod'
}

// DEV ONLY: LEAVE THIS LINE COMMENTED
// export const BLOCKS_COLOR_MAPPING = BlocksColorOverride(
//   BLOCKS_COLOR_MAPPING_DAPP,
// )
