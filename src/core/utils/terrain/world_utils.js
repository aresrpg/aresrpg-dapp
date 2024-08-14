import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'
import {
  BlocksContainer,
  BoardContainer,
  PlateauLegacy,
  WorldCacheContainer,
  WorldComputeApi,
  WorldUtils,
} from '@aresrpg/aresrpg-world'
import { Box3, Vector3 } from 'three'
import { LRUCache } from 'lru-cache'

import { world_patch_size } from './world_settings.js'

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
    const ground_block = WorldComputeApi.instance
      .computeBlocksBatch([ground_pos])
      .then(res => res[0])

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
  // FIXME
  return 140 // get_ground_block({ x, z }, entity_height)
}

export function get_optional_terrain_height({ x, z }, entity_height = 0) {
  // FIXME
  // const ground_block = get_ground_block({ x, z }, entity_height)

  // // the height won't always be there
  // if (ground_block instanceof Promise) return null

  return 140 // ground_block
}

const chunk_data_encode = world_chunk_data => {
  const engine_chunk_data = []
  // convert chunk data to engine format
  world_chunk_data.forEach(
    (val, i) =>
      (engine_chunk_data[i] = val
        ? voxelmapDataPacking.encode(false, val)
        : voxelmapDataPacking.encodeEmpty()),
  )
  return engine_chunk_data
}

export const convert_to_engine_chunk = world_chunk => {
  const id = WorldUtils.parseChunkKey(world_chunk.key)
  const chunk_bbox = WorldUtils.getBboxFromChunkId(id, world_patch_size) // voxelmap_viewer.getPatchVoxelsBox(id)
  const size = chunk_bbox.getSize(new Vector3())
  const data = world_chunk.data ? chunk_data_encode(world_chunk.data) : []
  const engine_chunk = {
    id,
    data,
    isEmpty: !world_chunk.data,
    size,
  }
  return engine_chunk
}

export const make_board = player_position => {
  const board_container = new BoardContainer(player_position, 48)
  board_container.populateFromExisting(
    WorldCacheContainer.instance.availablePatches,
    true,
  )
  board_container.shapeBoard()
  return board_container
}

export const make_legacy_board = async player_position => {
  const board_struct = await PlateauLegacy.computePlateau(player_position)

  const board_dims = new Vector3(board_struct.size.x, 0, board_struct.size.z)
  const board_end = board_struct.origin.clone().add(board_dims)
  const board_box = new Box3(board_struct.origin, board_end)
  // prepare board
  const board_blocks_container = new BlocksContainer(board_box, 0)
  const size = Math.sqrt(board_struct.squares.length)
  const { min, max } = board_blocks_container.bbox
  board_struct.squares.forEach((v, i) => {
    const z = Math.floor(i / size)
    const x = i % size
    const index = z + size * x
    const block_level = v.floorY || 0
    const block_type = v.materialId
    board_blocks_container.groundBlocks.level[index] = block_level
    board_blocks_container.groundBlocks.type[index] = block_type
    min.y = block_level > 0 ? Math.min(min.y, block_level) : min.y
    max.y = Math.max(max.y, block_level)
  })
  const y_diff = max.y - min.y
  min.y += Math.round(y_diff / 2)
  // create container covering board area filled with patches from cache

  const board_container = new BoardContainer(board_box)
  board_container.fillFromPatches(
    WorldCacheContainer.instance.availablePatches,
    true,
  )
  // merge with board blocks
  board_container.mergeBoardBlocks(board_blocks_container)
  return board_container
}
