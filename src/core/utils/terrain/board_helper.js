import { Color, Vector2 } from 'three'
import { BoardOverlaysHandler } from '@aresrpg/aresrpg-engine'
import { WorldUtils } from '@aresrpg/aresrpg-world'
import * as FightBoards from '@aresrpg/aresrpg-sdk/fight'

export const init_board_handler = board_data => {
  if (board_data?.content.length > 0) {
    // convert to board hanlder format
    const board_size = board_data.bounds.getSize(new Vector2())
    const size = { x: board_size.x, z: board_size.y }
    const origin = WorldUtils.convert.asVect3(
      board_data.bounds.min,
      board_data.elevation,
    )
    const squares = []
    board_data.content.forEach(block_cat => {
      const square = {
        type: block_cat, // dummy
        category: Math.max(0, block_cat - 1),
      }
      squares.push(square)
    })
    const board = { origin, size, squares }
    const board_handler = new BoardOverlaysHandler({ board })
    return board_handler
  }
}

export const highlight_board_edges = (board_data, board_handler) => {
  const board_bounds = board_data.bounds
  const to_local_pos = pos => ({
    x: pos.x - board_bounds.min.x,
    z: pos.y - board_bounds.min.y,
  })
  const border_blocks = FightBoards.extract_border_blocks(board_data)
  const sorted_border_blocks = FightBoards.sort_by_side(
    border_blocks,
    board_data,
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

export const highlight_board_start_pos = (board_data, board_handler) => {
  const board_bounds = board_data.bounds
  const to_local_pos = pos => ({
    x: pos.x - board_bounds.min.x,
    z: pos.y - board_bounds.min.y,
  })
  const board_items = FightBoards.iter_board_data(board_data)
  const sorted_board_items = FightBoards.sort_by_side(board_items, board_data)
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
