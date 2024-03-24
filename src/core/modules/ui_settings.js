import { GUI } from 'dat.gui'

import { INITIAL_STATE } from '../game/game.js'

/** @type {Type.Module} */
export default function () {
  const settings = { ...INITIAL_STATE.settings }

  return {
    name: 'ui_settings',
    observe({
      events,
      dispatch,
      signal,
      get_state,
      on_game_hide,
      on_game_show,
    }) {
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
              const { player } = get_state()
              // @ts-ignore
              const { x, z } = player.position

              dispatch('packet/playerPosition', {
                position: {
                  x,
                  y: 105,
                  z,
                },
              })
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

      const daytime_pause_control = daytime_folder
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
        if (fromUi) {
          daytime_pause_control.setValue(true)
        } else {
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

      terrain_folder
        .add(settings, 'far_view_distance', 5, 50, 1)
        .name('Far view distance')
        .onFinishChange(handle_change('action/far_view_distance'))

      terrain_folder
        .add(
          { clear_chunks: () => events.emit('CLEAR_CHUNKS') },
          'clear_chunks',
        )
        .name('Clear Chunks')

      // world_gen_folder
      //   .add(Biomes.DEFAULT, 'scale', 1, 4000, 1)
      //   .name('Scale')
      //   .onFinishChange(handle_biome_change)

      // world_gen_folder
      //   .add(Biomes.DEFAULT, 'height', 1, 1000, 1)
      //   .name('Height')
      //   .onFinishChange(handle_biome_change)

      // world_gen_folder
      //   .add(Biomes.DEFAULT, 'octaves', 1, 20, 1)
      //   .name('Octaves')
      //   .onFinishChange(handle_biome_change)

      // world_gen_folder
      //   .add(Biomes.DEFAULT, 'persistence', 0, 1, 0.01)
      //   .name('Persistence')
      //   .onFinishChange(handle_biome_change)

      // world_gen_folder
      //   .add(Biomes.DEFAULT, 'lacunarity', 0, 10, 0.01)
      //   .name('Lacunarity')
      //   .onFinishChange(handle_biome_change)

      // world_gen_folder
      //   .add(Biomes.DEFAULT, 'exponentiation', 0, 20, 0.01)
      //   .name('Exponentiation')
      //   .onFinishChange(handle_biome_change)

      camera_folder
        .add(settings, 'free_camera')
        .name('Free Camera')
        .onFinishChange(handle_change('action/free_camera'))

      game_folder.open()
      terrain_folder.open()
      // world_gen_folder.open()
      camera_folder.open()
      gui.hide()
    },
  }
}
