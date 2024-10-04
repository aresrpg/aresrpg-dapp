import {
  Biome,
  GroundPatch,
  Heightmap,
  OvergroundEntities,
  SchematicLoader,
  WorldCompute,
  WorldConf,
  WorldUtils,
} from '@aresrpg/aresrpg-world'

import { schem_blocks_mapping, schem_files } from './schematics_conf.js'
import { biome_mapping_conf, sea_level } from './world_original_settings.js'

const init_world = async () => {
  GroundPatch.patchSize = WorldConf.patchSize
  Heightmap.instance.heightmap.params.spreading = 0.42 // (1.42 - 1)
  Heightmap.instance.heightmap.sampling.harmonicsCount = 6
  Heightmap.instance.amplitude.sampling.seed = 'amplitude_mod'
  // Biome (blocks mapping)
  Biome.instance.parseBiomesConfig(biome_mapping_conf)
  Biome.instance.params.seaLevel = sea_level
  SchematicLoader.worldBlocksMapping = schem_blocks_mapping
  await OvergroundEntities.loadSchematics(schem_files)
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
