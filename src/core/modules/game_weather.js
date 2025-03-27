import { setInterval } from 'timers/promises'

import { to_chunk_position } from '@aresrpg/aresrpg-sdk/chunk'
import { Rain, Snow } from '@aresrpg/aresrpg-engine'
import { Color, Object3D } from 'three'
import { aiter } from 'iterator-helper'
import { BiomeType } from '@aresrpg/aresrpg-world'

import { abortable } from '../utils/iterator.js'
import { CartoonRenderpass } from '../game/rendering/cartoon_renderpass.js'
import { context, current_three_character } from '../game/game.js'

const BIOMES_WITH_SNOW = [BiomeType.Arctic, BiomeType.Glacier, BiomeType.Taiga]
const BIOMES_WITHOUT_RAIN = [BiomeType.Desert, BiomeType.Scorched]

const weather_container = new Object3D()
const snow = new Snow(context.renderer)
const rain = new Rain(context.renderer)

let rain_stop_timestamp = Date.now()

function update_weather(current_biome, snow, rain) {
  const can_rain = BIOMES_WITHOUT_RAIN.includes(current_biome)
  const can_snow = BIOMES_WITH_SNOW.includes(current_biome)
  const is_raining = rain_stop_timestamp > Date.now()

  if (
    (!is_raining || can_rain) &&
    (rain.container.visible || snow.container.visible)
  ) {
    rain.container.visible = false
    snow.container.visible = false
  } else if (is_raining && !can_rain) {
    if (can_snow && !snow.container.visible) {
      rain.container.visible = false
      snow.container.visible = true
    } else if (rain.container.visible) {
      rain.container.visible = true
      snow.container.visible = false
    }
  }
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
    tick(_state, { renderer, camera }) {
      if (snow.container.parent && snow.container.visible) {
        snow.update(renderer, camera)
      }
      if (rain.container.parent && rain.container.visible) {
        rain.update(renderer, camera)
      }
    },
    observe({ scene, renderer, signal, events }) {
      weather_container.name = 'weather-container'
      scene.add(weather_container)

      weather_container.add(snow.container)
      snow.setParticlesCount(5000)

      weather_container.add(rain.container)
      rain.setParticlesCount(5000)

      weather_container.layers.set(CartoonRenderpass.non_outlined_layer)
      weather_container.traverse(child => {
        child.layers.set(CartoonRenderpass.non_outlined_layer)
      })

      snow.container.visible = false
      rain.container.visible = false

      aiter(abortable(setInterval(500, null, { signal }))).reduce(
        ({ last_chunk_position, current_biome }) => {
          const state = get_state()
          const character = current_three_character(state)
          if (!character) return { last_chunk_position, current_biome }

          const chunk_position = to_chunk_position(character.position)
          if (
            last_chunk_position?.x === chunk_position?.x &&
            last_chunk_position?.z === chunk_position?.z
          )
            return { last_chunk_position, current_biome }

          const biome = context.world.biome.getBiomeType(character.position)
          if (current_biome === biome)
            return { last_chunk_position, current_biome }

          context.events.emit(
            'UPDATE_FOG',
            FOG_BIOMES[biome] || FOG_BIOMES.default,
          )
          update_weather(biome, snow, rain)

          return { last_chunk_position: chunk_position, current_biome: biome }
        },
        {
          last_chunk_position: { x: 0, z: 0 },
          current_biome: BiomeType.Grassland,
        },
      )

      aiter(abortable(setInterval(10000, null, { signal }))).forEach(() => {
        const state = get_state()
        const character = current_three_character(state)
        const is_raining = rain.container.visible || snow.container.visible

        if (!is_raining && Math.random() < 0.55) {
          rain_stop_timestamp = Date.now() + 3 * 60 * 1000
          update_weather(
            context.world.biome.getBiomeType(character.position),
            snow,
            rain,
          )
        }

        if (is_raining && Date.now() > rain_stop_timestamp) {
          update_weather(
            context.world.biome.getBiomeType(character.position),
            snow,
            rain,
          )
        }
      })
    },
  }
}
