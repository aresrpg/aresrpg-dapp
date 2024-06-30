import { Biome, PatchCache, BlockType, Heightmap } from '@aresrpg/aresrpg-world'
import { Box3, Vector3, MathUtils } from 'three'

import {
  blocks_colors,
  biome_mapping_conf,
  world_patch_size,
  world_cache_size,
} from '../utils/terrain/world_settings.js'

const dbg_highlight_patch_borders = false // debug only

const init_cache = () => {
  PatchCache.patchSize = world_patch_size
  Heightmap.instance.heightmap.params.spreading = 0.42 // (1.42 - 1)
  Heightmap.instance.heightmap.sampling.harmonicsCount = 6
  Heightmap.instance.amplitude.sampling.seed = 'amplitude_mod'
  // Biome (blocks mapping)
  Biome.instance.setMappings(biome_mapping_conf)
  Biome.instance.params.seaLevel = biome_mapping_conf.temperate.beach.x
  PatchCache.updateCache(new Vector3(), world_cache_size / 4, true)
}

const update_cache = async player_position => {
  const cache_refreshed = await PatchCache.updateCache(
    player_position,
    world_cache_size,
  )
  return { cacheRefreshed: cache_refreshed }
}

const get_ground_level = (x, z) => {
  const block_pos = new Vector3(x, 0, z)
  const ground_block = PatchCache.getBlock(block_pos)
  return ground_block.pos.y
}

const get_block = (x, z) => {
  const block_pos = new Vector3(x, 128, z)
  let ground_level = 0
  let extra_level = 0
  let block_type = BlockType.WATER

  const ground_block = PatchCache.getBlock(block_pos)

  if (ground_block) {
    const buff_index = ground_block.buffer.findLastIndex(
      type => type !== BlockType.NONE,
    )
    ground_level = ground_block.pos.y
    extra_level = buff_index !== -1 ? buff_index : 0
    block_type =
      buff_index !== -1 ? ground_block.buffer.at(buff_index) : ground_block.type
  }
  // console.log(`${x} ${ground_block.pos.y} ${z} ${ground_level}`)
  const block = {
    type: block_type,
    ground_level,
    top_level: ground_level + extra_level,
  }
  return block
}

const get_patch = (bmin, bmax) => {
  const bbox = new Box3(
    new Vector3(...Object.values(bmin)),
    new Vector3(...Object.values(bmax)),
  )
  const patch = PatchCache.cache.find(
    patch =>
      patch.bbox.min.x === bbox.min.x &&
      patch.bbox.min.z === bbox.min.z &&
      patch.bbox.max.x === bbox.max.x &&
      patch.bbox.max.z === bbox.max.z,
  )
  return patch?.blocks.level
}

const get_chunk = (block_start, block_end) => {
  // TODO make this function run in another thread
  const bbox = new Box3(block_start, block_end)
  const dimensions = bbox.getSize(new Vector3())
  const patch_size = dimensions.x
  const cache = new Uint16Array(dimensions.x * dimensions.y * dimensions.z)
  // const debug_mode = true

  // const is_edge = (row, col, h, patch_size) =>
  //   row === 1 || row === patch_size || col === 1 || col === patch_size
  // || h === 1
  // || h === patch_size - 2

  let is_empty = true

  const fill_blocks_struct = (block_pos, ground_type, buffer_over = []) => {
    const level = MathUtils.clamp(
      block_pos.y + buffer_over.length,
      bbox.min.y,
      bbox.max.y,
    )
    let buff_index = Math.max(level - block_pos.y, 0)
    let h = level - bbox.min.y // local height
    // debug_mode && is_edge(local_pos.z, local_pos.x, h, patch_size - 2)
    //   ? BlockType.SAND
    //   : block_cache.type

    while (h >= 0) {
      const cache_index =
        block_pos.z * Math.pow(patch_size, 2) + h * patch_size + block_pos.x
      const block_type = buff_index > 0 ? buffer_over[buff_index] : ground_type
      const skip =
        buff_index > 0 &&
        cache[cache_index] !== undefined &&
        !buffer_over[buff_index]
      if (!skip) {
        cache[cache_index] = block_type ? block_type + 1 : BlockType.NONE
      }
      buff_index--
      h--
    }
  }

  const add_ground_blocks = patch => {
    const iter = patch?.blockIterator(true)
    let res = iter.next()
    while (!res.done) {
      const block_data = res.value
      const block_pos = block_data.pos.clone()
      block_pos.x += 1
      block_pos.z += 1
      let border_type
      if (dbg_highlight_patch_borders) {
        if (block_pos.x === 1 || block_pos.z === 1) {
          border_type = patch.isTransitionPatch
            ? BlockType.SAND
            : BlockType.WATER
          border_type = patch.isBiomeTransition ? BlockType.MUD : border_type
        }
      }
      const block_type = border_type || block_data.type
      fill_blocks_struct(block_pos, block_type)
      res = iter.next()
    }
  }

  const add_entities_blocks = patch => {
    // patch.spawned
    const buff_iter = patch.overBlocksIter()
    for (const blk of buff_iter) {
      blk.localPos.x += 1
      blk.localPos.z += 1
      fill_blocks_struct(blk.localPos, blk.type, blk.buffer)
    }
  }

  const add_edges_blocks = () => {
    for (let i = 0; i < patch_size; i++) {
      const xmin = {
        global_pos: new Vector3(bbox.min.x, 0, bbox.min.z + i),
        local_pos: new Vector3(0, 0, i),
      }
      const xmax = {
        global_pos: new Vector3(bbox.max.x, 0, bbox.min.z + i),
        local_pos: new Vector3(patch_size - 1, 0, i),
      }
      const zmin = {
        global_pos: new Vector3(bbox.min.x + i, 0, bbox.min.z),
        local_pos: new Vector3(i, 0, 0),
      }
      const zmax = {
        global_pos: new Vector3(bbox.min.x + i, 0, bbox.max.z),
        local_pos: new Vector3(i, 0, patch_size - 1),
      }
      const edges = [xmin, zmin, xmax, zmax]
      edges.forEach(edge => {
        const block_data = PatchCache.getBlock(edge.global_pos)
        const block_local_pos = edge.local_pos.clone()
        block_local_pos.y = block_data.pos.y
        fill_blocks_struct(block_local_pos, block_data.type)
        // else console.log('missing block: ', edge.pos)
      })
    }
  }

  const patch = PatchCache.cache.find(
    patch =>
      patch.bbox.min.x === bbox.min.x + 1 &&
      patch.bbox.min.z === bbox.min.z + 1 &&
      patch.bbox.max.x === bbox.max.x - 1 &&
      patch.bbox.max.z === bbox.max.z - 1 &&
      patch.bbox.intersectsBox(bbox),
  )

  if (patch) {
    add_ground_blocks(patch)
    // process entities
    add_entities_blocks(patch)
    // fill extra blocks at edges from adjacent patches
    add_edges_blocks()
    is_empty = false
  }
  return cache
}

init_cache()

addEventListener('message', ({ data: input }) => {
  const output = {
    id: input.id,
  }
  switch (input.api) {
    case 'getGroundLevel':
      output.data = get_ground_level(...input.args)
      postMessage(output)
      break
    case 'getBlock':
      output.data = get_block(...input.args)
      postMessage(output)
      break
    case 'getPatch':
      output.data = get_patch(...input.args)
      postMessage(output)
      break
    case 'getChunk':
      output.data = get_chunk(...input.args)
      postMessage(output)
      break
    case 'updateCache':
      update_cache(...input.args).then(res => {
        output.data = res
        postMessage(output)
      })
      break
  }
})
