import {
  context,
  current_sui_character,
  current_three_character,
} from '../game/game.js'
import { state_iterator } from '../utils/iterator.js'

/** @type {Type.Module} */
export default function () {
  /** @type {Map<string, object>} */
  const current_equipments = new Map() // <character, { hat, ... }>

  return {
    observe() {
      // when a character is removed, remove its equipment
      context.events.on('action/remove_character', character_id => {
        current_equipments.delete(character_id)
      })

      state_iterator().forEach(async state => {
        const character = current_sui_character(state)
        const three_character = current_three_character(state)

        if (!character || !three_character) return
        if (!current_equipments.has(character.id))
          current_equipments.set(character.id, {})

        const { hat, cloak } = character
        const current_equipment = current_equipments.get(character.id)

        if (hat?.id !== current_equipment.hat?.id) {
          // remove current hat
          // if new hat, equip it
          if (hat) await three_character.equip_hat(hat)
          else await three_character.set_hair()

          current_equipments.set(character.id, { ...current_equipment, hat })
        }

        if (cloak?.id !== current_equipment.cloak?.id) {
          // if null, it will remove the cloak
          await three_character.equip_cape(cloak)
          current_equipments.set(character.id, { ...current_equipment, cloak })
        }
      })
    },
  }
}
