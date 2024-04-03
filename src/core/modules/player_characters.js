import { context, current_character } from '../game/game.js'
import { experience_to_level } from '../utils/game/experience.js'
import { state_iterator } from '../utils/iterator.js'

/** @type {Type.Module} */
export default function () {
  return {
    tick(state, __, delta) {
      const player = current_character(state)
      if (player.mixer) player.mixer.update(delta)
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
        const three_character = context.pool.entity(payload).non_instanced()

        const level = experience_to_level(payload.experience)

        three_character.title.text = `${payload.name} (${level})`
        // three_character.move(new Vector3(0, 105, 0))

        return {
          ...state,
          characters: [...state.characters, three_character],
        }
      }
      return state
    },
    observe() {
      state_iterator().reduce(
        (
          last_locked_characters,
          { selected_character_id, sui: { locked_characters } },
        ) => {
          const ids = locked_characters.map(({ id }) => id)

          if (
            // if there is no selected character but there are three characters
            (!selected_character_id && ids.length) ||
            // or if the selected character is not in the locked characters list
            (selected_character_id && !ids.includes(selected_character_id))
          ) {
            // we select the first one, or null if there are none
            context.dispatch('action/select_character', ids[0])
          }

          // characters that were unlocked
          const removed = last_locked_characters.filter(
            last_character =>
              !locked_characters.some(
                character => character.id === last_character.id,
              ),
          )

          // new characters that were locked
          const added = locked_characters.filter(
            character =>
              !last_locked_characters.some(
                last_character => last_character.id === character.id,
              ),
          )

          removed.forEach(sui_character => {
            context.dispatch('action/remove_character', sui_character.id)
          })

          added.forEach(sui_character => {
            context.dispatch('action/add_character', sui_character)
          })

          return locked_characters
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
