import { VIEW_DISTANCE_MAX, VIEW_DISTANCE_MIN } from '../game/game.js'

const MIN_FPS = 5
const MAX_FPS = 240

/** @type {Type.Module} */
export default function () {
  return {
    reduce(state, { type, payload }) {
      switch (type) {
        case 'action/show_fps':
          return {
            ...state,
            settings: {
              ...state.settings,
              show_fps: payload,
            },
          }
        case 'action/target_fps':
          return {
            ...state,
            settings: {
              ...state.settings,
              target_fps: Math.max(MIN_FPS, Math.min(MAX_FPS, payload)),
            },
          }
        case 'action/view_distance':
          return {
            ...state,
            settings: {
              ...state.settings,
              terrain: {
                ...state.settings.terrain,
                view_distance: Math.max(
                  VIEW_DISTANCE_MIN,
                  Math.min(VIEW_DISTANCE_MAX, payload),
                ),
              },
            },
          }
        case 'action/free_camera':
          return {
            ...state,
            settings: {
              ...state.settings,
              camera: {
                ...state.settings.camera,
                is_free: payload,
              },
            },
          }
        case 'action/terrain_settings':
          return {
            ...state,
            settings: {
              ...state.settings,
              terrain: {
                ...state.settings.terrain,
                ...payload,
              },
            },
          }
      }

      return state
    },
  }
}
