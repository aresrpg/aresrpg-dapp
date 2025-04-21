import { aiter } from 'iterator-helper'

import { abortable, typed_on } from '../utils/iterator.js'

/** @type {Type.Module} */
export default function () {
  return {
    reduce(state, { type, payload }) {
      if (type === 'action/use_real_dpi') {
        return {
          ...state,
          settings: {
            ...state.settings,
            use_real_dpi: payload,
          },
        }
      }

      return state
    },

    observe({ events, renderer, camera, signal, composer, get_state }) {
      function adjust_size() {
        const state = get_state()
        const pixel_ratio = state.settings.use_real_dpi
          ? window.devicePixelRatio
          : 1
        renderer.setPixelRatio(pixel_ratio)
        composer.setPixelRatio(pixel_ratio)

        const { innerWidth, innerHeight } = window
        renderer.setSize(innerWidth, innerHeight)
        camera.aspect = innerWidth / innerHeight
        camera.updateProjectionMatrix()
        composer.setSize(innerWidth, innerHeight)
      }

      window.addEventListener('resize', adjust_size, { signal })

      aiter(abortable(typed_on(events, 'STATE_UPDATED', { signal })))
        .map(({ settings: { use_real_dpi } }) => use_real_dpi)
        .reduce((last_use_real_dpi, use_real_dpi) => {
          if (use_real_dpi !== last_use_real_dpi) {
            adjust_size()
          }
          return use_real_dpi
        })

      adjust_size()
    },
  }
}
