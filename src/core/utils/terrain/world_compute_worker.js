import {
  Biome,
  ChunkContainer,
  Heightmap,
  ItemsInventory,
  SchematicLoader,
  WorldCompute,
} from '@aresrpg/aresrpg-world'
import * as WorldUtils from '@aresrpg/aresrpg-world/worldUtils'

import { setup_world_modules } from './world_setup.js'

const world_modules = {
  heightmapInstance: Heightmap.instance,
  biomeInstance: Biome.instance,
  SchematicLoader,
  ItemsInventory,
  ChunkContainer,
}
setup_world_modules(world_modules)

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
