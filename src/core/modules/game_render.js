// import { N8AOPass } from 'n8ao'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
// import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Vector2 } from 'three'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'

import { CartoonRenderpass } from '../game/rendering/cartoon_renderpass.js'
import { state_iterator } from '../utils/iterator.js'
import { UnderwaterPass } from '../game/rendering/underwater_pass.js'

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

    observe({ scene, signal, composer, camera, pool, events }) {
      const smaapass = new SMAAPass(window.innerWidth, window.innerHeight)
      // const n8aopass = new N8AOPass(
      //   scene,
      //   camera,
      //   window.innerWidth,
      //   window.innerHeight,
      // )

      const gtaopass = new GTAOPass(
        scene,
        camera,
        window.innerWidth,
        window.innerHeight,
      )
      const renderpass = new RenderPass(scene, camera)
      const cartoon_renderpass = new CartoonRenderpass(scene, camera)
      // const outputpass = new OutputPass()
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

      gtaopass.output = GTAOPass.OUTPUT.Default

      // n8aopass.configuration.aoRadius = 1
      // n8aopass.configuration.distanceFalloff = 5.0
      // n8aopass.configuration.intensity = 5.0

      // n8aopass.setDisplayMode('Split AO')
      // n8aopass.configuration.aoSamples = 64
      // n8aopass.configuration.denoiseSamples = 8
      // n8aopass.configuration.denoiseRadius = 6

      // Add this after the outline pass is created

      const underwater_pass = new UnderwaterPass()

      composer.addPass(renderpass)
      composer.addPass(cartoon_renderpass)
      composer.addPass(underwater_pass)
      composer.addPass(bloompass)
      // composer.addPass(gtaopass)
      // composer.addPass(n8aopass)
      composer.addPass(gamma_correction)
      composer.addPass(smaapass)
      // composer.addPass(outputpass)

      state_iterator().reduce(
        (
          { last_postprocessing_version, last_camera_is_underwater },
          {
            settings: {
              postprocessing,
              camera: { is_underwater },
            },
          },
        ) => {
          const postprocessing_changed =
            postprocessing.version !== last_postprocessing_version ||
            is_underwater !== last_camera_is_underwater

          if (postprocessing_changed) {
            last_camera_is_underwater = is_underwater
            last_postprocessing_version = postprocessing.version
            cartoon_renderpass.enabled = postprocessing.cartoon_pass.enabled
            cartoon_renderpass.enable_thick_lines =
              postprocessing.cartoon_pass.thick_lines

            renderpass.enabled = !cartoon_renderpass.enabled

            bloompass.enabled = postprocessing.bloom_pass.enabled
            bloompass.strength = postprocessing.bloom_pass.strength
            underwater_pass.enabled =
              postprocessing.underwater_pass.enabled && is_underwater
          }

          return {
            last_postprocessing_version,
            last_camera_is_underwater,
          }
        },
        {
          last_postprocessing_version: 0,
          last_camera_is_underwater: false,
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
