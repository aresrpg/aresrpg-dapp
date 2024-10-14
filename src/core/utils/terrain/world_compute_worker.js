import {
  Biome,
  GroundPatch,
  Heightmap,
  ItemsInventory,
  PseudoDistributionMap,
  SchematicLoader,
  WorldCompute,
  WorldConf,
  WorldUtils,
} from '@aresrpg/aresrpg-world'

import { proc_items_conf, sea_level } from './world_conf.js'
import { SCHEMPACKS, schem_blocks_mapping } from './schem_conf.js'
import { biome_conf_mappings } from './biome_conf_mappings.original.js'

const init_world = async () => {
  GroundPatch.patchSize = WorldConf.patchSize
  Heightmap.instance.heightmap.params.spreading = 0.42 // (1.42 - 1)
  Heightmap.instance.heightmap.sampling.harmonicsCount = 6
  Heightmap.instance.amplitude.sampling.seed = 'amplitude_mod'
  // Biome (blocks mapping)
  Biome.instance.parseBiomesConfig(biome_conf_mappings)
  Biome.instance.params.seaLevel = sea_level
  // populate items inventory: import schematics and procedural objects
  SchematicLoader.worldBlocksMapping = schem_blocks_mapping
  ItemsInventory.externalResources.procItemsConfigs = proc_items_conf
  ItemsInventory.externalResources.schemFileUrls = { ...SCHEMPACKS.TREES.files }
  // SchematicLoader.worldBlocksMapping = schem_blocks_mapping
  // ItemsInventory.importProceduralObjects(proc_items_conf)
  // await ItemsInventory.importSchematics(schempacks.files.trees.eu, chunk_data_encoder)
  // await ItemsInventory.importSchematics(schempacks.files.trees.misc, chunk_data_encoder)
  // define spawn distribution for items
  Object.keys(ItemsInventory.catalog).forEach(item_id => {
    ItemsInventory.spawners[item_id] = new PseudoDistributionMap()
  })
}

init_world()

addEventListener('error', e => {
  console.error(e)
  self.postMessage({ type: 'error', message: e.message })
})

addEventListener('unhandledrejection', e => {
  console.error('Worker script unhandled rejection:', e)
  self.postMessage({ type: 'error', message: e.reason })
})

addEventListener('message', async ({ data: input }) => {
  const output = {
    id: input.id,
  }
  const { apiName: api_name } = input
  const args = input.args.map(arg =>
    arg instanceof Array
      ? arg.map(item => WorldUtils.parseThreeStub(item))
      : WorldUtils.parseThreeStub(arg),
  )
  const res = WorldCompute[api_name](...args)
  output.data = res instanceof Promise ? await res : res
  postMessage(output)
})
