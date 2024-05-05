// import { N8AOPass } from 'n8ao'
import { on } from 'events'

import { aiter } from 'iterator-helper'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
// import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { CustomBlending, Vector2 } from 'three'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'

import { CartoonRenderpass } from '../game/rendering/cartoon_renderpass.js'
import { abortable } from '../utils/iterator.js'

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
      const outline = new OutlinePass(
        new Vector2(window.innerWidth, window.innerHeight),
        scene,
        camera,
      )

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

      outline.edgeThickness = 0.1

      // outlinepass.overlayMaterial.blendSrc = 1
      // outlinepass.overlayMaterial.blendDst = 1

      outline.visibleEdgeColor.set('#000000')
      outline.edgeStrength = 5
      outline.edgeGlow = 0

      outline.overlayMaterial.blending = CustomBlending
      // shared.outline.selectedObjects.push(instanced_volume)

      pool.register_outline(outline)

      const character_entities = [
        pool.iop_female,
        pool.iop_male,
        pool.sram_female,
        pool.sram_male,
      ]

      // add all the characters to the outline pass
      // and register a dispose event to remove them
      character_entities
        .map(entity => entity.instanced_entity)
        .forEach(({ body, on_dispose }) => {
          outline.selectedObjects.push(body)
          on_dispose(() => {
            outline.selectedObjects.splice(
              outline.selectedObjects.indexOf(body),
              1,
            )
          })
        })

      // Add this after the outline pass is created

      composer.addPass(renderpass)
      composer.addPass(cartoon_renderpass)
      composer.addPass(bloompass)
      // composer.addPass(gtaopass)
      // composer.addPass(n8aopass)
      composer.addPass(gamma_correction)
      composer.addPass(outline)
      composer.addPass(smaapass)
      // composer.addPass(outputpass)

      function apply_state(
        /** @type Type.PostProcessingState */ postprocessing,
      ) {
        cartoon_renderpass.enabled = postprocessing.cartoon_pass.enabled
        cartoon_renderpass.enable_thick_lines =
          postprocessing.cartoon_pass.thick_lines

        renderpass.enabled = !cartoon_renderpass.enabled

        bloompass.enabled = postprocessing.bloom_pass.enabled
        bloompass.strength = postprocessing.bloom_pass.strength

        outline.enabled = postprocessing.outline_pass.enabled
      }

      aiter(abortable(on(events, 'STATE_UPDATED', { signal }))).reduce(
        (
          { last_postprocessing_version },
          /** @type Type.State[] */ [state],
        ) => {
          const { postprocessing } = state.settings

          const postprocessing_changed =
            postprocessing.version !== last_postprocessing_version

          if (postprocessing_changed) {
            last_postprocessing_version = postprocessing.version
            apply_state(postprocessing)
          }

          return {
            last_postprocessing_version,
          }
        },
        {
          last_postprocessing_version: 0,
        },
      )

      signal.addEventListener(
        'abort',
        () => {
          composer.removePass(renderpass)
          composer.removePass(cartoon_renderpass)
          composer.removePass(bloompass)
          // composer.removePass(gtaopass)
          // composer.removePass(n8aopass)
          composer.removePass(gamma_correction)
          composer.removePass(outline)
          composer.removePass(smaapass)
          // composer.removePass(outputpass)
        },
        { once: true },
      )
    },
  }
}
