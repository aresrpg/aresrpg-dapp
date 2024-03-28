import { on } from 'events'

import { aiter } from 'iterator-helper'

import { abortable } from '../utils/iterator.js'
import { context } from '../game/game.js'

/** @type {Type.Module} */
export default function () {
  let player = null
  return {
    reduce(state, { type, payload }) {
      if (type === 'action/register_player') {
        return { ...state, player: payload }
      }
      return state
    },
    tick(_, __, delta) {
      if (player) player.mixer.update(delta)
    },
    observe({ pool, dispatch, signal }) {
      aiter(abortable(on(context.events, 'STATE_UPDATED')))
        .map(
          ([
            {
              selected_character_id,
              sui: { locked_characters },
            },
          ]) => ({
            selected_character_id,
            locked_characters,
          }),
        )
        .reduce(
          (last_selected, { selected_character_id, locked_characters }) => {
            // if another character is selected, we switch the player
            if (last_selected !== selected_character_id) {
              if (player) player.remove()

              const selected_character = locked_characters.find(
                ({ id }) => id === selected_character_id,
              )

              if (selected_character) {
                const { classe, sex, name } = selected_character
                player = pool
                  .character({ classe, female: sex === 'female' })
                  .get_non_instanced()

                player.title.text = name

                dispatch('action/register_player', player)
                dispatch('packet/playerPosition', {
                  position: {
                    x: 0,
                    y: 105,
                    z: 0,
                  },
                })
              }
            }

            return selected_character_id
          },
          null,
        )

      signal.addEventListener('abort', () => {
        player.remove()
        dispatch('action/register_player', null)
      })
    },
  }
}
