import {
  Biome,
  Heightmap,
  PatchCache,
  PatchBaseCache,
} from '@aresrpg/aresrpg-world'

import {
  biome_mapping_conf,
  sea_level,
  world_cache_pow_limit,
  world_patch_size,
} from './world_settings.js'

const init_cache = () => {
  PatchCache.patchSize = world_patch_size
  PatchBaseCache.cachePowRadius = 1
  Heightmap.instance.heightmap.params.spreading = 0.42 // (1.42 - 1)
  Heightmap.instance.heightmap.sampling.harmonicsCount = 6
  Heightmap.instance.amplitude.sampling.seed = 'amplitude_mod'
  // Biome (blocks mapping)
  Biome.instance.setMappings(biome_mapping_conf)
  Biome.instance.params.seaLevel = sea_level
}

init_cache()

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
  switch (input.api) {
    // case 'getBlock':
    //   output.data = get_block(...input.args)
    //   postMessage(output)
    //   break
    case 'updateCache': {
      const on_cache_sync = blocks_patch => {
        // postMessage(blocks_patch)
      }
      PatchBaseCache.updateCache(
        input.args[0],
        on_cache_sync,
        input.args[1],
      ).then(res => {
        if (res) {
          if (PatchBaseCache.cachePowRadius < world_cache_pow_limit) {
            PatchBaseCache.cachePowRadius += 1
          }
        }
        output.data = res
        postMessage(output)
      })
      break
    }
  }
})
