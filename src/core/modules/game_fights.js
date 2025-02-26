import {
  asVect3,
  BoardProvider,
  BoardCacheProvider,
} from '@aresrpg/aresrpg-world'
import { Color, Vector2, Vector3 } from 'three'
import { BoardOverlaysHandler } from '@aresrpg/aresrpg-engine'
import * as FightBoards from '@aresrpg/aresrpg-sdk/fight'

import {
  context,
  current_sui_character,
  current_three_character,
} from '../game/game.js'
import { spawn_crescent_sword } from '../utils/game/objects.js'
import { state_iterator } from '../utils/iterator.js'
import {
  chunk_data_encoder,
  default_worker_pool,
} from '../utils/terrain/world_utils.js'

const MAX_TEAM_SIZE = 6

function is_in_team(team, character_id) {
  return team.some(({ id }) => id === character_id)
}

function init_board_handler(board_data) {
  if (board_data?.content.length > 0) {
    // convert to board hanlder format
    const board_size = board_data.bounds.getSize(new Vector2())
    const size = { x: board_size.x, z: board_size.y }
    const origin = asVect3(board_data.bounds.min, board_data.elevation)
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

function is_in_fight(fight, character_id) {
  return (
    fight.team1.some(({ id }) => id === character_id) ||
    fight.team2.some(({ id }) => id === character_id) ||
    fight.spectators.some(({ id }) => id === character_id)
  )
}

/** @typedef {ReturnType<import("@aresrpg/aresrpg-world").ChunkContainer['fromStub']>} ChunkContainer */

export async function create_board(position = new Vector3()) {
  // seems the boardprocessor is made to have a single instance so we have to call that each time
  // and it will erase the previous instance
  const board_cache_provider = new BoardCacheProvider(default_worker_pool)
  const board_processor = new BoardProvider(
    position,
    board_cache_provider,
    chunk_data_encoder,
  )

  const board = await board_processor.genBoardContent()
  const board_chunks = board_processor
    .overrideOriginalChunksContent(board.chunk)
    .toArray()
    .map(chunk => chunk.toStub())
  const original_chunks = board_processor
    .restoreOriginalChunksContent()
    .toArray()
    .map(chunk => chunk.toStub())
  const board_data = board.patch.toStub()

  board_data.elevation = board_processor.boardElevation

  const board_handler = init_board_handler(board_data)

  const board_size = board_data.bounds.getSize(new Vector2())
  const border_blocks = FightBoards.extract_border_blocks(board_data)
  const origin = asVect3(board_data.bounds.min, position.y)
  const squares = Array.from(board_data.content).map(type => ({
    type, // dummy
    category: Math.max(0, type - 1),
  }))
  const sorted_border_blocks = FightBoards.sort_by_side(
    border_blocks,
    board_data,
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
    x: pos.x - board_data.bounds.min.x,
    z: pos.y - board_data.bounds.min.y,
  })

  const board_items = FightBoards.iter_board_data(board_data)
  const sorted_board_items = FightBoards.sort_by_side(board_items, board_data)
  const { team_1, team_2 } = FightBoards.get_fight_start_positions({
    team_1_blocks: sorted_board_items.first,
    team_2_blocks: sorted_board_items.second,
    max_team_size: MAX_TEAM_SIZE,
  })

  const team_1_positions = team_1.map(block => to_local_pos(block.pos))
  const team_2_positions = team_2.map(block => to_local_pos(block.pos))

  return {
    /** @type {ReturnType<ChunkContainer['toStub']>[]} */
    board_chunks,
    /** @type {ReturnType<ChunkContainer['toStub']>[]} */
    original_chunks,
    team_1_positions,
    team_2_positions,
    squares,
    show_start_positions() {
      board_handler.displaySquares(team_1_positions, new Color(0x1976d2))
      board_handler.displaySquares(team_2_positions, new Color(0xd32f2f))
      context.scene.add(board_handler.container)
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
    dispose(scene) {
      board_handler.dispose()
      scene.remove(board_handler.container)
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

          if (last_fight_id !== current_fight_id) {
            if (last_fight_id)
              context.events.emit('FORCE_RENDER_CHUNKS', last_original_chunks)

            if (current_fight_id) {
              const fight = state.visible_fights.get(current_fight_id)
              console.log('creating board')
              const {
                board_chunks,
                original_chunks,
                show_start_positions,
                show_edges,
              } = await create_board(
                new Vector3(
                  fight.position.x,
                  fight.position.y,
                  fight.position.z,
                ),
              )

              // remove sword after the fight started
              // fight_swords.get(current_fight_id)?.()

              console.log('force render chunks', board_chunks)
              context.events.emit('FORCE_RENDER_CHUNKS', board_chunks)

              show_start_positions()
              show_edges()

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

      // this handles joining a fight when the character is already selected
      context.events.on('packet/fightSpawn', async fight => {
        const { visible_fights } = context.get_state()

        fight.start_time = +fight.start_time

        visible_fights.set(fight.id, fight)
        console.log('packet/fightSpawn', fight)

        const { id } = current_sui_character()

        console.log('current id on fight packet reception', id)

        if (is_in_fight(fight, id)) {
          context.dispatch('action/join_fight', {
            character_id: id,
            fight_id: fight.id,
          })
        }

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

      // this handles joining a fight when a character is selected
      // because for reconnecting in fight, we could receive the packet before characters are loaded
      state_iterator().reduce(
        (last_characters_ids, { visible_fights, characters }) => {
          const ids = characters.map(({ id }) => id)
          const newly_added = ids.filter(
            id => !last_characters_ids.includes(id),
          )
          const removed = last_characters_ids.filter(id => !ids.includes(id))

          if (removed.length) {
            // TODO: maybe handle when a character is removed ? if needed
          }

          if (newly_added.length) {
            newly_added.forEach(id => {
              visible_fights.forEach(fight => {
                if (
                  is_in_team(fight.team1, id) ||
                  is_in_team(fight.team2, id) ||
                  is_in_team(fight.spectators, id)
                ) {
                  console.log('joining fight', fight.id)
                  context.dispatch('action/join_fight', {
                    character_id: id,
                    fight_id: fight.id,
                  })
                }
              })
            })
          }

          return ids
        },
        [],
      )

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
