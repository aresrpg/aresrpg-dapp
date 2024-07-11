import {
  Biome,
  Heightmap,
  PatchCache,
  PatchBaseCache,
} from '@aresrpg/aresrpg-world'

import {
  biome_mapping_conf,
  world_patch_size,
  world_cache_size,
} from '../utils/terrain/world_settings.js'

const init_cache = () => {
  PatchCache.patchSize = world_patch_size
  Heightmap.instance.heightmap.params.spreading = 0.42 // (1.42 - 1)
  Heightmap.instance.heightmap.sampling.harmonicsCount = 6
  Heightmap.instance.amplitude.sampling.seed = 'amplitude_mod'
  // Biome (blocks mapping)
  Biome.instance.setMappings(biome_mapping_conf)
  Biome.instance.params.seaLevel = biome_mapping_conf.temperate.beach.x
  PatchBaseCache.cacheRadius = 5
}

init_cache()

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
          if (
            PatchBaseCache.cacheRadius * PatchBaseCache.patchSize <
            world_cache_size
          ) {
            PatchBaseCache.cacheRadius *= 2
            console.log(
              `[WorkerThread] rampup cache radius to: ${PatchBaseCache.cacheRadius}`,
            )
          }
        }
        output.data = res
        postMessage(output)
      })
      break
    }
  }
})
