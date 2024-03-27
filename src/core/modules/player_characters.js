import { context } from '../game/game.js'
import { state_iterator } from '../utils/iterator.js'

/** @type {Type.Module} */
export default function () {
  return {
    reduce(state, { type, payload }) {
      if (type === 'action/select_character') {
        return {
          ...state,
          selected_character_id: payload,
        }
      }
      return state
    },
    observe() {
      state_iterator().forEach(
        ({ selected_character_id, sui: { locked_characters } }) => {
          const ids = locked_characters.map(({ id }) => id)

          // if there is no selected character and there are locked characters
          if (!selected_character_id && ids.length) {
            context.dispatch('action/select_character', ids[0])
          }
          // if the selected character is not in the locked characters list
          else if (
            selected_character_id &&
            !ids.includes(selected_character_id)
          ) {
            context.dispatch('action/select_character', null)
          }
        },
      )
    },
  }
}
