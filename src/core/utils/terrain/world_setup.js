import { biomes_landscapes_custom } from './biomes_landscapes.custom.js'
import { biomes_landscapes_default } from './biomes_landscapes.default.js'
import { proc_items_conf } from './proc_items.js'
import { SCHEMPACKS, schem_blocks_mapping } from './world_schem_conf.js'
import { sea_level } from './world_static_conf.js'

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
  biomeInstance.parseBiomesConfig(biomes_landscapes_default)
  // populate inventory with schematics and procedural objects
  SchematicLoader.worldBlocksMapping = schem_blocks_mapping
  ItemsInventory.externalResources.procItemsConfigs = proc_items_conf
  ItemsInventory.externalResources.schemFileUrls = { ...SCHEMPACKS.TREES.files }
}
