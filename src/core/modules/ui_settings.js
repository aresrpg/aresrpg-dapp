import { GUI } from 'dat.gui'
import { Vector3 } from 'three'

import {
  INITIAL_STATE,
  VIEW_DISTANCE_MAX,
  VIEW_DISTANCE_MIN,
  chunk_rendering_mode,
  context,
  current_three_character,
} from '../game/game.js'
import { get_nearest_floor_pos } from '../utils/terrain/world_utils.js'

import { create_board } from './game_fights.js'

/** @type {Type.Module} */
export default function () {
  const settings = { ...INITIAL_STATE.settings }

  return {
    observe({ events, dispatch, signal, on_game_hide, on_game_show }) {
      const gui = new GUI()

      gui.useLocalStorage = true

      gui.remember(settings, settings.sky)
      gui.remember(settings.terrain)
      gui.remember(settings.camera)
      gui.remember(settings.postprocessing)

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

      const handle_change = name => value => {
        dispatch(name, value)
      }

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
                const target_position = new Vector3(
                  Math.floor(x),
                  300,
                  Math.floor(z),
                )

                const surface_block =
                  get_nearest_floor_pos(target_position) || target_position

                dispatch('packet/characterPosition', {
                  id: player.id,
                  position: surface_block,
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

      game_folder
        .add(settings, 'run_speed', 13, 130, 10)
        .name('Run speed')
        .onFinishChange(handle_change('action/run_speed'))

      /** add in game_folder a select with two valus (light & dark), and function to add change data-theme on document for tailwindcss */
      game_folder
        .add(
          {
            set_theme: () => {
              const theme = document.documentElement.getAttribute('data-theme')
              document.documentElement.setAttribute(
                'data-theme',
                theme === 'light' ? 'dark' : 'light',
              )
            },
          },
          'set_theme',
        )
        .name('Change theme')

      daytime_folder
        .add(settings.sky, 'paused')
        .name('Pause cycle')
        .onChange(paused => {
          events.emit('SKY_CYCLE_PAUSED', paused)
        })

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
          settings.terrain,
          'view_distance',
          VIEW_DISTANCE_MIN,
          VIEW_DISTANCE_MAX,
          1,
        )
        .name('View distance')
        .onFinishChange(handle_change('action/view_distance'))

      terrain_folder
        .add(settings.terrain, 'use_lod')
        .name('enable LOD')
        .onFinishChange(value => {
          dispatch('action/terrain_settings', { use_lod: value })
        })

      // terrain_folder
      //   .add(settings.terrain, 'use_local_generation')
      //   .name('Generate chunks locally')
      //   .onFinishChange(value => {
      //     dispatch('action/terrain_settings', { use_local_generation: value })
      //   })

      // terrain_folder
      //   .add(settings.terrain, 'use_caverns')
      //   .name('Generate caverns (local generation only)')
      //   .onFinishChange(value => {
      //     dispatch('action/terrain_settings', { use_caverns: value })
      //   })

      terrain_folder
        .add(settings.terrain, 'chunk_generation', { ...chunk_rendering_mode })
        .name('Chunk processing mode')
        .onFinishChange(value => {
          dispatch('action/terrain_settings', { chunk_generation: value })
        })

      terrain_folder
        .add(
          {
            show_board: async () => {
              const player = current_three_character()
              if (player?.position) {
                const { board_chunks, show_edges, show_start_positions } =
                  await create_board(
                    new Vector3(
                      player.position.x,
                      player.position.y,
                      player.position.z,
                    ),
                  )
                console.log('emit ', board_chunks)
                context.events.emit('FORCE_RENDER_CHUNKS', board_chunks)
                setTimeout(() => {
                  show_edges()
                  show_start_positions()
                }, 2000)
              }
            },
          },
          'show_board',
        )
        .name('Create fight board')

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
        .add(settings.postprocessing.volumetric_fog_pass, 'uniformity', 0, 1)
        .name('Uniformity')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_fog_folder
        .add(settings.postprocessing.volumetric_fog_pass, 'smoothness', 0, 1)
        .name('Smoothness')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_fog_folder
        .add(settings.postprocessing.volumetric_fog_pass, 'fog_density', 0, 0.1)
        .name('Density')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_fog_folder
        .addColor(settings.postprocessing.volumetric_fog_pass, 'fog_color')
        .name('Fog color')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_fog_folder
        .addColor(settings.postprocessing.volumetric_fog_pass, 'light_color')
        .name('Light color')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_fog_folder
        .add(
          settings.postprocessing.volumetric_fog_pass,
          'ambient_light_intensity',
          0,
          2,
          0.01,
        )
        .name('Ambient light')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_fog_folder
        .add(
          settings.postprocessing.volumetric_fog_pass,
          'direct_light_intensity',
          0,
          2,
          0.01,
        )
        .name('Direct light')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_fog_folder
        .add(
          settings.postprocessing.volumetric_fog_pass,
          'raymarching_step',
          0.1,
          2,
        )
        .name('Raymarch step')
        .onFinishChange(dispatch_postprocessing_change)
      postprocessing_fog_folder
        .add(
          settings.postprocessing.volumetric_fog_pass,
          'downscaling',
          1,
          4,
          1,
        )
        .name('Downscaling')
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
