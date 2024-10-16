import {
  BoardOverlaysHandler,
  voxelmapDataPacking,
} from '@aresrpg/aresrpg-engine'
import {
  BlockMode,
  BoardContainer,
  GroundCache,
  WorldConf,
  WorldUtils,
} from '@aresrpg/aresrpg-world'
import { Color, Vector2, Vector3 } from 'three'
import * as BoardUtils from '@aresrpg/aresrpg-sdk/board'
const cache_query_params = { cacheIfMissing: true, precacheRadius: 10 }

/**
 * Sync or async ground height
 * @param {*} pos vector 2
 * @returns ground height if available or promise if block not yet in cache
 */
export function get_ground_height(pos) {
  const ground_block = GroundCache.instance.queryBlock(pos, cache_query_params)
  return ground_block instanceof Promise
    ? ground_block.then(block => block.pos.y)
    : ground_block.pos.y
}

/**
 * Sync only
 * @param {*} param0
 * @param {*} entity_height
 * @returns height if in cache or NaN
 */
export function get_height({ x, z }, entity_height = 0) {
  const ground_height = get_ground_height(new Vector2(x, z))
  return ground_height instanceof Promise
    ? NaN
    : ground_height + entity_height * 0.5
}

/**
 * Async version
 * @param {*} param0
 * @param {*} entity_height
 * @returns async height
 */
export async function get_height_async({ x, z }, entity_height = 0) {
  const ground_height = await get_ground_height(new Vector2(x, z))
  return ground_height + entity_height * 0.5
}

/**
 * Chunks
 */

export const chunk_data_encoder = (val, mode = BlockMode.DEFAULT) =>
  val
    ? voxelmapDataPacking.encode(mode === BlockMode.BOARD_CONTAINER, val)
    : voxelmapDataPacking.encodeEmpty()

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
    dataOrdering: 'zxy',
  }
  return engine_chunk
}

/**
 * Boards
 */

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
    const board_handler = new BoardOverlaysHandler({ board })
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
