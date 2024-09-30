import { BoardHandler, voxelmapDataPacking } from '@aresrpg/aresrpg-engine'
import {
  BlockMode,
  BlockType,
  BoardContainer,
  WorldComputeProxy,
  WorldConf,
  WorldUtils,
} from '@aresrpg/aresrpg-world'
import { Color, Vector3 } from 'three'
import { LRUCache } from 'lru-cache'
import * as BoardUtils from '@aresrpg/aresrpg-sdk/board'

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
  const chunk_bbox = WorldUtils.chunkBoxFromKey(
    world_chunk.key,
    WorldConf.defaultChunkDimensions,
  ) // voxelmap_viewer.getPatchVoxelsBox(id)
  chunk_bbox.expandByScalar(1)
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

export const export_chunk_to_zyx_format = world_chunk => {
  // const dimensions = chunkBox.getSize(new Vector3())
  // const getTargetIndex = (localPos) => localPos.z * dimensions.x * dimensions.y +
  //   localPos.y * dimensions.x +
  //   localPos.x
  // read yBuffer at z,x pos
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
  const native_board = board_container.exportBoardData()
  const board_origin = WorldUtils.asVect2(native_board.origin)
  // translate to board hanlder format
  const squares = native_board.data.map(element =>
    BoardUtils.format_board_data(element),
  )
  const board = { ...native_board, squares }
  board.size = { x: native_board.size.x, z: native_board.size.y }
  board.origin.y++ // TODO: check where comes the issue

  if (board.data.length > 0) {
    const board_handler = new BoardHandler({ board })
    board_handler.clearSquares()
    highlight_board_edges(board_handler)
    highlight_start_pos(board_handler)
    return { board_container, board_handler }
  }
}

export const highlight_board_edges = board_handler => {
  const to_local_pos = pos => ({
    x: pos.x - board_handler.board.origin.x,
    z: pos.y - board_handler.board.origin.z,
  })
  const border_blocks = BoardUtils.extract_border_blocks(board_handler.board)
  const sorted_border_blocks = BoardUtils.sort_by_side(
    border_blocks,
    board_handler.board,
  )
  const first_player_side = sorted_border_blocks.first.map(block =>
    to_local_pos(block.pos),
  )
  const second_player_side = sorted_border_blocks.second.map(block =>
    to_local_pos(block.pos),
  )
  board_handler.displaySquares(first_player_side, new Color(0x0000ff))
  board_handler.displaySquares(second_player_side, new Color(0x00ff00))
}

export const highlight_start_pos = board_handler => {
  const to_local_pos = pos => ({
    x: pos.x - board_handler.board.origin.x,
    z: pos.y - board_handler.board.origin.z,
  })
  const board_items = BoardUtils.iter_board_data(board_handler.board)
  const sorted_board_items = BoardUtils.sort_by_side(
    board_items,
    board_handler.board,
  )
  const sorted_start_pos = {}
  sorted_start_pos.first = BoardUtils.random_select_items(
    sorted_board_items.first,
    6,
  )
  sorted_start_pos.second = BoardUtils.random_select_items(
    sorted_board_items.second,
    6,
  )
  const first_player_side = sorted_start_pos.first.map(block =>
    to_local_pos(block.pos),
  )
  const second_player_side = sorted_start_pos.second.map(block =>
    to_local_pos(block.pos),
  )
  board_handler.displaySquares(first_player_side, new Color(0x0000ff))
  board_handler.displaySquares(second_player_side, new Color(0x00ff00))
}
