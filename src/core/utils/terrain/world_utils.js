import { BoardHandler, voxelmapDataPacking } from '@aresrpg/aresrpg-engine'
import {
  BlockMode,
  BlockType,
  BoardContainer,
  WorldCacheContainer,
  WorldComputeProxy,
  WorldConf,
  WorldUtils,
} from '@aresrpg/aresrpg-world'
import { Box2, Vector2, Vector3 } from 'three'
import { LRUCache } from 'lru-cache'
import * as BoardUtils from '@aresrpg/aresrpg-sdk/board_utils'

/**
 * Ground height helpers
 */

const blocks_cache_radius = Math.pow(2, 3) // 8 blocks
// minimal batch size to avoid flooding with too many blocks requests
const blocks_cache_min_batch_size = Math.pow(2 * blocks_cache_radius, 2) / 4 // 16*16/4 = 256/4 = 64 blocks batch
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
  return WorldComputeProxy.instance.computeBlocksBatch(block_pos_batch)
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
    if (
      requested_keys.length > blocks_cache_min_batch_size ||
      !ground_block_cache.has(key)
    ) {
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

export const chunk_data_encoder = (val, mode = BlockMode.DEFAULT) =>
  val
    ? voxelmapDataPacking.encode(mode === BlockMode.BOARD_CONTAINER, val)
    : voxelmapDataPacking.encodeEmpty()

// export const board_voxel_data_encoder = val =>
//   val
//     ? voxelmapDataPacking.encode(true, val)
//     : voxelmapDataPacking.encodeEmpty()

export const to_engine_chunk_format = world_chunk => {
  const id = WorldUtils.parseChunkKey(world_chunk.key)
  const chunk_bbox = WorldUtils.chunkBoxFromId(id, WorldConf.patchSize) // voxelmap_viewer.getPatchVoxelsBox(id)
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
  view_center = WorldUtils.asVect2(view_center)
  const view_dims = new Vector2(view_radius, view_radius).multiplyScalar(2)
  const view_box = new Box2().setFromCenterAndSize(view_center, view_dims)
  // const is_visible_patch = patch_bbox =>
  //   WorldUtils.asVect2(patch_bbox.getCenter(new Vector3())).distanceTo(
  //     view_center,
  //   ) <= view_radius
  // Query patches around player
  const changes = await WorldCacheContainer.instance.refresh(
    view_box,
    // is_visible_patch,
  )
  const changes_count = Object.keys(changes).length
  if (changes_count > 0) {
    const update_batch = Object.keys(changes).filter(key => changes[key])
    // console.log(
    //   `batch size: ${update_batch.length} (total cache size ${WorldCacheContainer.instance.count})`,
    // )
    // retrieve patches from cache or compute them on the fly
    const patches_changes =
      !on_the_fly && WorldCacheContainer.instance.builtInCache
        ? WorldCacheContainer.instance.availablePatches
        : WorldComputeProxy.instance.iterPatchCompute(update_batch)
    return patches_changes
  }
  return []
}

/**
 * BOARDS
 */

// board config
const board_params = {
  radius: 32,
  thickness: 4,
}

export const setup_board_container = async current_pos => {
  const board_container = new BoardContainer(current_pos, board_params)
  await board_container.make()
  const board_data_export = board_container.exportBoardData()
  // translate to board hanlder format
  const squares = board_data_export.data.map(element =>
    BoardUtils.format_board_data(element),
  )
  const board = { ...board_data_export, squares }
  board.size = new Vector2(board_data_export.size.y, board_data_export.size.x)
  if (board.data.length > 0) {
    const board_handler = new BoardHandler({ board })

    const border_blocks = BoardUtils.extract_border_blocks(board_data_export)
    const border_elements = border_blocks.map(block =>
      BoardUtils.format_board_data(block.data),
    )
    board_handler.clearSquares()
    // TODO: DEBUG line crashing below
    // board_handler.displaySquares(border_elements, new Color(0x00ff00))
    highlight_board_edges(board_data_export, board_container)
    highlight_start_pos(board_data_export, board_container)
  }
  return board_container
}

export const highlight_board_blocks = (
  board_elements,
  board_container,
  highlight_color,
) => {
  for (const item of board_elements) {
    if (item) {
      const block = board_container.getBlock(
        WorldUtils.parseThreeStub(item.pos),
      )
      if (block) {
        block.data.type = highlight_color
        block.data.mode = BlockMode.DEFAULT
        board_container.setBlock(block.pos, block.data)
      }
    } else {
      console.warn(`unexpected `, board_elements)
    }
  }
}

export const highlight_board_edges = (board_data, board_container) => {
  const border_blocks = BoardUtils.extract_border_blocks(board_data)
  const sorted_border_blocks = BoardUtils.sort_by_side(
    border_blocks,
    board_data,
  )
  highlight_board_blocks(
    sorted_border_blocks.first,
    board_container,
    BlockType.DBG_GREEN,
  )
  highlight_board_blocks(
    sorted_border_blocks.second,
    board_container,
    BlockType.DBG_LIGHT,
  )
}

export const highlight_start_pos = (board_data, board_container) => {
  const board_items = BoardUtils.iter_board_data(board_data)
  const sorted_board_items = BoardUtils.sort_by_side(board_items, board_data)
  const sorted_start_pos = {}
  sorted_start_pos.first = BoardUtils.random_select_items(
    sorted_board_items.first,
    6,
  )
  sorted_start_pos.second = BoardUtils.random_select_items(
    sorted_board_items.second,
    6,
  )

  highlight_board_blocks(
    sorted_start_pos.first,
    board_container,
    BlockType.DBG_ORANGE,
  )
  highlight_board_blocks(
    sorted_start_pos.second,
    board_container,
    BlockType.DBG_PURPLE,
  )
}
