import { GUI } from 'dat.gui'
import { Vector3 } from 'three'

import {
  INITIAL_STATE,
  VIEW_DISTANCE_MAX,
  VIEW_DISTANCE_MIN,
  current_three_character,
} from '../game/game.js'
import { get_ground_height_async } from '../utils/terrain/world_utils.js'

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
            teleport: async () => {
              const player = current_three_character()
              if (player?.position) {
                // @ts-ignore
                const { x, z } = player.position

                const ground_level = await get_ground_height_async(
                  new Vector3(Math.floor(x), 0, Math.floor(z)),
                )

                dispatch('packet/characterPosition', {
                  id: player.id,
                  position: {
                    x,
                    y: ground_level + 10,
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
        .add(
          settings,
          'view_distance',
          VIEW_DISTANCE_MIN,
          VIEW_DISTANCE_MAX,
          50,
        )
        .name('View distance')
        .onFinishChange(handle_change('action/view_distance'))

      terrain_folder
        .add(
          {
            spawn_board: () => {
              const { position } = current_three_character()
              events.emit('SPAWN_BOARD', position)
            },
          },
          'spawn_board',
        )
        .name('Spawn board')

      terrain_folder
        .add(
          {
            hide_board: () => {
              events.emit('REMOVE_BOARD')
            },
          },
          'hide_board',
        )
        .name('Hide board')

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

      const postprocessing_godrays_folder =
        postprocessing_folder.addFolder('Godrays')
      postprocessing_godrays_folder
        .add(settings.postprocessing.godrays_pass, 'enabled')
        .name('Enable')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_godrays_folder
        .add(
          settings.postprocessing.godrays_pass,
          'light_size',
          0,
          0.01,
          0.0005,
        )
        .name('Light size')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_godrays_folder
        .add(settings.postprocessing.godrays_pass, 'max_intensity', 0, 5, 0.1)
        .name('Max intensity')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_godrays_folder
        .add(settings.postprocessing.godrays_pass, 'exposure', 0, 1)
        .name('Exposure')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_godrays_folder
        .add(settings.postprocessing.godrays_pass, 'samplesCount', 0, 100, 1)
        .name('SamplesCount')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_godrays_folder
        .add(settings.postprocessing.godrays_pass, 'density', 0, 1)
        .name('Density')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_godrays_folder.open()

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

      const postprocessing_fog_folder =
        postprocessing_folder.addFolder('Volumetric fog')
      postprocessing_fog_folder
        .add(settings.postprocessing.volumetric_fog_pass, 'enabled')
        .name('Enabled')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_fog_folder
        .add(settings.postprocessing.volumetric_fog_pass, 'threshold', 0, 1)
        .name('Threshold')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_fog_folder
        .add(settings.postprocessing.volumetric_fog_pass, 'smoothness', 0, 1)
        .name('Smoothness')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_fog_folder.open()

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
