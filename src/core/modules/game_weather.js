import { Rain, Snow } from '@aresrpg/aresrpg-engine'
import { Object3D } from 'three'

import { CartoonRenderpass } from '../game/rendering/cartoon_renderpass.js'

/** @type {Type.Module} */
export default function () {
  let /** @type Object3D */ weather_container
  let /** @type Snow */ snow
  let /** @type Rain */ rain

  return {
    tick(_state, { renderer, camera }) {
      if (snow.container.parent && snow.container.visible) {
        snow.update(renderer, camera)
      }
      if (rain.container.parent && rain.container.visible) {
        rain.update(renderer, camera)
      }
    },
    observe({ scene, renderer }) {
      weather_container = new Object3D()
      weather_container.name = 'weather-container'
      scene.add(weather_container)
      
      snow = new Snow(renderer)
      weather_container.add(snow.container)
      snow.setParticlesCount(5000)
      
      rain = new Rain(renderer)
      weather_container.add(rain.container)
      rain.setParticlesCount(5000)
      
      weather_container.layers.set(CartoonRenderpass.non_outlined_layer)
      weather_container.traverse(child => {
        child.layers.set(CartoonRenderpass.non_outlined_layer)
      })

      snow.container.visible = true
      rain.container.visible = false
    },
  }
}
