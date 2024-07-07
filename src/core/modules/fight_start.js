/** @type {Type.Module} */
export default function () {
  return {
    reduce(state, { type, payload }) {
      if (type === 'packet/startFight') {
        return {
          ...state,
          is_in_fight: true,
        }
      }

      return state
    },
  }
}
