import {
  BlockType,
  PatchBaseCache,
  PatchBlocksCache,
} from '@aresrpg/aresrpg-world'
import { Vector3, MathUtils, Box3 } from 'three'

import { world_patch_size } from './world_settings.js'

const dbg_highlight_patch_borders = false // debug only

const write_chunk_blocks = (
  chunk,
  block_pos,
  ground_type,
  buffer_over = [],
) => {
  const { bbox, cache } = chunk
  const dimensions = bbox.getSize(new Vector3())
  const patch_size = dimensions.x

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

const edges_blocks_pass = chunk => {
  const { bbox } = chunk
  const dimensions = bbox.getSize(new Vector3())
  const patch_size = dimensions.x
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
      const block_data = PatchBlocksCache.getBlock(edge.global_pos.clone())
      if (block_data) {
        const block_local_pos = edge.local_pos.clone()
        block_local_pos.y = block_data.pos.y
        write_chunk_blocks(chunk, block_local_pos, block_data.type)
      } else {
        // console.log(bbox, edges, patch_size)
        // console.log('missing block: ', edge.global_pos)
      }
    })
  }
}

const ground_blocks_pass = (patch, chunk) => {
  const iter = patch?.iterator(true)
  let res = iter.next()
  while (!res.done) {
    const block_data = res.value
    const block_pos = block_data.pos.clone()
    block_pos.x += 1
    block_pos.z += 1
    let border_type
    if (dbg_highlight_patch_borders) {
      if (block_pos.x === 1 || block_pos.z === 1) {
        border_type = patch.isTransitionPatch ? BlockType.SAND : BlockType.WATER
        border_type = patch.isBiomeTransition ? BlockType.MUD : border_type
      }
    }
    const block_type = border_type || block_data.type
    write_chunk_blocks(chunk, block_pos, block_type)
    res = iter.next()
  }
}

const entities_blocks_pass = (patch, chunk) => {
  const patch_bis = PatchBaseCache.getPatch(patch.bbox.getCenter(new Vector3()))
  const patch_start = patch.bbox.min

  for (const entity_chunk of patch.entitiesChunks) {
    const { min, max } = entity_chunk.bbox
    const bmin = new Vector3(...Object.values(min))
    const bmax = new Vector3(...Object.values(max))
    const entity_bbox = new Box3(bmin, bmax)
    const blocks_iter = patch.getBlocks(entity_chunk.bbox)
    let chunk_index = 0
    for (const block of blocks_iter) {
      const buffer_str = entity_chunk.data[chunk_index]
      const buffer =
        buffer_str.length > 0 &&
        buffer_str.split(',').map(char => parseInt(char))
      if (buffer.length > 0) {
        block.buffer = buffer
        block.localPos.x += 1
        block.localPos.z += 1
        write_chunk_blocks(chunk, block.localPos, block.type, block.buffer)
      }
      chunk_index++
    }
  }

  // const buff_iter = patch_bis.overBlocksIter()
  // for (const blk of buff_iter) {
  //   blk.localPos.x += 1
  //   blk.localPos.z += 1
  //   write_chunk_blocks(chunk, blk.localPos, blk.type, blk.buffer)
  // }
}

const fill_chunk_from_patch = (patch, chunk_bbox) => {
  const dimensions = chunk_bbox.getSize(new Vector3())
  const cache = new Uint16Array(dimensions.x * dimensions.y * dimensions.z)
  const chunk = { bbox: chunk_bbox, cache }
  // const debug_mode = true

  // const is_edge = (row, col, h, patch_size) =>
  //   row === 1 || row === patch_size || col === 1 || col === patch_size
  // || h === 1
  // || h === patch_size - 2

  let is_empty = true

  // const patch = PatchBlocksCache.instances.find(
  //   patch =>
  //     patch.bbox.min.x === bbox.min.x + 1 &&
  //     patch.bbox.min.z === bbox.min.z + 1 &&
  //     patch.bbox.max.x === bbox.max.x - 1 &&
  //     patch.bbox.max.z === bbox.max.z - 1 &&
  //     patch.bbox.intersectsBox(bbox),
  // )

  // multi-pass chunk filling
  if (patch) {
    // ground pass
    ground_blocks_pass(patch, chunk)
    // overground entities pass
    entities_blocks_pass(patch, chunk)
    // extra blocks at edges from adjacent patches
    edges_blocks_pass(chunk)
    is_empty = false
  }
  return chunk.cache
}

const feed_engine_with_chunks = patch_queue => {
  while (patch_queue.length) {
    const blocks_patch = patch_queue.pop()
    const bmin = new Vector3(...Object.values(blocks_patch.bbox.min))
    const bmax = new Vector3(...Object.values(blocks_patch.bbox.max))
    const patch_coords = bmin.clone().divideScalar(world_patch_size)
    const ymin = Math.floor(bmin.y / world_patch_size)
    let ymax = Math.floor(bmax.y / world_patch_size)
    ymax += bmax.y % world_patch_size > 0 ? 1 : 0
    for (let y = ymin; y < ymax; y++) {
      patch_coords.y = y
      bmin.y = y * world_patch_size
      bmax.y = (y + 1) * world_patch_size
      const bbox = new Box3(bmin, bmax).clone().expandByScalar(1)
      const chunk_data = fill_chunk_from_patch(blocks_patch, bbox)
      const size = Math.round(Math.pow(chunk_data.length, 1 / 3))
      const dimensions = new Vector3(size, size, size)
      const chunk = { data: chunk_data, size: dimensions, isEmpty: false }
      // perform engine call here
      // voxelmap_viewer.enqueuePatch(patch_coords, chunk)
    }
  }
}

export { fill_chunk_from_patch, feed_engine_with_chunks }
