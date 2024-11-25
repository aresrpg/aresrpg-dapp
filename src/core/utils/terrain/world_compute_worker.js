import {
  Biome,
  ChunkContainer,
  Heightmap,
  ItemsInventory,
  SchematicLoader,
  WorldUtils,
  WorldCompute,
  WorldComputeApi,
} from '@aresrpg/aresrpg-world'
// import * as WorldUtils from '@aresrpg/aresrpg-world/worldUtils'
import workerpool from 'workerpool'

import { setup_world_modules } from './world_setup.js'

const world_modules = {
  heightmapInstance: Heightmap.instance,
  biomeInstance: Biome.instance,
  SchematicLoader,
  ItemsInventory,
  ChunkContainer,
}
setup_world_modules(world_modules)

const raw_args_converter = (...raw_args) => {
  const args = raw_args.map(arg =>
    arg instanceof Array
      ? arg.map(item => WorldUtils.parseThreeStub(item))
      : WorldUtils.parseThreeStub(arg),
  )
  return args
}
const world_compute_api_wrap = {}

for (const [api_key, api_method] of Object.entries(WorldComputeApi)) {
  world_compute_api_wrap[api_key] = raw_args =>
    api_method(...raw_args_converter(raw_args))
}

workerpool.worker({
  ...world_compute_api_wrap,
})
