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

import { schem_blocks_mapping, schem_files } from './schematics_conf.js'
import { proc_items_conf, sea_level } from './world_conf.js'
import { biome_mapping_conf } from './world_original_settings.js'
import { chunk_data_encoder } from './world_utils.js'

const init_world = async () => {
  GroundPatch.patchSize = WorldConf.patchSize
  Heightmap.instance.heightmap.params.spreading = 0.42 // (1.42 - 1)
  Heightmap.instance.heightmap.sampling.harmonicsCount = 6
  Heightmap.instance.amplitude.sampling.seed = 'amplitude_mod'
  // Biome (blocks mapping)
  Biome.instance.parseBiomesConfig(biome_mapping_conf)
  Biome.instance.params.seaLevel = sea_level
  // populate items inventory: import schematics and procedural objects
  SchematicLoader.worldBlocksMapping = schem_blocks_mapping
  ItemsInventory.importProceduralObjects(proc_items_conf)
  await ItemsInventory.importSchematics(schem_files, chunk_data_encoder)
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

addEventListener('message', ({ data: input }) => {
  const output = {
    id: input.id,
  }
  const { apiName: api_name } = input
  const args = input.args.map(arg => WorldUtils.parseThreeStub(arg))
  const res_stub = WorldCompute[api_name](...args)
  output.data = res_stub
  postMessage(output)
})
