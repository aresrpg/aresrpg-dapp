import { setInterval } from 'timers/promises'

import {
  AmbientLight,
  CameraHelper,
  Color,
  DirectionalLight,
  DirectionalLightHelper,
  MathUtils,
  PMREMGenerator,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  TextureLoader,
  Vector3,
} from 'three'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { aiter } from 'iterator-helper'
import { CHUNK_SIZE, to_chunk_position } from '@aresrpg/aresrpg-protocol'

import water_normal from '../../assets/waternormals.jpg'
import { abortable } from '../core-utils/iterator.js'

const Colors = {
  sunrise: new Color(0xffa500),
  noon: new Color(0xffffff),
  sunset: new Color(0xff4500),
  night: new Color(0x0000ff),
}

export const DAY_DURATION = 600000 // 10 minutes in milliseconds
const CAMERA_SHADOW_FAR = 500
const CAMERA_SHADOW_NEAR = 0.1
const CAMERA_SHADOW_SIZE = 100

/** @type {Type.Module} */
export default function () {
  const water_geometry = new PlaneGeometry(10000, 10000)
  const water = new Water(water_geometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new TextureLoader().load(water_normal, function (texture) {
      texture.wrapS = texture.wrapT = RepeatWrapping
    }),
    sunDirection: new Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
    fog: true,
  })

  let daytimePaused = false

  return {
    name: 'game_nature',
    tick() {
      if (water) water.material.uniforms.time.value += 1.0 / 60.0
    },
    observe({ scene, renderer, signal, get_state, events }) {
      // lights
      const ambiant_light = new AmbientLight(0xffffff, 1.5)

      const sunlight = new DirectionalLight(0xffffff, 1)
      const sunlight_helper = new DirectionalLightHelper(sunlight, 10)
      const suncamera_helper = new CameraHelper(sunlight.shadow.camera)

      sunlight.castShadow = true
      sunlight.shadow.mapSize.width = 4096 // Adjust as needed for performance/quality
      sunlight.shadow.mapSize.height = 4096

      sunlight.shadow.camera.near = CAMERA_SHADOW_NEAR
      sunlight.shadow.camera.far = CAMERA_SHADOW_FAR
      sunlight.shadow.camera.left = -CAMERA_SHADOW_SIZE
      sunlight.shadow.camera.right = CAMERA_SHADOW_SIZE
      sunlight.shadow.camera.top = CAMERA_SHADOW_SIZE
      sunlight.shadow.camera.bottom = -CAMERA_SHADOW_SIZE
      sunlight.shadow.bias = -0.000005 // This value may need tweaking

      sunlight.shadow.camera.updateProjectionMatrix()
      suncamera_helper.update()

      scene.add(ambiant_light)
      scene.add(sunlight)
      scene.add(sunlight.target)
      scene.add(sunlight_helper)
      scene.add(suncamera_helper)

      // water
      water.position.y = 9.5
      water.rotation.x = -Math.PI / 2

      scene.add(water)

      // sun
      const sun = new Vector3()

      let day_time = DAY_DURATION * 0.7 // Track the time of day as a value between 0 and DAY_DURATION
      const day_time_step = 3000 // How much ms between updates

      daytimePaused = get_state().settings.sky.paused
      events.on('SKY_CYCLE_PAUSED', paused => (daytimePaused = paused))
      events.on('SKY_CYCLE_CHANGED', ({ value, fromUi }) => {
        if (fromUi) {
          day_time = value * DAY_DURATION
        }
      })

      events.on('SKY_SUNCOLOR_CHANGED', color => {
        sunlight.color = color
        scene.fog.color = color.clone().lerp(new Color('#000000'), 0.4)
      })

      function get_player_chunk_position() {
        try {
          const player = get_state()?.player
          if (!player) return new Vector3()
          return to_chunk_position(player.position)
        } catch (error) {
          console.error(error)
          return new Vector3()
        }
      }

      function update_cycle() {
        let day_ratio = day_time / DAY_DURATION

        if (!daytimePaused) {
          // Update day_time and calculate day_ratio
          day_time = (day_time + day_time_step) % DAY_DURATION
          day_ratio = day_time / DAY_DURATION
          events.emit('SKY_CYCLE_CHANGED', { value: day_ratio, fromUi: false })
        }

        const chunk_position = get_player_chunk_position()

        const light_base_position = new Vector3(
          chunk_position.x * CHUNK_SIZE,
          300,
          chunk_position.z * CHUNK_SIZE,
        )
        const light_target_position = light_base_position.clone().setY(0)

        // Calculate sun's position
        const angle = day_ratio * Math.PI * 2
        const sky_elevation = 90 - (Math.sin(angle) * 0.5 + 0.5) * 180
        const sky_azimuth = ((day_ratio * 360) % 360) - 180

        const phi = MathUtils.degToRad(90 - sky_elevation)
        const theta = MathUtils.degToRad(sky_azimuth)
        sun.setFromSphericalCoords(1, phi, theta)

        // Calculate the sun and moon position relative to the base position
        const sun_position_offset = sun.clone().multiplyScalar(200)
        sunlight.position.copy(light_base_position).add(sun_position_offset)
        sunlight.target.position.copy(light_target_position)

        const normalized_phi = phi / Math.PI
        const intensity =
          Math.min(0.2, Math.cos(normalized_phi * Math.PI) * 0.4) + 0.5

        sunlight.intensity = Math.max(0, intensity)
        ambiant_light.intensity = Math.max(0.5, intensity)
      }

      update_cycle()

      aiter(abortable(setInterval(day_time_step, null, { signal }))).forEach(
        update_cycle,
      )
    },
  }
}
