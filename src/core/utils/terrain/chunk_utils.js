import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'
import { BlockType, WorldCache, WorldUtils } from '@aresrpg/aresrpg-world'
import { Vector3, MathUtils, Box3 } from 'three'
import { LRUCache } from 'lru-cache'

import { world_patch_size } from './world_settings.js'

const dbg_highlight_patch_borders = false // debug only

const write_chunk_blocks = (
  chunk_data,
  chunk_bbox,
  block_local_pos,
  ground_type,
  buffer_over = [],
) => {
  const chunk_size = Math.round(Math.pow(chunk_data.length, 1 / 3))

  let written_blocks_count = 0

  const level = MathUtils.clamp(
    block_local_pos.y + buffer_over.length,
    chunk_bbox.min.y,
    chunk_bbox.max.y,
  )
  let buff_index = Math.max(level - block_local_pos.y, 0)
  let h = level - chunk_bbox.min.y // local height
  // debug_mode && is_edge(local_pos.z, local_pos.x, h, patch_size - 2)
  //   ? BlockType.SAND
  //   : block_cache.type

  while (h >= 0) {
    const blocks_index =
      block_local_pos.z * Math.pow(chunk_size, 2) +
      h * chunk_size +
      block_local_pos.x
    const block_type = buff_index > 0 ? buffer_over[buff_index] : ground_type
    const skip =
      buff_index > 0 &&
      chunk_data[blocks_index] !== undefined &&
      !buffer_over[buff_index]
    if (!skip) {
      chunk_data[blocks_index] = block_type
        ? voxelmapDataPacking.encode(false, block_type)
        : voxelmapDataPacking.encodeEmpty()
      block_type && written_blocks_count++
    }
    buff_index--
    h--
  }
  return written_blocks_count
}

const edges_blocks_pass = (chunk_data, chunk_box) => {
  const dimensions = chunk_box.getSize(new Vector3())
  const patch_size = dimensions.x
  for (let i = 0; i < patch_size; i++) {
    const xmin = {
      global_pos: new Vector3(chunk_box.min.x, 0, chunk_box.min.z + i),
      local_pos: new Vector3(0, 0, i),
    }
    const xmax = {
      global_pos: new Vector3(chunk_box.max.x, 0, chunk_box.min.z + i),
      local_pos: new Vector3(patch_size - 1, 0, i),
    }
    const zmin = {
      global_pos: new Vector3(chunk_box.min.x + i, 0, chunk_box.min.z),
      local_pos: new Vector3(i, 0, 0),
    }
    const zmax = {
      global_pos: new Vector3(chunk_box.min.x + i, 0, chunk_box.max.z),
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
        write_chunk_blocks(
          chunk_data,
          chunk_box,
          block_local_pos,
          block_data.type,
        )
      } else {
        // console.log(bbox, edges, patch_size)
        // console.log('missing block: ', edge.global_pos)
      }
    })
  }
}

const fill_ground_data = (blocks_container, chunk_data, chunk_box) => {
  let written_blocks_count = 0
  const blocks_iter = blocks_container.iterBlocks(true, false)
  for (const block of blocks_iter) {
    const block_local_pos = block.pos
    block_local_pos.x += 1
    // block_local_pos.y = patch.bbox.max.y
    block_local_pos.z += 1
    let border_type
    if (dbg_highlight_patch_borders) {
      if (block_local_pos.x === 1 || block_local_pos.z === 1) {
        // border_type = patch.isTransitionPatch ? BlockType.SAND : BlockType.WATER
        // border_type = patch.isBiomeTransition ? BlockType.MUD : border_type
        border_type = BlockType.SAND
      }
    }
    const block_type = border_type || block.type
    written_blocks_count += write_chunk_blocks(
      chunk_data,
      chunk_box,
      block_local_pos,
      block_type,
    )
  }
  return written_blocks_count
}

const fill_entities_data = (blocks_container, chunk_data, chunk_box) => {
  let written_blocks_count = 0
  // iter over container entities
  for (const entity_chunk of blocks_container.entitiesChunks) {
    // const { min, max } = entity_chunk.bbox
    // const bmin = new Vector3(...Object.values(min))
    // const bmax = new Vector3(...Object.values(max))
    // const entity_bbox = new Box3(bmin, bmax)
    // find overlapping blocks between entity and container
    const blocks_iter = blocks_container.getBlocks(entity_chunk.bbox, true)
    let chunk_index = 0
    // iter over entity blocks
    for (const block of blocks_iter) {
      const buffer_str = entity_chunk.data[chunk_index]
      const buffer =
        buffer_str.length > 0 &&
        buffer_str.split(',').map(char => parseInt(char))
      if (buffer.length > 0) {
        block.buffer = buffer
        block.localPos.x += 1
        block.localPos.z += 1
        // bmin.y = block.localPos.y
        written_blocks_count += write_chunk_blocks(
          chunk_data,
          chunk_box,
          block.localPos,
          block.type,
          block.buffer,
        )
      }
      chunk_index++
    }
  }
  return written_blocks_count
}

export const get_chunk_bbox = chunk_id => {
  const bmin = chunk_id.clone().multiplyScalar(world_patch_size)
  const bmax = chunk_id.clone().addScalar(1).multiplyScalar(world_patch_size)
  const chunk_bbox = new Box3(bmin, bmax)
  chunk_bbox.expandByScalar(1)
  return chunk_bbox
}

export function make_chunk(blocks_container, chunk_id) {
  const chunk_box = get_chunk_bbox(chunk_id)
  const final_chunk = make_custom_chunk(blocks_container, chunk_box)
  final_chunk.id = chunk_id
  return final_chunk
}

export function make_custom_chunk(blocks_container, chunk_box) {
  const chunk_dims = chunk_box.getSize(new Vector3())
  const chunk_data = new Uint16Array(chunk_dims.x * chunk_dims.y * chunk_dims.z)
  let total_written_blocks_count = 0
  // const debug_mode = true

  // const is_edge = (row, col, h, patch_size) =>
  //   row === 1 || row === patch_size || col === 1 || col === patch_size
  // || h === 1
  // || h === patch_size - 2

  // const patch = PatchBlocksCache.instances.find(
  //   patch =>
  //     patch.bbox.min.x === bbox.min.x + 1 &&
  //     patch.bbox.min.z === bbox.min.z + 1 &&
  //     patch.bbox.max.x === bbox.max.x - 1 &&
  //     patch.bbox.max.z === bbox.max.z - 1 &&
  //     patch.bbox.intersectsBox(bbox),
  // )

  // multi-pass chunk filling
  if (blocks_container) {
    // ground pass
    total_written_blocks_count += fill_ground_data(
      blocks_container,
      chunk_data,
      chunk_box,
    )
    // overground entities pass
    total_written_blocks_count += fill_entities_data(
      blocks_container,
      chunk_data,
      chunk_box,
    )
    // extra blocks at edges from adjacent patches
    edges_blocks_pass(chunk_data, chunk_box)
  }
  // const size = Math.round(Math.pow(chunk.data.length, 1 / 3))
  // const dimensions = new Vector3(size, size, size)
  const chunk = {
    data: chunk_data,
    size: chunk_dims,
    isEmpty: total_written_blocks_count === 0,
  }
  return chunk
}

export function gen_chunk_ids(patch, ymin, ymax) {
  const chunk_ids = []
  if (patch) {
    for (let y = ymax; y >= ymin; y--) {
      const chunk_coords = WorldUtils.asVect3(patch.coords, y)
      chunk_ids.push(chunk_coords)
    }
  }
  return chunk_ids
}

function memoize_ground_block() {
  const existing_groundblock_requests = new Map()
  const ground_block_cache = new LRUCache({ max: 1000 })

  return pos => {
    const x = Math.floor(pos.x)
    const z = Math.floor(pos.z)
    const key = `${x}:${z}`

    // Check if the result is already in the cache
    if (ground_block_cache.has(key)) {
      // console.log('groundblock cache hit', { x, z })
      return ground_block_cache.get(key)
    }

    // Check if a request for this key is already in progress
    if (existing_groundblock_requests.has(key)) {
      console.log('promise already exist', { x, z })
      return existing_groundblock_requests.get(key)
    }

    // Create a new ground block request
    const ground_pos = new Vector3(x, 0, z)
    const ground_block = WorldCache.getGroundBlock(ground_pos)

    // If it's a promise, handle it accordingly
    if (ground_block instanceof Promise) {
      existing_groundblock_requests.set(key, ground_block)

      // Once the promise resolves, store it in the cache and remove from in-progress map
      ground_block
        .then(block => {
          ground_block_cache.set(key, block)
          existing_groundblock_requests.delete(key)
        })
        .catch(() => {
          existing_groundblock_requests.delete(key)
        })
    } else {
      // If it's not a promise, store it directly in the cache
      ground_block_cache.set(key, ground_block)
    }

    // Store the request in the map and return the ground block (or promise)
    existing_groundblock_requests.set(key, ground_block)
    return ground_block
  }
}

const request_ground_block = memoize_ground_block()

function get_ground_block({ x, z }, entity_height) {
  const ground_block = request_ground_block({ x, z })
  const parse_block = ({ pos }) => Math.ceil(pos.y + 1) + entity_height * 0.5

  if (ground_block instanceof Promise) return ground_block.then(parse_block)

  return parse_block(ground_block)
}

// those 2 functions allows for better typings instead of using param options

export async function get_terrain_height({ x, z }, entity_height = 0) {
  return get_ground_block({ x, z }, entity_height)
}

export function get_optional_terrain_height({ x, z }, entity_height = 0) {
  const ground_block = get_ground_block({ x, z }, entity_height)

  // the height won't always be there
  if (ground_block instanceof Promise) return null

  return ground_block
}
