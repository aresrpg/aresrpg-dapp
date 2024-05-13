/** @type {Type.Module} */
export default function () {
  return {
    reduce(state, { type, payload }) {
      if (type === 'packet/characterHealth') {
        const target_character = state.sui.locked_characters.find(
          character => character.id === payload.id,
        )

        if (target_character) target_character.health = payload.health
      }

      return state
    },
  }
}
