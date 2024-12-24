import {
  BoardContainer,
  ChunkContainer,
  WorldUtils,
} from '@aresrpg/aresrpg-world'
import { Color, Vector2, Vector3 } from 'three'
import { BoardOverlaysHandler } from '@aresrpg/aresrpg-engine'
import * as FightBoards from '@aresrpg/aresrpg-sdk/fight'

import { context, current_three_character } from '../game/game.js'
import { spawn_crescent_sword } from '../utils/game/objects.js'
import { state_iterator } from '../utils/iterator.js'
import { chunk_data_encoder } from '../utils/terrain/world_utils.js'

const fight_board_container = new BoardContainer()
const MAX_TEAM_SIZE = 6

function is_in_team(team, character_id) {
  return team.some(({ id }) => id === character_id)
}

async function create_board(position = new Vector3()) {
  await fight_board_container.localCache.buildCacheAroundPos(position)
  const board_data = fight_board_container.genBoardContent(position)
  const board_stub = board_data.patch.toStub()

  const [board_chunks, original_chunks] =
    fight_board_container.localCache.cachedChunks.map(
      ({ chunkKey, margin, rawData, chunkId }) => {
        const target_chunk = new ChunkContainer(chunkKey, margin)
        const original_chunk = new ChunkContainer(chunkKey, margin)
        rawData.forEach((val, i) => {
          target_chunk.rawData[i] = chunk_data_encoder(val)
        })
        const patch_key = WorldUtils.convert.serializePatchId(
          WorldUtils.convert.asVect2(chunkId),
        )
        const cached_data =
          fight_board_container.localCache.patchLookup[patch_key]
        const { individualChunks } = cached_data.itemsLayer
        individualChunks.forEach(item_chunk => {
          ChunkContainer.copySourceToTarget(item_chunk, original_chunk)
          if (
            !this.container.overlapsBoard(
              WorldUtils.convert.asBox2(item_chunk.bounds),
            )
          )
            ChunkContainer.copySourceToTarget(item_chunk, target_chunk)
        })
        ChunkContainer.copySourceToTarget(board_data.chunk, target_chunk, false)
        return [target_chunk, original_chunk]
      },
    )

  const board_size = board_stub.bounds.getSize(new Vector2())
  const border_blocks = FightBoards.extract_border_blocks(board_stub)
  const origin = WorldUtils.convert.asVect3(board_stub.bounds.min, position.y)
  const squares = Array.from(board_stub.content).map(type => ({
    type, // dummy
    category: Math.max(0, type - 1),
  }))
  const sorted_border_blocks = FightBoards.sort_by_side(
    border_blocks,
    board_stub,
  )
  const start_overlay = new BoardOverlaysHandler({
    board: {
      size: { x: board_size.x, z: board_size.y },
      origin,
    },
  })
  const edge_overlay = new BoardOverlaysHandler({
    board: {
      size: { x: board_size.x, z: board_size.y },
      origin,
    },
  })
  const to_local_pos = pos => ({
    x: pos.x - board_stub.bounds.min.x,
    z: pos.y - board_stub.bounds.min.y,
  })

  return {
    board_chunks,
    original_chunks,
    show_start_positions() {
      const board_items = FightBoards.iter_board_data(this.data)
      const sorted_board_items = FightBoards.sort_by_side(
        board_items,
        this.data,
      )
      const { team_1, team_2 } = FightBoards.get_fight_start_positions({
        team_1_blocks: sorted_board_items.first,
        team_2_blocks: sorted_board_items.second,
        max_team_size: MAX_TEAM_SIZE,
      })
      start_overlay.displaySquares(
        team_1.map(({ pos }) => to_local_pos(pos)),
        new Color(0x1976d2),
      )
      start_overlay.displaySquares(
        team_2.map(({ pos }) => to_local_pos(pos)),
        new Color(0xd32f2f),
      )
      context.scene.add(start_overlay.container)
    },
    hide_start_positions() {
      start_overlay.clearSquares()
      start_overlay.dispose()
      context.scene.remove(start_overlay.container)
    },
    show_edges() {
      const first_player_side = sorted_border_blocks.first.map(block =>
        to_local_pos(block.pos),
      )
      const second_player_side = sorted_border_blocks.second.map(block =>
        to_local_pos(block.pos),
      )

      edge_overlay.clearSquares()
      edge_overlay.displaySquares(first_player_side, new Color(0x212121))
      edge_overlay.displaySquares(second_player_side, new Color(0x212121))
      context.scene.add(edge_overlay.container)
    },
    hide_edges() {
      edge_overlay.clearSquares()
      edge_overlay.dispose()
      context.scene.remove(edge_overlay.container)
    },
  }
}

/** @type {Type.Module} */
export default function () {
  const fight_swords = new Map()

  return {
    reduce(state, { type, payload }) {
      if (type === 'action/join_fight') {
        const character = state.characters.find(
          ({ id }) => id === payload.character_id,
        )

        if (character) character.current_fight_id = payload.fight_id
      }

      return state
    },
    observe() {
      // observe state to see if a character of the user was involved in a fight or spectating
      state_iterator().reduce(
        async (last_fight_data, state) => {
          const { last_fight_id, original_chunks: last_original_chunks } =
            last_fight_data
          const character = current_three_character(state)
          if (!character) return last_fight_data

          const { current_fight_id } = character

          console.log('fight id is now', current_fight_id, last_fight_id)

          if (last_fight_id !== current_fight_id) {
            if (last_fight_id)
              context.events.emit('FORCE_RENDER_CHUNKS', last_original_chunks)

            if (current_fight_id) {
              const fight = state.visible_fights.get(current_fight_id)
              const { board_chunks, original_chunks } = await create_board(
                fight.position ?? state.characters[0].position,
              )

              console.log('force render chunks', board_chunks)
              context.events.emit('FORCE_RENDER_CHUNKS', board_chunks)
              return {
                last_fight_id: current_fight_id,
                original_chunks,
              }
            }
          }

          return last_fight_data
        },
        {
          last_fight_id: undefined,
          original_chunks: undefined,
        },
      )

      context.events.on('packet/fightSpawn', async fight => {
        const { visible_fights, characters } = context.get_state()

        fight.start_time = +fight.start_time

        visible_fights.set(fight.id, fight)

        characters.forEach(character => {
          if (
            is_in_team(fight.team1, character.id) ||
            is_in_team(fight.team2, character.id)
            // || is_in_team(fight.spectators, character.id)
          ) {
            context.dispatch('action/join_fight', {
              character_id: character.id,
              fight_id: fight.id,
            })
          }
        })

        try {
          fight_swords.set(
            fight.id,
            await spawn_crescent_sword(fight, context.scene),
          )
        } catch (error) {
          console.error('Failed to spawn fight sword', error)
        }
      })

      context.events.on('packet/fightsDespawn', ({ ids }) => {
        const { visible_fights } = context.get_state()

        ids.forEach(id => {
          visible_fights.delete(id)
          const dispose = fight_swords.get(id)
          if (dispose) {
            dispose()
            fight_swords.delete(id)
          }
        })
      })

      state_iterator().forEach(state => {
        if (!state.online) {
          fight_swords.forEach(dispose => dispose())
          fight_swords.clear()

          state.visible_fights.clear()
        }
      })
    },
  }
}
