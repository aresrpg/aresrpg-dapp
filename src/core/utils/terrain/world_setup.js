import { proc_items_conf } from './proc_items.js'
import { chunk_data_encoder } from './world_utils.js'
import { LANDSCAPE, SCHEMATICS_BLOCKS_MAPPING } from './world_settings.js'
import { SEA_LEVEL } from './config/world_settings.js'
import { SCHEMATICS_FILES } from './schematics_files.js'

/**
 * Unified setup to ensure having same settings everywhere (workers, main thread)
 */
export const setup_world_modules = ({
  heightmapInstance,
  biomeInstance,
  SchematicLoader,
  ItemsInventory,
  ChunkContainer,
}) => {
  // GroundPatch.patchSize = WorldConf.patchSize
  // Tune heightmap settings
  heightmapInstance.heightmap.params.spreading = 0.42 // (1.42 - 1)
  heightmapInstance.heightmap.sampling.harmonicsCount = 6
  heightmapInstance.amplitude.sampling.seed = 'amplitude_mod'
  // External configuration
  biomeInstance.params.seaLevel = SEA_LEVEL
  biomeInstance.parseBiomesConfig(LANDSCAPE)
  // populate inventory with schematics and procedural objects
  SchematicLoader.worldBlocksMapping = SCHEMATICS_BLOCKS_MAPPING
  ItemsInventory.externalResources.procItemsConfigs = proc_items_conf
  ItemsInventory.externalResources.schemFileUrls = SCHEMATICS_FILES
  ChunkContainer.defaultDataEncoder = chunk_data_encoder
}
