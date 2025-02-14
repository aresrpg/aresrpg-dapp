import { getWorldEnv } from '@aresrpg/aresrpg-world'

// import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'
// import { chunk_data_encoder } from './world_utils.js'
import { LANDSCAPE, SCHEMATICS_BLOCKS_MAPPING } from './world_settings.js'
import { SCHEMATICS_FILES } from './schematics_files.js'
// TODO: remove hardcoding and retrieve dynamic value from world
const SEA_LEVEL = 76

/**
 * World environment setup
 */
const setup_world_environment = () => {
  const world_env = getWorldEnv()
  const { rawSettings: world_env_settings } = world_env

  world_env_settings.seeds.main = 'aresrpg' // common seed use everywhere
  world_env_settings.biomes.seaLevel = SEA_LEVEL // TODO: remove hardcoded sea
  // world_env.chunks.dataEncoder = chunk_data_encoder
  // world_env.chunks.dataDecoder = val => voxelmapDataPacking.getMaterialId(val)
  world_env_settings.patchViewRanges.near = 4 // chunks view below ground surface

  // EXTERNAL CONFIGS/RESOURCES
  world_env_settings.biomes.rawConf = LANDSCAPE
  world_env_settings.schematics.globalBlocksMapping = SCHEMATICS_BLOCKS_MAPPING
  // @ts-ignore
  world_env_settings.schematics.filesIndex = SCHEMATICS_FILES

  // BOARDS conf
  world_env_settings.boards.boardRadius = 15
  world_env_settings.boards.boardThickness = 3

  // BIOME tuning
  world_env_settings.biomes.periodicity = 8 // biome size
  world_env_settings.biomes.bilinearInterpolationRange = 0.1

  return world_env
}

export const world_shared_env = setup_world_environment()
