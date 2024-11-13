import { proc_items_conf } from './proc_items.js'
import { SCHEMATICS_FILES } from './schematics_files.js'
import {
  LANDSCAPE,
  SCHEMATICS_BLOCKS_MAPPING,
  sea_level,
} from './world_settings.js'

/**
 * Unified setup to ensure having same settings everywhere (workers, main thread)
 */
export const setup_world_modules = ({
  heightmapInstance,
  biomeInstance,
  SchematicLoader,
  ItemsInventory,
}) => {
  // GroundPatch.patchSize = WorldConf.patchSize
  // Tune heightmap settings
  heightmapInstance.heightmap.params.spreading = 0.42 // (1.42 - 1)
  heightmapInstance.heightmap.sampling.harmonicsCount = 6
  heightmapInstance.amplitude.sampling.seed = 'amplitude_mod'
  // External configuration
  biomeInstance.params.seaLevel = sea_level
  biomeInstance.parseBiomesConfig(LANDSCAPE)
  // populate inventory with schematics and procedural objects
  SchematicLoader.worldBlocksMapping = SCHEMATICS_BLOCKS_MAPPING
  ItemsInventory.externalResources.procItemsConfigs = proc_items_conf
  ItemsInventory.externalResources.schemFileUrls = SCHEMATICS_FILES
}
