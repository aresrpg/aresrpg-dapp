import {
  Biome,
  Heightmap,
  BlocksPatch,
  WorldCompute,
  WorldApiName,
} from '@aresrpg/aresrpg-world'
import { Vector3 } from 'three'

import {
  biome_mapping_conf,
  sea_level,
  world_patch_size,
} from './world_settings.js'

const init_world = () => {
  BlocksPatch.patchSize = world_patch_size
  Heightmap.instance.heightmap.params.spreading = 0.42 // (1.42 - 1)
  Heightmap.instance.heightmap.sampling.harmonicsCount = 6
  Heightmap.instance.amplitude.sampling.seed = 'amplitude_mod'
  // Biome (blocks mapping)
  Biome.instance.setMappings(biome_mapping_conf)
  Biome.instance.params.seaLevel = sea_level
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
  const { apiName: api_name, args } = input
  if (
    [
      WorldApiName.GroundBlockCompute,
      WorldApiName.OvergroundBlocksCompute,
    ].includes(api_name)
  ) {
    args[0] = new Vector3(...Object.values(args[0]))
  }
  const obj_stub = WorldCompute[api_name](...args)
  output.data = obj_stub
  postMessage(output)
})
