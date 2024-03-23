import { setInterval } from 'timers/promises'

import {
  AmbientLight,
  CameraHelper,
  Color,
  DirectionalLight,
  DirectionalLightHelper,
  PlaneGeometry,
  RepeatWrapping,
  TextureLoader,
  Vector3,
} from 'three'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { aiter } from 'iterator-helper'
import { CHUNK_SIZE, to_chunk_position } from '@aresrpg/aresrpg-protocol'

import water_normal from '../../assets/waternormals.jpg'
import { abortable } from '../core-utils/iterator.js'

export const DAY_DURATION = 20000 // 10 minutes in milliseconds
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
    observe({ scene, signal, get_state, events }) {
      // lights
      const ambiant_light = new AmbientLight(0xffffff, 1.5)

      const directionalLight = new DirectionalLight(0xffffff, 1)
      const dirlight_helper = new DirectionalLightHelper(directionalLight, 10)
      const dircamera_helper = new CameraHelper(directionalLight.shadow.camera)

      directionalLight.castShadow = true
      directionalLight.shadow.mapSize.width = 4096 // Adjust as needed for performance/quality
      directionalLight.shadow.mapSize.height = 4096

      directionalLight.shadow.camera.near = CAMERA_SHADOW_NEAR
      directionalLight.shadow.camera.far = CAMERA_SHADOW_FAR
      directionalLight.shadow.camera.left = -CAMERA_SHADOW_SIZE
      directionalLight.shadow.camera.right = CAMERA_SHADOW_SIZE
      directionalLight.shadow.camera.top = CAMERA_SHADOW_SIZE
      directionalLight.shadow.camera.bottom = -CAMERA_SHADOW_SIZE
      directionalLight.shadow.bias = -0.000005 // This value may need tweaking

      directionalLight.shadow.camera.updateProjectionMatrix()
      dircamera_helper.update()

      scene.add(ambiant_light)
      scene.add(directionalLight)
      scene.add(directionalLight.target)
      scene.add(dirlight_helper)
      scene.add(dircamera_helper)

      // water
      water.position.y = 9.5
      water.rotation.x = -Math.PI / 2

      scene.add(water)

      let day_time = DAY_DURATION * 0.7 // Track the time of day as a value between 0 and DAY_DURATION
      const day_time_step = 100 // How much ms between updates

      daytimePaused = get_state().settings.sky.paused
      events.on('SKY_CYCLE_PAUSED', paused => (daytimePaused = paused))
      events.on('SKY_CYCLE_CHANGED', ({ value, fromUi }) => {
        if (fromUi) {
          day_time = value * DAY_DURATION
        }
      })

      events.on('SKY_FOGCOLOR_CHANGED', color => {
        scene.fog.color = color.clone().lerp(new Color('#000000'), 0.4)
      })

      events.on(
        'SKY_LIGHT_COLOR_CHANGED',
        color => (directionalLight.color = color),
      )
      let sunRelativePosition = new Vector3(0, 1, 0)
      events.on('SKY_LIGHT_MOVED', position => {
        sunRelativePosition = position.clone()
        recomputeSunPosition()
      })

      events.on('SKY_LIGHT_INTENSITY_CHANGED', intensity => {
        directionalLight.intensity = intensity
      })

      function recomputeSunPosition() {
        const chunk_position = get_player_chunk_position()

        const light_base_position = new Vector3(
          chunk_position.x * CHUNK_SIZE,
          300,
          chunk_position.z * CHUNK_SIZE,
        )
        const light_target_position = light_base_position.clone().setY(0)

        // Calculate the sun and moon position relative to the base position
        const sun_position_offset = sunRelativePosition
          .clone()
          .multiplyScalar(200)
        directionalLight.position
          .copy(light_base_position)
          .add(sun_position_offset)
        directionalLight.target.position.copy(light_target_position)
      }
      recomputeSunPosition()

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

      function triggerSkyCycleChange() {
        events.emit('SKY_CYCLE_CHANGED', {
          value: day_time / DAY_DURATION,
          fromUi: false,
        })
      }

      function update_cycle() {
        if (!daytimePaused) {
          // Update day_time and calculate day_ratio
          day_time = (day_time + day_time_step) % DAY_DURATION
          triggerSkyCycleChange()
        }
      }
      triggerSkyCycleChange()
      update_cycle()

      aiter(abortable(setInterval(day_time_step, null, { signal }))).forEach(
        update_cycle,
      )
    },
  }
}
