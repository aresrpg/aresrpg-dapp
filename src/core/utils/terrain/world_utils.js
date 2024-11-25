import {
  BoardOverlaysHandler,
  voxelmapDataPacking,
} from '@aresrpg/aresrpg-engine'
import {
  BlockMode,
  BlockType,
  GroundCache,
  WorldUtils,
} from '@aresrpg/aresrpg-world'
import { Color, Vector2, Vector3 } from 'three'
import * as FightBoards from '@aresrpg/aresrpg-sdk/fight'

// import * as WorldUtils from '@aresrpg/aresrpg-world/worldUtils'
import { color_to_block_type, hex_to_int } from './world_settings.js'
const cache_query_params = { cacheMissing: true, precacheRadius: 10 }

/**
 * Sync or async ground height
 * @param {*} pos vector 2
 * @returns ground height if available or promise if block not yet in cache
 */
export function get_ground_height(pos) {
  const ground_block = GroundCache.instance.queryPrecachedBlock(
    pos,
    cache_query_params,
  )
  return ground_block instanceof Promise
    ? ground_block.then(block => block?.pos.y ?? 100)
    : ground_block.pos.y
}

/**
 * Sync only
 * @param {*} param0
 * @param {*} entity_height
 * @returns height if in cache or NaN
 */
export function get_ground_height_sync({ x, z }, entity_height = 0) {
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
export async function get_ground_height_async({ x, z }, entity_height = 0) {
  const ground_height = await get_ground_height(new Vector2(x, z))
  return ground_height + entity_height * 0.5
}

export function map_blocks_to_type(biome) {
  return Object.entries(biome).reduce((acc, [key, value]) => {
    // Check if type and subtype are numbers (color or BlockType IDs)
    const type =
      typeof value.type === 'string'
        ? color_to_block_type[hex_to_int(value.type)]
        : value.type
    const subtype =
      typeof value.subtype === 'string'
        ? color_to_block_type[hex_to_int(value.subtype)]
        : value.subtype

    // If we get undefined, fallback to original value (in case mapping fails)
    return {
      ...acc,
      [key]: {
        ...value,
        type: type !== undefined ? type : value.type,
        subtype: subtype !== undefined ? subtype : value.subtype,
      },
    }
  }, {})
}

/**
 * Chunks
 */

export const chunk_data_encoder = (val, mode = BlockMode.DEFAULT) =>
  val
    ? voxelmapDataPacking.encode(mode === BlockMode.BOARD_CONTAINER, val)
    : voxelmapDataPacking.encodeEmpty()

export const to_engine_chunk_format = world_chunk => {
  const { id } = world_chunk
  const is_empty = world_chunk.rawData.reduce((sum, val) => sum + val, 0) === 0
  const size = world_chunk.extendedDims
  const data = is_empty ? [] : world_chunk.rawData
  const voxels_chunk_data = {
    data,
    isEmpty: is_empty,
    size,
    dataOrdering: 'zxy',
  }
  const engine_chunk = {
    id,
    voxels_chunk_data,
  }
  return engine_chunk
}

/**
 * Board
 */

export const build_board_chunk = (board_patch, board_chunk) => {
  // process internal board items buffers
  // board ground buffer
  const ground_otf_gen = board_patch.groundBufferOtfGen(
    board_chunk.extendedBounds,
  )
  const board_level = board_patch.parentContainer.boardElevation
  // iter board chunk buffer

  for (const ground_buffer of ground_otf_gen) {
    const { pos, buffer } = ground_buffer
    const chunk_buffer = board_chunk.readBuffer(pos)
    chunk_buffer.set(buffer)
    board_chunk.writeBuffer(pos, chunk_buffer)
  }
  // const level = board_level + 1
  if (
    board_chunk.bounds.min.y <= board_level &&
    board_chunk.bounds.max.y >= board_level
  ) {
    for (const item_pos of board_patch.boardItems) {
      const pos = WorldUtils.asVect3(item_pos, board_level)
      const local_pos = board_chunk.toLocalPos(pos)
      const index = board_chunk.getIndex(local_pos)
      board_chunk.writeBlockData(index, BlockType.TRUNK)
    }
  }
}

export const highlight_board = board_content => {
  // const board_container = new BoardContainer(current_pos, radius, thickness)
  // board_container.rebuildIndexAroundPosAndRad(current_pos)
  // await board_container.build()
  // const native_board = board_container.exportBoardData()
  // const board_origin = WorldUtils.asVect2(board_container.origin)
  if (board_content.data.length > 0) {
    // convert to board hanlder format
    const board_size = board_content.bounds.getSize(new Vector2())
    const size = { x: board_size.x, z: board_size.y }
    const origin = WorldUtils.asVect3(
      board_content.bounds.min,
      board_content.elevation,
    )
    const squares = board_content.data.map(element =>
      FightBoards.format_board_data(element),
    )
    const board = { origin, size, squares }

    const board_handler = new BoardOverlaysHandler({ board })
    board_handler.clearSquares()
    highlight_board_edges(board_handler, board_content)
    highlight_start_pos(board_handler, board_content)
    return board_handler
  }
}

export const highlight_board_edges = (board_handler, board_content) => {
  const board_bounds = board_content.bounds
  const to_local_pos = pos => ({
    x: pos.x - board_bounds.min.x,
    z: pos.y - board_bounds.min.y,
  })
  const border_blocks = FightBoards.extract_border_blocks(board_content)
  const sorted_border_blocks = FightBoards.sort_by_side(
    border_blocks,
    board_content,
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

export const highlight_start_pos = (board_handler, board_content) => {
  const board_bounds = board_content.bounds
  const to_local_pos = pos => ({
    x: pos.x - board_bounds.min.x,
    z: pos.y - board_bounds.min.y,
  })
  const board_items = FightBoards.iter_board_data(board_content)
  const sorted_board_items = FightBoards.sort_by_side(
    board_items,
    board_content,
  )
  const sorted_start_pos = {}
  sorted_start_pos.first = FightBoards.random_select_items(
    sorted_board_items.first,
    6,
  )
  sorted_start_pos.second = FightBoards.random_select_items(
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
