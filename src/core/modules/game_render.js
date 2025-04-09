import { Color, Vector2 } from 'three'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'
import * as TWEEN from '@tweenjs/tween.js'

import { CartoonRenderpass } from '../game/rendering/cartoon_renderpass.js'
import { GodraysPass } from '../game/rendering/godrays_pass.js'
import { UnderwaterPass } from '../game/rendering/underwater_pass.js'
import { VolumetricFogRenderpass } from '../game/rendering/volumetric_fog_renderpass.js'
import { state_iterator } from '../utils/iterator.js'
import { context } from '../game/game.js'

let current_fog_tween_fade_in, current_fog_tween_fade_out

function apply_fog_settings(target, settings) {
  target.uniformity = settings.uniformity
  target.smoothness = settings.smoothness
  target.fog_density = settings.fog_density
  target.ambient_light_intensity = settings.ambient_light_intensity
  target.direct_light_intensity = settings.direct_light_intensity
  target.raymarching_step = settings.raymarching_step
  target.downscaling = Math.floor(settings.downscaling)

  target.fog_color = new Color(
    settings.fog_color_r,
    settings.fog_color_g,
    settings.fog_color_b,
  )
  target.light_color = new Color(
    settings.light_color_r,
    settings.light_color_g,
    settings.light_color_b,
  )
}

const build_fog_settings = biome_settings => ({
  uniformity: biome_settings.uniformity,
  smoothness: biome_settings.smoothness,
  fog_density: biome_settings.fog_density,

  ambient_light_intensity: biome_settings.ambient_light_intensity,
  direct_light_intensity: biome_settings.direct_light_intensity,

  raymarching_step: biome_settings.raymarching_step,
  downscaling: biome_settings.downscaling,

  fog_color_r: biome_settings.fog_color.r,
  fog_color_g: biome_settings.fog_color.g,
  fog_color_b: biome_settings.fog_color.b,

  light_color_r: biome_settings.light_color.r,
  light_color_g: biome_settings.light_color.g,
  light_color_b: biome_settings.light_color.b,
})

/** @type {Type.Module} */
export default function () {
  return {
    reduce(state, { type, payload }) {
      switch (type) {
        case 'action/postprocessing_changed':
          return {
            ...state,
            settings: {
              ...state.settings,
              postprocessing: payload,
            },
          }
        default:
          return state
      }
    },

    observe({ scene, signal, events, composer, camera, directional_light }) {
      const smaapass = new SMAAPass()

      const renderpass = new RenderPass(scene, camera)
      const cartoon_renderpass = new CartoonRenderpass(scene, camera)
      const gamma_correction = new ShaderPass(GammaCorrectionShader)

      const bloompass = new UnrealBloomPass(
        new Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85,
      )
      bloompass.threshold = 0.9
      bloompass.strength = 0.2
      bloompass.radius = 0.2

      smaapass.renderToScreen = true

      const underwater_pass = new UnderwaterPass()
      const godrays_pass = new GodraysPass(camera)
      const volumetric_fog_pass = new VolumetricFogRenderpass(
        camera,
        directional_light.shadow,
      )

      composer.addPass(renderpass)
      composer.addPass(cartoon_renderpass)
      composer.addPass(volumetric_fog_pass)
      composer.addPass(godrays_pass)
      composer.addPass(underwater_pass)
      composer.addPass(bloompass)
      composer.addPass(gamma_correction)
      composer.addPass(smaapass)

      context.events.on('UPDATE_FOG', to_biome_settings => {
        if (current_fog_tween_fade_in || current_fog_tween_fade_out) {
          current_fog_tween_fade_in?.stop()
          current_fog_tween_fade_out?.stop()
        }

        const from = build_fog_settings(volumetric_fog_pass)
        const to = build_fog_settings(to_biome_settings)
        const no_fog = build_fog_settings({
          uniformity: 0,
          smoothness: 0,
          fog_density: 0,

          fog_color: new Color(0xffffff),
          light_color: new Color(0xffffff),

          ambient_light_intensity: 0,
          direct_light_intensity: 0,

          raymarching_step: 0.1,
          downscaling: 0,
        })

        current_fog_tween_fade_in = new TWEEN.Tween(from)
          .to(no_fog, 1000)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(() => {
            apply_fog_settings(volumetric_fog_pass, from)
          })

        current_fog_tween_fade_out = new TWEEN.Tween(no_fog)
          .to(to, 1000)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(() => {
            apply_fog_settings(volumetric_fog_pass, no_fog)
          })
          .onComplete(() => {
            const settings = { ...get_state().settings }
            settings.postprocessing.version++
            Object.assign(settings.postprocessing.volumetric_fog_pass, {
              ...to_biome_settings,
              fog_color: Number(
                '0x' + to_biome_settings.fog_color.getHexString(),
              ),
              light_color: Number(
                '0x' + to_biome_settings.light_color.getHexString(),
              ),
            })
            context.dispatch(
              'action/postprocessing_changed',
              settings.postprocessing,
            )
            context.events.emit('UPDATE_DAT_GUI', null)
          })

        current_fog_tween_fade_in.chain(current_fog_tween_fade_out)
        current_fog_tween_fade_in.start()
      })

      state_iterator().reduce(
        (
          {
            last_postprocessing_version,
            last_camera_is_underwater,
            last_water_color,

            last_sky_lights_version,
          },
          state,
        ) => {
          const { postprocessing } = state.settings
          const camera_is_underwater = state.settings.camera.is_underwater

          const postprocessing_changed =
            postprocessing.version !== last_postprocessing_version ||
            camera_is_underwater !== last_camera_is_underwater

          if (postprocessing_changed) {
            last_postprocessing_version = postprocessing.version
            last_camera_is_underwater = camera_is_underwater
            cartoon_renderpass.enabled = postprocessing.cartoon_pass.enabled
            cartoon_renderpass.enable_thick_lines =
              postprocessing.cartoon_pass.thick_lines

            renderpass.enabled = !cartoon_renderpass.enabled

            godrays_pass.enabled = postprocessing.godrays_pass.enabled
            godrays_pass.light_size = postprocessing.godrays_pass.light_size
            godrays_pass.max_intensity =
              postprocessing.godrays_pass.max_intensity
            godrays_pass.exposure = postprocessing.godrays_pass.exposure
            godrays_pass.samplesCount = postprocessing.godrays_pass.samplesCount
            godrays_pass.density = postprocessing.godrays_pass.density

            volumetric_fog_pass.enabled =
              postprocessing.volumetric_fog_pass.enabled
            volumetric_fog_pass.uniformity =
              postprocessing.volumetric_fog_pass.uniformity
            volumetric_fog_pass.smoothness =
              postprocessing.volumetric_fog_pass.smoothness
            volumetric_fog_pass.fog_density =
              postprocessing.volumetric_fog_pass.fog_density
            volumetric_fog_pass.fog_color.set(
              postprocessing.volumetric_fog_pass.fog_color,
            )
            volumetric_fog_pass.light_color.set(
              postprocessing.volumetric_fog_pass.light_color,
            )
            volumetric_fog_pass.ambient_light_intensity =
              postprocessing.volumetric_fog_pass.ambient_light_intensity
            volumetric_fog_pass.direct_light_intensity =
              postprocessing.volumetric_fog_pass.direct_light_intensity
            volumetric_fog_pass.raymarching_step =
              postprocessing.volumetric_fog_pass.raymarching_step
            volumetric_fog_pass.downscaling =
              postprocessing.volumetric_fog_pass.downscaling

            bloompass.enabled = postprocessing.bloom_pass.enabled
            bloompass.strength = postprocessing.bloom_pass.strength

            underwater_pass.enabled =
              postprocessing.underwater_pass.enabled && camera_is_underwater
          }

          const water_color = state.settings.water.color
          if (!last_water_color || !last_water_color.equals(water_color)) {
            last_water_color = water_color
            underwater_pass.color = last_water_color
          }

          const lights_changed =
            state.settings.sky.lights.version !== last_sky_lights_version
          if (lights_changed) {
            last_sky_lights_version = state.settings.sky.lights.version
            godrays_pass.light_direction =
              state.settings.sky.lights.godrays.position.clone()
            godrays_pass.light_color = state.settings.sky.lights.godrays.color
              .clone()
              .multiplyScalar(state.settings.sky.lights.godrays.intensity)
          }

          return {
            last_postprocessing_version,
            last_camera_is_underwater,
            last_water_color,
            last_sky_lights_version,
          }
        },
        {
          last_postprocessing_version: 0,
          last_camera_is_underwater: false,
          last_water_color: null,

          last_sky_lights_version: 0,
        },
      )

      signal.addEventListener(
        'abort',
        () => {
          composer.removePass(renderpass)
          composer.removePass(cartoon_renderpass)
          composer.removePass(underwater_pass)
          composer.removePass(bloompass)
          // composer.removePass(gtaopass)
          // composer.removePass(n8aopass)
          composer.removePass(gamma_correction)
          composer.removePass(smaapass)
          // composer.removePass(outputpass)
        },
        { once: true },
      )
    },
  }
}
