import { context, current_three_character } from '../game/game.js'
import { state_iterator } from '../utils/iterator.js'

/** @type {Type.Module} */
export default function () {
  return {
    reduce(state, { type, payload }) {
      if (type === 'action/character_action') {
        const target_character = state.characters.find(
          (character) => character.id === payload.id
        )
        if (target_character) target_character.action = payload.action
      }
      if (type === 'action/keyup') {
        const { settings } = state
        if (settings.keymap.get(payload) === 'dance') {
          const target_character = state.characters.find(
            (character) => character.id === state.selected_character_id
          )
          if (target_character) target_character.action = 'DANCE'
        }
      }

      return state
    },

    observe() {
      state_iterator()
        .filter((state) => state.online)
        .reduce((last_actions, state) => {
          const character = current_three_character(state)

          if (!character) return last_actions
          if (!last_actions.has(character.id))
            last_actions.set(character.id, character.action)

          const last_action = last_actions.get(character.id)

          if (last_action !== character.action && character.id !== 'default') {
            context.send_packet('packet/characterAction', {
              id: character.id,
              action: character.action,
            })

            last_actions.set(character.id, character.action)

            // const duration = ACTIONS_DURATION[character.action]
            // if (duration) {
            //   setTimeout(() => {
            //     context.dispatch('action/character_action', {
            //       id: character.id,
            //       action: 'IDLE',
            //     })
            //   }, duration)
            // }
          }

          return last_actions
        }, new Map())
    },
  }
}
