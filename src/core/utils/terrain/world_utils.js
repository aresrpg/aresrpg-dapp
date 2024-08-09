import { WorldCache } from '@aresrpg/aresrpg-world'
import { Vector3 } from 'three'
import { LRUCache } from 'lru-cache'

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
