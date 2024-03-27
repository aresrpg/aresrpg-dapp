/** @type {Type.Module} */
export default function () {
  return {
    reduce(state, { type, payload }) {
      if (type === 'action/set_online')
        return {
          ...state,
          online: payload,
        }

      return state
    },
  }
}
