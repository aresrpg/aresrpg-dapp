import { voxelmapDataPacking } from '@aresrpg/aresrpg-engine'
import {
  BoardContainer,
  WorldCacheContainer,
  WorldComputeApi,
  WorldUtils,
} from '@aresrpg/aresrpg-world'
import { Box3, Vector3 } from 'three'
import { LRUCache } from 'lru-cache'

import { world_patch_size } from './world_settings.js'

/**
 * Ground height helpers
 */

const blocks_cache_radius = Math.pow(2, 3)
// minimal batch size to avoid flooding with too many blocks requests
const blocks_cache_min_batch_size = Math.pow(2 * blocks_cache_radius, 2) / 2
/**
 *
 * @param {*} pos central block to request pos from
 * @param {*} cache_radius cache radius around requested block
 * @returns
 */
const get_block_and_neighbours_keys = (pos, cache_radius = 0) => {
  const block_pos = pos.floor() // WorldUtils.roundToDecAny(pos, 1)
  const main_key = `${block_pos.x}:${block_pos.z}`
  const block_keys = [main_key]
  for (
    let x = block_pos.x - cache_radius;
    x <= block_pos.x + cache_radius;
    x++
  ) {
    for (
      let z = block_pos.z - cache_radius;
      z <= block_pos.z + cache_radius;
      z++
    ) {
      const neighbour_key = `${x}:${z}`
      if (neighbour_key !== main_key) block_keys.push(neighbour_key)
    }
  }
  return block_keys
}

const request_blocks = block_keys => {
  // build batch
  const block_pos_batch = block_keys.map(key =>
    WorldUtils.asVect3(WorldUtils.parsePatchKey(key)),
  )
  // send batch for compute
  return WorldComputeApi.instance.computeBlocksBatch(block_pos_batch)
}

function memoize_ground_block() {
  const pending_block_requests = new Map()
  const ground_block_cache = new LRUCache({ max: 1000 })

  return ({ x, z }) => {
    const pos = new Vector3(x, 0, z)
    const [key, ...other_keys] = get_block_and_neighbours_keys(
      pos,
      blocks_cache_radius,
    )
    const requested_keys = [key, ...other_keys].filter(
      key => !ground_block_cache.has(key) && !pending_block_requests.has(key),
    )

    let req
    // Request all missing keys around block
    //
    if (requested_keys.length > blocks_cache_min_batch_size) {
      req = request_blocks(requested_keys)
      // pending_block_requests.set(missing_keys, req)
      req
        .then(([main_block, ...other_blocks]) => {
          ;[main_block, ...other_blocks].forEach((block, i) => {
            const key = requested_keys[i]
            // add to cache
            ground_block_cache.set(key, block)
            // remove original request from pending requests
            pending_block_requests.delete(key)
          })
          return main_block
        })
        .catch(() => {
          pending_block_requests.delete(key)
        })
      requested_keys.forEach(key => pending_block_requests.set(key, req))
    }

    return ground_block_cache.has(key)
      ? ground_block_cache.get(key)
      : pending_block_requests.get(key)
  }
}

const request_ground_block = memoize_ground_block()

function get_ground_block({ x, z }, entity_height) {
  const ground_block = request_ground_block({ x, z })
  const parse_block = ({ pos }) => {
    return pos && Math.ceil(pos.y + 1) + entity_height * 0.5
  }

  if (ground_block instanceof Promise) return ground_block.then(parse_block)

  return parse_block(ground_block)
}

// those 2 functions allows for better typings instead of using param options

export async function get_terrain_height({ x, z }, entity_height = 0) {
  return get_ground_block({ x, z }, entity_height)
}

export function get_optional_terrain_height({ x, z }, entity_height = 0) {
  const ground_block = get_ground_block({ x, z }, entity_height)
  return ground_block instanceof Promise ? null : ground_block
}

/**
 * Chunks conversions
 */

export const chunk_data_encoder = (val, i) =>
  val
    ? voxelmapDataPacking.encode(false, val)
    : voxelmapDataPacking.encodeEmpty()

// export const board_voxel_data_encoder = val =>
//   val
//     ? voxelmapDataPacking.encode(true, val)
//     : voxelmapDataPacking.encodeEmpty()

export const to_engine_chunk_format = world_chunk => {
  const id = WorldUtils.parseChunkKey(world_chunk.key)
  const chunk_bbox = WorldUtils.getBboxFromChunkId(id, world_patch_size) // voxelmap_viewer.getPatchVoxelsBox(id)
  const size = chunk_bbox.getSize(new Vector3())
  const data = world_chunk.data ? world_chunk.data : []
  const engine_chunk = {
    id,
    data,
    isEmpty: !world_chunk.data,
    size,
  }
  return engine_chunk
}

/**
 * World patch baking
 */

export const get_patches_changes = async (
  view_center,
  view_radius,
  on_the_fly = true,
) => {
  const view_dims = new Vector3(
    view_radius,
    view_radius,
    view_radius,
  ).multiplyScalar(2)
  const view_box = new Box3().setFromCenterAndSize(view_center, view_dims)
  const is_visible_patch = patch_bbox =>
    WorldUtils.asVect2(patch_bbox.getCenter(new Vector3())).distanceTo(
      WorldUtils.asVect2(view_center),
    ) <= view_radius
  // Query patches around player
  const changes = await WorldCacheContainer.instance.refresh(
    view_box,
    is_visible_patch,
  )
  const changes_count = Object.keys(changes).length
  if (changes_count > 0) {
    const update_batch = Object.keys(changes).filter(key => changes[key])
    console.log(
      `batch size: ${update_batch.length} (total cache size ${WorldCacheContainer.instance.count})`,
    )
    // retrieve patches from cache or compute them on the fly
    const patches_changes =
      !on_the_fly && WorldCacheContainer.instance.builtInCache
        ? WorldCacheContainer.instance.availablePatches
        : WorldComputeApi.instance.iterPatchCompute(update_batch)
    return patches_changes
  }
  return []
}

/**
 * Battle boards
 */

export const make_board = player_position => {
  const board_container = new BoardContainer(player_position, 32)
  board_container.populateFromExisting(
    WorldCacheContainer.instance.availablePatches,
    true,
  )
  board_container.shapeBoard()
  return board_container
}

// export const make_legacy_board = async player_position => {
//   const board_struct = await PlateauLegacy.computePlateau(player_position)

//   const board_dims = new Vector3(board_struct.size.x, 0, board_struct.size.z)
//   const board_end = board_struct.origin.clone().add(board_dims)
//   const board_box = new Box3(board_struct.origin, board_end)
//   // prepare board
//   const board_blocks_container = new BlocksContainer(board_box, 0)
//   const size = Math.sqrt(board_struct.squares.length)
//   const { min, max } = board_blocks_container.bbox
//   board_struct.squares.forEach((v, i) => {
//     const z = Math.floor(i / size)
//     const x = i % size
//     const index = z + size * x
//     const block_level = v.floorY || 0
//     const block_type = v.materialId
//     board_blocks_container.groundBlocks.level[index] = block_level
//     board_blocks_container.groundBlocks.type[index] = block_type
//     min.y = block_level > 0 ? Math.min(min.y, block_level) : min.y
//     max.y = Math.max(max.y, block_level)
//   })
//   const y_diff = max.y - min.y
//   min.y += Math.round(y_diff / 2)
//   // create container covering board area filled with patches from cache

//   const board_container = new BoardContainer(board_box)
//   board_container.fillFromPatches(
//     WorldCacheContainer.instance.availablePatches,
//     true,
//   )
//   // merge with board blocks
//   board_container.mergeBoardBlocks(board_blocks_container)
//   return board_container
// }
