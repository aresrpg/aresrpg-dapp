import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Color, PointLight, Vector2 } from 'three'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'

import { CartoonRenderpass } from '../game/rendering/cartoon_renderpass.js'
import { state_iterator } from '../utils/iterator.js'
import { UnderwaterPass } from '../game/rendering/underwater_pass.js'
import { GodraysPass } from '../game/rendering/godrays_pass.js'

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

    observe({ scene, signal, composer, camera, directional_light }) {
      const smaapass = new SMAAPass(window.innerWidth, window.innerHeight)

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
      const godraysPass = new GodraysPass(camera);

      composer.addPass(renderpass)
      composer.addPass(cartoon_renderpass)
      composer.addPass(godraysPass);
      composer.addPass(underwater_pass)
      composer.addPass(bloompass)
      composer.addPass(gamma_correction)
      composer.addPass(smaapass)

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

            godraysPass.enabled = postprocessing.godrays_pass.enabled
            godraysPass.exposure = postprocessing.godrays_pass.exposure
            godraysPass.samplesCount = postprocessing.godrays_pass.samplesCount
            godraysPass.density = postprocessing.godrays_pass.density

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
            godraysPass.light_direction = state.settings.sky.lights.directional.position.clone();
            godraysPass.light_color = new Color().lerp(state.settings.sky.lights.directional.color, state.settings.sky.lights.directional.intensity);
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
