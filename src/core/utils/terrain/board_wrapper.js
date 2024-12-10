import { Box2, Color, Vector2, Vector3 } from 'three'
import { BoardOverlaysHandler } from '@aresrpg/aresrpg-engine'
import {
  BlockCategory,
  BlockType,
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
      await this.container.localCache.buildCacheAroundPos(current_pos)
      // fill board buffer from cache
      const board_buffer = this.container.genBoardBuffer(current_pos)
      // iter board indexed chunks
      for await (const cached_chunk of this.container.localCache.cachedChunks) {
        // board_chunk.rawData.fill(113)
        const board_chunk = new ChunkContainer(
          cached_chunk.chunkKey,
          cached_chunk.margin,
        )
        cached_chunk.rawData.forEach(
          (val, i) => (board_chunk.rawData[i] = chunk_data_encoder(val)),
        )
        // copy items individually
        const patch_key = WorldUtils.serializePatchId(
          WorldUtils.asVect2(board_chunk.chunkId),
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
            ChunkContainer.copySourceToTarget(item_chunk, board_chunk),
          )
        // ChunkContainer.copySourceToTarget(cached_data.itemsLayer, board_chunk)
        // board_chunk_copy.rawData.set(board_chunk.rawData)
        // cached_data.itemsChunks
        //   .filter(chunk => chunk)
        //   .forEach(item_chunk =>
        //     ChunkContainer.copySourceToTarget(item_chunk, target_chunk),
        //   )
        // override with board_buffer
        ChunkContainer.copySourceToTarget(board_buffer, board_chunk, false)
        // const board_chunk_mask = board_chunk.genBoardMask()
        // board_chunk_mask.applyMaskOnTargetChunk(board_chunk_copy)
        yield board_chunk
      }
      // remember bounds for later board removal
      // this.bounds = this.container.boardBounds
      this.pos = current_pos
    }
  }

  highlight = () => {
    // const board_container = new BoardContainer(current_pos, radius, thickness)
    // board_container.rebuildIndexAroundPosAndRad(current_pos)
    // await board_container.build()
    // const native_board = board_container.exportBoardData()
    // const board_origin = WorldUtils.asVect2(board_container.origin)
    const board_data = this.container.genBoardData()
    this.content = board_data
    this.content.data = board_data.data.map(cat => ({
      type: cat,
      category: cat - 1,
    }))

    console.log(board_data)
    if (board_data.data.length > 0) {
      // convert to board hanlder format
      const board_size = board_data.bounds.getSize(new Vector2())
      const size = { x: board_size.x, z: board_size.y }
      const origin = WorldUtils.asVect3(
        board_data.bounds.min,
        board_data.elevation,
      )
      // const squares = board_data.data.map(element =>
      //   FightBoards.format_board_data(element),
      // )
      const squares = this.content.data.map(block => ({
        materialId: block.type,
        type: block.category,
      }))
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
