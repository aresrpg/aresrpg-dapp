import { on } from 'events'

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
import { CHUNK_SIZE, to_chunk_position } from '@aresrpg/aresrpg-protocol'
import { aiter } from 'iterator-helper'

import water_normal from '../../assets/waternormals.jpg'
import { abortable } from '../utils/iterator.js'

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

  return {
    name: 'game_nature',
    tick() {
      water.material.uniforms.time.value += 1.0 / 60.0
    },
    observe({ scene, get_state, events, signal }) {
      // lights
      const ambient_light = new AmbientLight(0xffffff, 1.5)

      const directional_light = new DirectionalLight(0xffffff, 1)
      const dirlight_helper = new DirectionalLightHelper(directional_light, 10)
      const dircamera_helper = new CameraHelper(directional_light.shadow.camera)

      directional_light.castShadow = true
      directional_light.shadow.mapSize.width = 4096 // Adjust as needed for performance/quality
      directional_light.shadow.mapSize.height = 4096

      directional_light.shadow.camera.near = CAMERA_SHADOW_NEAR
      directional_light.shadow.camera.far = CAMERA_SHADOW_FAR
      directional_light.shadow.camera.left = -CAMERA_SHADOW_SIZE
      directional_light.shadow.camera.right = CAMERA_SHADOW_SIZE
      directional_light.shadow.camera.top = CAMERA_SHADOW_SIZE
      directional_light.shadow.camera.bottom = -CAMERA_SHADOW_SIZE
      directional_light.shadow.bias = -0.000005 // This value may need tweaking

      directional_light.shadow.camera.updateProjectionMatrix()
      dircamera_helper.update()

      scene.add(ambient_light)
      scene.add(directional_light)
      scene.add(directional_light.target)
      scene.add(dirlight_helper)
      scene.add(dircamera_helper)

      // water
      water.position.y = 9.5
      water.rotation.x = -Math.PI / 2

      scene.add(water)

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

      function update_directional_light_position(
        /** @type Vector3 */ light_position,
      ) {
        const chunk_position = get_player_chunk_position()

        const light_base_position = new Vector3(
          chunk_position.x * CHUNK_SIZE,
          300,
          chunk_position.z * CHUNK_SIZE,
        )
        const light_target_position = light_base_position.clone().setY(0)

        // Calculate the sun and moon position relative to the base position
        const sun_position_offset = light_position.clone().multiplyScalar(200)
        directional_light.position
          .copy(light_base_position)
          .add(sun_position_offset)
        directional_light.target.position.copy(light_target_position)
      }

      function apply_sky_lights(sky_lights) {
        scene.fog.color = sky_lights.fog.color
          .clone()
          .lerp(new Color('#000000'), 0.4)

        update_directional_light_position(sky_lights.directional.position)
        directional_light.color = sky_lights.directional.color
        directional_light.intensity = sky_lights.directional.intensity

        ambient_light.color = sky_lights.ambient.color
        ambient_light.intensity = sky_lights.ambient.intensity
      }

      aiter(abortable(on(events, 'STATE_UPDATED', { signal }))).reduce(
        (sky_lights_version, [state]) => {
          if (state.settings.sky.lights.version !== sky_lights_version) {
            sky_lights_version = state.settings.sky.lights.version
            apply_sky_lights(state.settings.sky.lights)
          }
          return state.settings.sky.lights.version
        },
      )
    },
  }
}
