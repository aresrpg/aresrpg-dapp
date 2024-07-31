import { BlockType, WorldCache } from '@aresrpg/aresrpg-world'
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
    edges.forEach(async edge => {
      const block_data = await WorldCache.getGroundBlock(
        edge.global_pos.clone(),
      )
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
  const iter = patch.iterBlocks(true)
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
  const patch_bis = WorldCache.getPatch(patch.bbox.getCenter(new Vector3()))
  const patch_start = patch.bbox.min

  for (const entity_chunk of patch.entitiesChunks) {
    const { min, max } = entity_chunk.bbox
    const bmin = new Vector3(...Object.values(min))
    const bmax = new Vector3(...Object.values(max))
    const entity_bbox = new Box3(bmin, bmax)
    const blocks_iter = patch.getBlocks(entity_chunk.bbox, true)
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
        bmin.y = block.localPos.y
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

export function fill_chunk_from_patch(patch, chunk_bbox) {
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

function get_patch_chunk_ids(patch_key) {
  const chunk_ids = []
  const patch = WorldCache.patchLookupIndex[patch_key]
  if (patch) {
    for (let i = 6; i >= 0; i--) {
      const chunk_coords = new Vector3(patch.coords.x, i, patch.coords.y)
      chunk_ids.push(chunk_coords)
    }
  }
  return chunk_ids
}

export function get_chunks_indices(patch_keys) {
  // build chunk index
  const patch_chunks_index = {}
  // Object.values(WorldCache.patchLookupIndex)
  const chunks_indices = patch_keys
    .map(patch_key => get_patch_chunk_ids(patch_key))
    .flat()
  return chunks_indices
}

export function get_patch_chunks(patch_key) {
  const patch = WorldCache.patchLookupIndex[patch_key]
  const chunks_ids = get_patch_chunk_ids(patch_key)
  const chunks = chunks_ids.map(chunk_coords => {
    const bmin = chunk_coords.clone().multiplyScalar(world_patch_size)
    const bmax = chunk_coords
      .clone()
      .addScalar(1)
      .multiplyScalar(world_patch_size)
    const chunk_bbox = new Box3(bmin, bmax)
    chunk_bbox.expandByScalar(1)
    const data = fill_chunk_from_patch(patch, chunk_bbox)
    const size = Math.round(Math.pow(data.length, 1 / 3))
    const dimensions = new Vector3(size, size, size)
    const chunk = { id: chunk_coords, data, size: dimensions, isEmpty: false }
    return chunk
  })
  return chunks
}

export function get_terrain_height({ x, z }, entity_height = 0) {
  const ground_pos = new Vector3(Math.floor(x), 350, Math.floor(z))
  const { pos = ground_pos } = WorldCache.getGroundBlock(ground_pos) ?? {}
  return Math.ceil(pos.y + 1) + entity_height * 0.5
}
