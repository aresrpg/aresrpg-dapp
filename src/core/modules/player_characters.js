import { ENTITIES } from '../game/entities.js'
import { context, current_three_character } from '../game/game.js'
import { experience_to_level } from '../utils/game/experience.js'
import { state_iterator } from '../utils/iterator.js'

/** @type {Type.Module} */
export default function () {
  return {
    tick(state, __, delta) {
      const player = current_three_character(state)
      if (player?.mixer) player.mixer.update(delta)
    },
    reduce(state, { type, payload }) {
      if (type === 'action/select_character')
        return {
          ...state,
          selected_character_id: payload,
        }
      if (type === 'action/remove_character')
        return {
          ...state,
          characters: state.characters.filter(({ id }) => id !== payload),
        }
      if (type === 'action/add_character') {
        const { three_character, sui_character } = payload

        const level = experience_to_level(sui_character.experience)

        three_character.floating_title.text = `${sui_character.name} (${level})`

        three_character.target_position = sui_character.position

        return {
          ...state,
          characters: [...state.characters, three_character],
        }
      }
      return state
    },
    observe() {
      state_iterator().reduce(
        (last_characters, { selected_character_id, sui: { characters } }) => {
          const ids = characters.map(({ id }) => id)

          if (
            // if there is no selected character but there are three characters
            (!selected_character_id && ids.length) ||
            // or if the selected character is not in the locked characters list
            (ids.length &&
              selected_character_id &&
              !ids.includes(selected_character_id))
          ) {
            const [should_select] = ids
            if (selected_character_id !== should_select) {
              // we select the first one, or null if there are none
              context.dispatch('action/select_character', ids[0])
            }
          }

          // characters that were unlocked
          const removed = last_characters.filter(
            last_character =>
              !characters.some(character => character.id === last_character.id),
          )

          // new characters that were locked
          const added = characters.filter(
            character =>
              !last_characters.some(
                last_character => last_character.id === character.id,
              ),
          )

          removed.forEach(sui_character => {
            context.dispatch('action/remove_character', sui_character.id)
          })

          added.forEach(sui_character => {
            ENTITIES.from_character(sui_character)
              .then(three_character => {
                context.dispatch('action/add_character', {
                  sui_character,
                  three_character,
                })
                return three_character.set_hair()
              })
              .catch(error => {
                console.error('Error adding character', sui_character, error)
              })
          })

          return characters
        },
        /** @type {Type.SuiCharacter[]} */ [],
      )

      state_iterator().reduce(
        (
          /** @type {Type.ThreeEntity[]} */
          last_characters,
          { characters },
        ) => {
          const removed = last_characters.filter(
            last_character =>
              !characters.some(character => character.id === last_character.id),
          )

          removed.forEach(three_entity => {
            three_entity.remove()
          })

          return characters
        },
        [],
      )
    },
  }
}
