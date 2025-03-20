import { Rain, Snow } from '@aresrpg/aresrpg-engine'
import { Object3D } from 'three'
import { BiomeType } from '@aresrpg/aresrpg-world'

import { CartoonRenderpass } from '../game/rendering/cartoon_renderpass.js'
import { context, current_three_character } from '../game/game.js'

const COLD_BIOME = [BiomeType.Arctic, BiomeType.Glacier, BiomeType.Taiga]
const HOT_BIOME = [BiomeType.Desert, BiomeType.Scorched]

const CYCLE_DURATION = 10 * 60 * 1000 // 10 minutes in milliseconds
const RAIN_DURATION = 3 * 60 * 1000 // 3 minutes in milliseconds

/**
 * Check if it's raining at the current time
 * @param {number} current_time - Current time in milliseconds
 * @returns {boolean} - True if it's raining, false otherwise
 */
function is_raining(current_time) {
  const cycle_position = current_time % CYCLE_DURATION
  return cycle_position < RAIN_DURATION
}

/**
 * Get the current biome type
 * @returns {BiomeType} - The current biome type
 */
function get_biome() {
  const position = current_three_character()?.position
  return position
    ? context.world.biome.getBiomeType(position)
    : BiomeType.Grassland
}

/** @type {Type.Module} */
export default function () {
  let /** @type Object3D */ weather_container
  let /** @type Snow */ snow
  let /** @type Rain */ rain

  return {
    reduce(state) {
      const IS_RAINING = is_raining(Date.now())
      const CURRENT_BIOME = get_biome()
      const IS_HOT_BIOME = HOT_BIOME.includes(CURRENT_BIOME)
      if (
        (!IS_RAINING || IS_HOT_BIOME) &&
        (rain.container.visible || snow.container.visible)
      ) {
        rain.container.visible = false
        snow.container.visible = false
      } else if (IS_RAINING && !IS_HOT_BIOME) {
        if (COLD_BIOME.includes(CURRENT_BIOME)) {
          rain.container.visible = false
          snow.container.visible = true
        } else {
          rain.container.visible = true
          snow.container.visible = false
        }
      }
      return state
    },
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

      snow.container.visible = false
      rain.container.visible = false
    },
  }
}
