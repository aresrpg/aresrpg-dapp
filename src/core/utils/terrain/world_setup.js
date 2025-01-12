import {
  // WorldDevSetup,
  WorldEnv,
} from '@aresrpg/aresrpg-world'
import workerpool from 'workerpool'
import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'

import { chunk_data_encoder } from './world_utils.js'
import {
  BLOCKS_COLOR_MAPPING as BLOCKS_COLOR_MAPPING_DAPP,
  LANDSCAPE,
  SCHEMATICS_BLOCKS_MAPPING,
} from './world_settings.js'
import { SCHEMATICS_FILES } from './schematics_files.js'
// @ts-ignore
import WORLD_WORKER_URL from './world_compute_worker.js?url&worker'

// TODO: remove hardcoding and retrieve dynamic value from world
const SEA_LEVEL = 76

/**
 * World environment setup to be shared by main and workers threads
 * - for main thread: call without argument
 * - for workers: provide worker's own env as argument
 *
 * @param world_env targeted env or main thread env by default
 */
export const world_shared_setup = (world_env = WorldEnv.current) => {
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
  world_env.workerPool.count = 4
  // @ts-ignore
  world_env.workerPool.type = 'module'

  // BOARDS
  world_env.boardSettings.boardRadius = 20
  world_env.boardSettings.boardThickness = 3

  // DEV ONLY: LEAVE THIS LINE COMMENTED
  // WorldDevSetup.EnvOverride(world_env)
}

export const get_dedicated_worker_pool = (worker_count = 1) => {
  const worker_type = 'module' // WorldEnv.current.workerPool.type
  const worker_opts = {}
  if (worker_type) {
    // By default, Vite uses a module worker in dev mode, which can cause your application to fail.
    // Therefore, we need to use a module worker in dev mode and a classic worker in prod mode.
    worker_opts.type = worker_type
  }
  const worker_pool = workerpool.pool(WORLD_WORKER_URL, {
    maxWorkers: worker_count,
    workerOpts: worker_opts,
  })
  return worker_pool
}

// DEV ONLY: LEAVE THIS LINE COMMENTED
// export const BLOCKS_COLOR_MAPPING = WorldDevSetup.BlocksColorOverride(
//   BLOCKS_COLOR_MAPPING_DAPP,
// )
