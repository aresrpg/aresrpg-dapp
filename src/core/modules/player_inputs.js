import { on } from 'events'

import { aiter } from 'iterator-helper'

/** @type {Type.Module} */
export default function () {
  return {
    reduce(state, { type, payload }) {
      if (type === 'action/keydown' || type === 'action/keyup') {
        const enabled = type === 'action/keydown'
        const { inputs, settings } = state
        const key_role = settings.keymap.get(payload)

        if (key_role) inputs[key_role] = enabled

        return {
          ...state,
          inputs,
        }
      } else if (type === 'action/mousedown' || type === 'action/mouseup') {
        const button = payload
        const { inputs } = state
        const enabled = type === 'action/mousedown'
        if (button === 0) {
          inputs.mouseLeft = enabled
        } else if (button === 2) {
          inputs.mouseRight = enabled
        }

        return {
          ...state,
          inputs,
        }
      }
      return state
    },
    observe({ dispatch, signal }) {
      // @ts-ignore
      aiter(on(window, 'keydown', { signal })).forEach(([{ code }]) =>
        dispatch('action/keydown', code),
      )
      // @ts-ignore
      aiter(on(window, 'keyup', { signal })).forEach(([{ code }]) =>
        dispatch('action/keyup', code),
      )
      // @ts-ignore
      aiter(on(window, 'mouseup', { signal })).forEach(([{ button }]) =>
        dispatch('action/mouseup', button),
      )
      // @ts-ignore
      aiter(on(window, 'mousedown', { signal })).forEach(([{ button }]) =>
        dispatch('action/mousedown', button),
      )
    },
  }
}
