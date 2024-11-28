import { WorldEnv, WorldDevPresets } from '@aresrpg/aresrpg-world'

import { chunk_data_encoder } from './world_utils.js'
import { LANDSCAPE, SCHEMATICS_BLOCKS_MAPPING } from './world_settings.js'
import { SCHEMATICS_FILES } from './schematics_files.js'
import WORLD_WORKER_URL from './world_compute_worker.js?url&worker'

// TODO: remove hardcoding and retrieve dynamic value from world
const SEA_LEVEL = 76

/**
 * Override default world environment.
 * To ensure same settings are used everywhere call twice for:
 * - main thread (no argument)
 * - workers (own env provided as argument)
 *
 * @param world_env targeted env or main thread env by default
 */
export const world_shared_env_setup = (world_env = WorldEnv.current) => {
  world_env.seaLevel = SEA_LEVEL // TODO remove hardcoded sea
  world_env.chunks.dataEncoder = chunk_data_encoder

  // EXTERNAL CONFIGS/RESOURCES
  world_env.biomes.rawConf = LANDSCAPE
  // populate inventory with schematics
  world_env.schematics.blocksMapping = SCHEMATICS_BLOCKS_MAPPING
  world_env.schematics.filesIndex = SCHEMATICS_FILES

  // WORKER POOL
  world_env.workerPool.url = WORLD_WORKER_URL
  world_env.workerPool.count = 4
  world_env.workerPool.type = import.meta.env.PROD ? undefined : 'module'

  // BOARDS
  world_env.boardSettings.boardRadius = 20
  world_env.boardSettings.boardThickness = 6

  // DEV override
  // WorldDevPresets(world_env)
}
