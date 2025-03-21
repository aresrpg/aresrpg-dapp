import { Rain, Snow } from '@aresrpg/aresrpg-engine'
import { Color, Object3D } from 'three'
import { BiomeType } from '@aresrpg/aresrpg-world'
import * as TWEEN from '@tweenjs/tween.js'

import { CartoonRenderpass } from '../game/rendering/cartoon_renderpass.js'
import { context, current_three_character } from '../game/game.js'


const COLD_BIOME = [BiomeType.Arctic, BiomeType.Glacier, BiomeType.Taiga]
const HOT_BIOME = [BiomeType.Desert, BiomeType.Scorched]

const CYCLE_DURATION = 10 * 60 * 1000 // 10 minutes in milliseconds
const RAIN_DURATION = 3 * 60 * 1000 // 3 minutes in milliseconds

let current_biome = null
let current_fog_tween = null

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

const dispatch_postprocessing_change = settings => {
  settings.postprocessing.version++
  context.dispatch('action/postprocessing_changed', settings.postprocessing)
}

function tween_fog_to(target_biome_settings, state, duration = 1000) {
  const fog_pass = state.settings.postprocessing.volumetric_fog_pass

  // Stop previous tween if exists
  if (current_fog_tween) {
    current_fog_tween.stop()
  }

  // Setup initial values for tweening
  const from = {
    uniformity: fog_pass.uniformity,
    smoothness: fog_pass.smoothness,
    fog_density: fog_pass.fog_density,

    ambient_light_intensity: fog_pass.ambient_light_intensity,
    direct_light_intensity: fog_pass.direct_light_intensity,

    raymarching_step: fog_pass.raymarching_step,
    downscaling: fog_pass.downscaling,

    fog_color_r: fog_pass.fog_color.r,
    fog_color_g: fog_pass.fog_color.g,
    fog_color_b: fog_pass.fog_color.b,

    light_color_r: fog_pass.light_color.r,
    light_color_g: fog_pass.light_color.g,
    light_color_b: fog_pass.light_color.b,
  }

  const to = {
    uniformity: target_biome_settings.uniformity,
    smoothness: target_biome_settings.smoothness,
    fog_density: target_biome_settings.fog_density,

    ambient_light_intensity: target_biome_settings.ambient_light_intensity,
    direct_light_intensity: target_biome_settings.direct_light_intensity,

    raymarching_step: target_biome_settings.raymarching_step,
    downscaling: target_biome_settings.downscaling,

    fog_color_r: target_biome_settings.fog_color.r,
    fog_color_g: target_biome_settings.fog_color.g,
    fog_color_b: target_biome_settings.fog_color.b,

    light_color_r: target_biome_settings.light_color.r,
    light_color_g: target_biome_settings.light_color.g,
    light_color_b: target_biome_settings.light_color.b,
  }

  // Create new tween
  current_fog_tween = new TWEEN.Tween(from)
    .to(to, duration)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(() => {
      fog_pass.uniformity = from.uniformity
      fog_pass.smoothness = from.smoothness
      fog_pass.fog_density = from.fog_density

      fog_pass.ambient_light_intensity = from.ambient_light_intensity
      fog_pass.direct_light_intensity = from.direct_light_intensity

      fog_pass.raymarching_step = from.raymarching_step
      fog_pass.downscaling = from.downscaling

      fog_pass.fog_color = new Color(
        from.fog_color_r,
        from.fog_color_g,
        from.fog_color_b,
      )
      fog_pass.light_color = new Color(
        from.light_color_r,
        from.light_color_g,
        from.light_color_b,
      )

      dispatch_postprocessing_change(state.settings)
    })
    .start()
}

const FOG_BIOMES = {
  default: {
    uniformity: 0.53,
    smoothness: 0.31,
    fog_density: 0.052,

    fog_color: new Color(0xffffff),
    light_color: new Color(0xffffff),

    ambient_light_intensity: 0,
    direct_light_intensity: 0.07,

    raymarching_step: 0.9,
    downscaling: 2,
  },

  scorched: {
    uniformity: 0.54,
    smoothness: 1,
    fog_density: 0.063,

    fog_color: new Color(0xffffff),
    light_color: new Color(0x9e7b7b),

    ambient_light_intensity: 0,
    direct_light_intensity: 0.11,

    raymarching_step: 0.9,
    downscaling: 2,
  },

  artic: {
    uniformity: 0.33,
    smoothness: 0.73,
    fog_density: 0.01,

    fog_color: new Color(0xffffff),
    light_color: new Color(0xb7e2ff),

    ambient_light_intensity: 0.09,
    direct_light_intensity: 0.29,

    raymarching_step: 0.9,
    downscaling: 2,
  },

  desert: {
    uniformity: 0.31,
    smoothness: 0.95,
    fog_density: 0.01,

    fog_color: new Color(0xffffff),
    light_color: new Color(0xad9b51),

    ambient_light_intensity: 0.2,
    direct_light_intensity: 1.19,

    raymarching_step: 0.9,
    downscaling: 2,
  },

  swamp: {
    uniformity: 0.53,
    smoothness: 0.37,
    fog_density: 0.021,

    fog_color: new Color(0x80aa93),
    light_color: new Color(0xffffff),

    ambient_light_intensity: 0.61,
    direct_light_intensity: 0,

    raymarching_step: 0.9,
    downscaling: 2,
  },
}

/** @type {Type.Module} */
export default function () {
  let /** @type Object3D */ weather_container
  let /** @type Snow */ snow
  let /** @type Rain */ rain

  return {
    reduce(state) {
      const CURRENT_BIOME = get_biome()
      if (current_biome !== CURRENT_BIOME) {
        current_biome = CURRENT_BIOME

        // console.log('current_biome change', current_biome)

        if (FOG_BIOMES[current_biome])
          tween_fog_to(FOG_BIOMES[current_biome], state)
        else tween_fog_to(FOG_BIOMES.default, state)
      }

      const IS_RAINING = is_raining(Date.now())
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
