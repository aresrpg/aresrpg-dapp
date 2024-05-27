import {
  context,
  current_locked_character,
  current_three_character,
} from '../game/game.js'
import { state_iterator } from '../utils/iterator.js'

/** @type {Type.Module} */
export default function () {
  /** @type {Map<string, string>} */
  const original_skins = new Map()

  function get_item_skin(sui_character) {
    if (sui_character.title?.item_type === 'primemachin') return 'primemachin'
  }

  return {
    observe() {
      state_iterator().forEach(state => {
        const character = current_locked_character(state)
        const three_character = current_three_character(state)

        if (!character || !three_character) return

        const item_skin = get_item_skin(character)
        const current_skin = three_character.skin

        if (!original_skins.has(character.id))
          original_skins.set(character.id, current_skin)

        const original_skin = original_skins.get(character.id)

        if (item_skin && item_skin !== current_skin) {
          context.dispatch('action/remove_character', character.id)
          context.dispatch('action/add_character', {
            ...character,
            position: three_character.position,
            skin: item_skin,
          })
        }

        if (!item_skin && original_skin !== current_skin) {
          context.dispatch('action/remove_character', character.id)
          context.dispatch('action/add_character', {
            ...character,
            position: three_character.position,
            skin: original_skin,
          })
        }
      })
    },
  }
}
