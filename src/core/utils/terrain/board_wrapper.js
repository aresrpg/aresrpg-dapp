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
  container
  handler
  data
  scene

  constructor() {
    this.container = new BoardContainer()
    this.pos = new Vector3(0, 0, 0)
  }

  get board_bounds() {
    return this.data?.bounds
  }

  get board_elevation() {
    return this.data?.elevation
  }

  async *update(current_pos) {
    if (this.pos.distanceTo(current_pos) > 1) {
      // board_chunks_container.boardCenter = current_pos
      await this.container.localCache.buildCacheAroundPos(current_pos)
      // fill board buffer from cache
      const board_data = this.container.genBoardContent(current_pos)
      this.data = board_data.patch.toStub()
      this.data.elevation = current_pos.y
      // iter board indexed chunks
      for await (const cached_chunk of this.container.localCache.cachedChunks) {
        // board_chunk.rawData.fill(113)
        const target_chunk = new ChunkContainer(
          cached_chunk.chunkKey,
          cached_chunk.margin,
        )
        cached_chunk.rawData.forEach(
          (val, i) => (target_chunk.rawData[i] = chunk_data_encoder(val)),
        )
        // copy items individually
        const patch_key = WorldUtils.serializePatchId(
          WorldUtils.asVect2(target_chunk.chunkId),
        )
        const cached_data = this.container.localCache.patchLookup[patch_key]
        const { individualChunks } = cached_data.itemsLayer
        individualChunks
          .filter(
            item_chunk =>
              !this.container.overlapsBoard(
                WorldUtils.asBox2(item_chunk.bounds),
              ),
          )
          .forEach(item_chunk =>
            ChunkContainer.copySourceToTarget(item_chunk, target_chunk),
          )
        // override with board_buffer
        ChunkContainer.copySourceToTarget(board_data.chunk, target_chunk, false)
        yield target_chunk
      }
      // remember bounds for later board removal
      // this.bounds = this.container.boardBounds
      this.pos = current_pos
    }
  }

  highlight = () => {
    // this.content.data = this.content.data.map(cat => ({
    //   type: cat,
    //   category: cat - 1,
    // }))

    if (this.data?.content.length > 0) {
      // convert to board hanlder format
      const board_size = this.board_bounds.getSize(new Vector2())
      const size = { x: board_size.x, z: board_size.y }
      const origin = WorldUtils.asVect3(
        this.board_bounds.min,
        this.board_elevation,
      )
      const squares = []
      this.data.content.forEach(block_cat => {
        const square = {
          type: block_cat, // dummy
          category: Math.max(0, block_cat - 1),
        }
        squares.push(square)
      })
      const board = { origin, size, squares }
      const board_handler = new BoardOverlaysHandler({ board })

      this.handler = board_handler
      this.handler.clearSquares()
      this.highlight_edges()
      this.highlight_start_pos()
    }
  }

  highlight_edges = () => {
    const board_bounds = this.data.bounds
    const to_local_pos = pos => ({
      x: pos.x - board_bounds.min.x,
      z: pos.y - board_bounds.min.y,
    })
    const border_blocks = FightBoards.extract_border_blocks(this.data)
    const sorted_border_blocks = FightBoards.sort_by_side(
      border_blocks,
      this.data,
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
    const board_bounds = this.data.bounds
    const to_local_pos = pos => ({
      x: pos.x - board_bounds.min.x,
      z: pos.y - board_bounds.min.y,
    })
    const board_items = FightBoards.iter_board_data(this.data)
    const sorted_board_items = FightBoards.sort_by_side(board_items, this.data)
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
