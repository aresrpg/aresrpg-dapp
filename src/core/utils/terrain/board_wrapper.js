import { Box2, Color, Vector2, Vector3 } from 'three'
import { BoardOverlaysHandler } from '@aresrpg/aresrpg-engine'
import {
  BoardContainer,
  ChunkContainer,
  WorldUtils,
} from '@aresrpg/aresrpg-world'
import * as FightBoards from '@aresrpg/aresrpg-sdk/fight'

import { chunk_data_encoder } from './world_utils.js'

export class BoardWrapper {
  pos
  bounds
  container
  handler
  content
  scene

  constructor() {
    this.container = new BoardContainer()
    this.pos = new Vector3(0, 0, 0)
    this.bounds = new Box2()
  }

  async *update(current_pos) {
    if (this.pos.distanceTo(current_pos) > 1) {
      // board_chunks_container.boardCenter = current_pos
      await this.container.localCache.cacheAroundPos(current_pos)
      // fill board buffer from cache
      const board_buffer = this.container.genBoardBuffer(current_pos)
      // iter board indexed chunks
      for (const cached_data of this.container.localCache.cachedData) {
        // board_chunk.rawData.fill(113)
        const board_chunk = cached_data.groundChunk
        const target_chunk = new ChunkContainer(
          board_chunk.chunkKey,
          board_chunk.margin,
        )
        board_chunk.rawData.forEach(
          (val, i) => (target_chunk.rawData[i] = chunk_data_encoder(val)),
        )
        // board_chunk_copy.rawData.set(board_chunk.rawData)
        // cached_data.itemsChunks
        //   .filter(chunk => chunk)
        //   .forEach(itemChunk =>
        //     ChunkContainer.copySourceToTarget(itemChunk, target_chunk),
        //   )
        ChunkContainer.copySourceToTarget(board_buffer, target_chunk, false)
        // const board_chunk_mask = board_chunk.genBoardMask()
        // board_chunk_mask.applyMaskOnTargetChunk(board_chunk_copy)
        yield target_chunk
      }
      // remember bounds for later board removal
      this.bounds = this.container.boardBounds
      this.pos = current_pos
    }
  }

  highlight = () => {
    // const board_container = new BoardContainer(current_pos, radius, thickness)
    // board_container.rebuildIndexAroundPosAndRad(current_pos)
    // await board_container.build()
    // const native_board = board_container.exportBoardData()
    // const board_origin = WorldUtils.asVect2(board_container.origin)
    if (this.content.data.length > 0) {
      // convert to board hanlder format
      const board_size = this.content.bounds.getSize(new Vector2())
      const size = { x: board_size.x, z: board_size.y }
      const origin = WorldUtils.asVect3(
        this.content.bounds.min,
        this.content.elevation,
      )
      const squares = this.content.data.map(element =>
        FightBoards.format_board_data(element),
      )
      const board = { origin, size, squares }
      const board_handler = new BoardOverlaysHandler({ board })

      this.handler = board_handler
      this.handler.clearSquares()
      this.highlight_edges()
      this.highlight_start_pos()
    }
  }

  highlight_edges = () => {
    const board_bounds = this.content.bounds
    const to_local_pos = pos => ({
      x: pos.x - board_bounds.min.x,
      z: pos.y - board_bounds.min.y,
    })
    const border_blocks = FightBoards.extract_border_blocks(this.content)
    const sorted_border_blocks = FightBoards.sort_by_side(
      border_blocks,
      this.content,
    )
    const first_player_side = sorted_border_blocks.first.map(block =>
      to_local_pos(block.pos),
    )
    const second_player_side = sorted_border_blocks.second.map(block =>
      to_local_pos(block.pos),
    )
    this.handler.displaySquares(first_player_side, new Color(0x0000ff))
    this.handler.displaySquares(second_player_side, new Color(0x00ff00))
  }

  highlight_start_pos() {
    const board_bounds = this.content.bounds
    const to_local_pos = pos => ({
      x: pos.x - board_bounds.min.x,
      z: pos.y - board_bounds.min.y,
    })
    const board_items = FightBoards.iter_board_data(this.content)
    const sorted_board_items = FightBoards.sort_by_side(
      board_items,
      this.content,
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
    this.handler.displaySquares(first_player_side, new Color(0x0000ff))
    this.handler.displaySquares(second_player_side, new Color(0x00ff00))
  }
}
