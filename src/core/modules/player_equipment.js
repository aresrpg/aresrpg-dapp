import { Color } from 'three'

import {
  context,
  current_sui_character,
  current_three_character,
} from '../game/game.js'
import { state_iterator } from '../utils/iterator.js'
import { ENTITIES } from '../game/entities.js'
import { get_player_skin } from '../utils/three/skin.js'

/** @type {Type.Module} */
export default function () {
  const skins = new Map()
  const visible_equipment = new Map()
  return {
    observe() {
      state_iterator().forEach(async (state) => {
        const character = current_sui_character(state)
        const three_character = current_three_character(state)

        if (!character || !three_character) return

        const current_skin = get_player_skin(character)
        const previous_skin = skins.get(character.id)
        const last_equipment = visible_equipment.get(character.id)

        skins.set(character.id, current_skin)

        // handling skin update
        if (previous_skin !== current_skin) {
          context.dispatch('action/remove_character', character.id)
          const sui_character = {
            ...character,
            position:
              three_character.target_position ?? three_character.position,
          }
          const new_three_character = current_skin
            ? await ENTITIES[current_skin](sui_character)
            : await ENTITIES.from_character(sui_character)

          new_three_character.move(three_character.position)

          context.dispatch('action/add_character', {
            sui_character,
            three_character: new_three_character,
          })

          if (!current_skin) new_three_character.set_equipment(sui_character)
          if (!last_equipment)
            await new_three_character.set_equipment(character)
          else if (
            last_equipment.hat !== character.hat ||
            last_equipment.cloak !== character.cloak
          )
            await new_three_character.set_equipment(character)
        } else {
          if (!last_equipment) await three_character.set_equipment(character)
          else if (
            last_equipment.hat !== character.hat ||
            last_equipment.cloak !== character.cloak
          )
            await three_character.set_equipment(character)
        }

        visible_equipment.set(character.id, {
          hat: character.hat,
          cloak: character.cloak,
        })
      })
    },
  }
}
