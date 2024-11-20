import {
  Biome,
  ChunkContainer,
  Heightmap,
  ItemsInventory,
  SchematicLoader,
  WorldCompute,
  WorldUtils,
} from '@aresrpg/aresrpg-world'

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

addEventListener('message', async ({ data: task }) => {
  const output = {
    id: task.id,
  }
  const args = task.args.map(arg =>
    arg instanceof Array
      ? arg.map(item => WorldUtils.parseThreeStub(item))
      : WorldUtils.parseThreeStub(arg),
  )
  const res = WorldCompute[task.name](...args)
  output.data = res instanceof Promise ? await res : res
  postMessage(output)
})
