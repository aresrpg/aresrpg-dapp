import { GUI } from 'dat.gui'

import { INITIAL_STATE, current_character } from '../game/game.js'

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

      const handle_change = name => value => dispatch(name, value)

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
              const player = current_character()
              if (player.position) {
                // @ts-ignore
                const { x, z } = player.position

                console.log('teleporting', player.id, x, z)
                dispatch('packet/characterMove', {
                  id: player.id,
                  position: {
                    x,
                    y: 105,
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

      daytime_folder
        .add(settings.sky, 'sun_size', 0, 0.002)
        .onChange(value => events.emit('SKY_SUNSIZE_CHANGED', value))

      terrain_folder
        .add(settings, 'view_distance', 1, 10, 1)
        .name('View distance')
        .onFinishChange(handle_change('action/view_distance'))

      camera_folder
        .add(settings, 'free_camera')
        .name('Free Camera')
        .onFinishChange(handle_change('action/free_camera'))

      game_folder.open()
      terrain_folder.open()
      camera_folder.open()
      gui.hide()
    },
  }
}
