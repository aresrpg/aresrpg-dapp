import { GUI } from 'dat.gui'
import { WorldGenerator } from '@aresrpg/aresrpg-world'
import { Vector2 } from 'three'

import { INITIAL_STATE, current_three_character } from '../game/game.js'

/** @type {Type.Module} */
export default function () {
  const settings = { ...INITIAL_STATE.settings }

  return {
    observe({ events, dispatch, signal, on_game_hide, on_game_show }) {
      const gui = new GUI()

      signal.addEventListener('abort', () => {
        gui.destroy()
      })

      on_game_show(() => {
        gui.show()
      })

      on_game_hide(() => {
        gui.hide()
      })

      const game_folder = gui.addFolder('Game Settings')
      const daytime_folder = gui.addFolder('Sky')
      daytime_folder.open()
      const terrain_folder = gui.addFolder('Terrain Settings')
      const camera_folder = gui.addFolder('Camera Settings')
      const postprocessing_folder = gui.addFolder('Postprocessing Settings')

      const handle_change = name => value => dispatch(name, value)

      const dispatch_postprocessing_change = () => {
        settings.postprocessing.version++
        dispatch('action/postprocessing_changed', settings.postprocessing)
      }

      game_folder
        .add(settings, 'show_fps')
        .name('Show FPS')
        .onFinishChange(handle_change('action/show_fps'))

      game_folder
        .add(settings, 'target_fps', 5, 240, 1)
        .name('Target FPS')
        .onFinishChange(handle_change('action/target_fps'))

      game_folder
        .add(
          {
            teleport: () => {
              const player = current_three_character()
              if (player?.position) {
                // @ts-ignore
                const { x, z } = player.position
                const ground_height = WorldGenerator.instance.getHeight(
                  player.position,
                )

                dispatch('packet/characterPosition', {
                  id: player.id,
                  position: {
                    x,
                    y: ground_height + 10,
                    z,
                  },
                })
              }
            },
          },
          'teleport',
        )
        .name('Reset player position')

      game_folder
        .add(
          {
            set_time: () =>
              events.emit('SKY_CYCLE_CHANGED', { value: 0.7, fromUi: true }),
          },
          'set_time',
        )
        .name('Set day')

      daytime_folder
        .add(settings.sky, 'paused')
        .name('Pause cycle')
        .onChange(paused => events.emit('SKY_CYCLE_PAUSED', paused))

      const daytime_value_control = daytime_folder
        .add(settings.sky, 'value', 0, 1, 0.001)
        .name('Time')
        .onChange(value =>
          events.emit('SKY_CYCLE_CHANGED', { value, fromUi: true }),
        )

      events.on('SKY_CYCLE_CHANGED', ({ value, fromUi }) => {
        if (!fromUi) {
          settings.sky.value = value
          daytime_value_control.updateDisplay()
        }
      })

      terrain_folder
        .add(settings, 'view_distance', 50, 400, 50)
        .name('View distance')
        .onFinishChange(handle_change('action/view_distance'))

      camera_folder
        .add(settings.camera, 'is_free')
        .name('Free Camera')
        .onFinishChange(handle_change('action/free_camera'))

      postprocessing_folder
        .add(settings.postprocessing, 'enabled')
        .name('Enable')
        .onFinishChange(dispatch_postprocessing_change)

      const postprocessing_cartoon_folder =
        postprocessing_folder.addFolder('Cartoon')
      postprocessing_cartoon_folder
        .add(settings.postprocessing.cartoon_pass, 'enabled')
        .name('Enable')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_cartoon_folder
        .add(settings.postprocessing.cartoon_pass, 'thick_lines')
        .name('Thick lines')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_cartoon_folder.open()

      const postprocessing_bloom_folder =
        postprocessing_folder.addFolder('Bloom')
      postprocessing_bloom_folder
        .add(settings.postprocessing.bloom_pass, 'enabled')
        .name('Enable')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_bloom_folder
        .add(settings.postprocessing.bloom_pass, 'strength', 0, 1)
        .name('Strength')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_bloom_folder.open()

      postprocessing_folder
        .add(settings.postprocessing.underwater_pass, 'enabled')
        .name('Enable underwater')
        .onFinishChange(dispatch_postprocessing_change)

      dispatch_postprocessing_change()

      game_folder.open()
      terrain_folder.open()
      camera_folder.open()
      postprocessing_folder.open()
      gui.hide()
    },
  }
}
