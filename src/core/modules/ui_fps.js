import { aiter } from 'iterator-helper'
import Stats from 'stats.js'

import { get_spawned_entities_count } from '../utils/game/entities.js'
import { abortable, typed_on } from '../utils/iterator.js'

/** @type {Type.Module} */
export default function () {
  // Custom panel for entity count
  const stats_entities = new Stats()
  const entity_panel = new Stats.Panel('Entities', '#76FF03', '#221')
  stats_entities.addPanel(entity_panel)
  stats_entities.showPanel(3)
  stats_entities.dom.style.cssText =
    'position:fixed;bottom:350px;right:0px;cursor:pointer;opacity:0.9;z-index:10000'

  const stats_fps = new Stats()
  stats_fps.showPanel(0) // 0: FPS
  stats_fps.dom.style.cssText =
    'position:fixed;bottom:302px;right:0px;cursor:pointer;opacity:0.9;z-index:10000'

  const stats_memory = new Stats()
  stats_memory.showPanel(2) // 2: Memory
  stats_memory.dom.style.cssText =
    'position:fixed;bottom:254px;right:0px;cursor:pointer;opacity:0.9;z-index:10000'

  // Custom panel for mesh count
  const stats_mesh = new Stats()
  const mesh_panel = new Stats.Panel('Mesh', '#ff8', '#221')
  stats_mesh.addPanel(mesh_panel)
  stats_mesh.showPanel(3) // Show the custom panel
  stats_mesh.dom.style.cssText =
    'position:fixed;bottom:206px;right:0px;cursor:pointer;opacity:0.9;z-index:10000'

  const stats_draw_calls = new Stats()
  const draw_calls_panel = new Stats.Panel('Draws', '#f8f', '#212') // Use appropriate colors
  stats_draw_calls.addPanel(draw_calls_panel)
  stats_draw_calls.showPanel(3)
  stats_draw_calls.dom.style.cssText =
    'position:fixed;bottom:158px;right:0px;cursor:pointer;opacity:0.9;z-index:10000'

  function show_stats(show) {
    if (show) {
      document.body.appendChild(stats_entities.dom)
      document.body.appendChild(stats_fps.dom)
      document.body.appendChild(stats_memory.dom)
      document.body.appendChild(stats_mesh.dom)
      document.body.appendChild(stats_draw_calls.dom)
    } else {
      ;[
        stats_entities.dom,
        stats_fps.dom,
        stats_memory.dom,
        stats_mesh.dom,
        stats_draw_calls.dom,
      ].forEach((dom) => {
        if (document.body.contains(dom)) {
          document.body.removeChild(dom)
        }
      })
    }
  }

  function count_meshes(scene) {
    let count = 0
    scene.traverse((child) => {
      if (child.isMesh) count++
    })
    return count
  }

  return {
    tick(state, { scene, renderer }) {
      stats_entities.update()
      stats_fps.update()
      stats_memory.update()
      mesh_panel.update(count_meshes(scene), 1000) // 1000 is an arbitrary max value
      draw_calls_panel.update(renderer.info.render.calls, 5000) // 5000 is an arbitrary max value for draw calls
      entity_panel.update(get_spawned_entities_count(state), 1000) // 1000 is an arbitrary max value for entities
    },
    reduce(state, { type, payload }) {
      if (type === 'action/show_fps') {
        return {
          ...state,
          settings: {
            ...state.settings,
            show_fps: payload,
          },
        }
      }

      return state
    },
    observe({ events, signal, get_state, on_game_show, on_game_hide }) {
      const { show_fps } = get_state().settings

      aiter(abortable(typed_on(events, 'STATE_UPDATED', { signal })))
        .map(({ settings: { show_fps } }) => show_fps)
        .reduce((last_show_fps, show_fps) => {
          if (show_fps !== last_show_fps) show_stats(show_fps)

          return show_fps
        })

      on_game_show(() => {
        show_stats(show_fps)
      })

      on_game_hide(() => {
        show_stats(false)
      })

      signal.addEventListener('abort', () => {
        show_stats(false)
      })
    },
  }
}
