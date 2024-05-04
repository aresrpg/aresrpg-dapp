import { on } from 'events'

import {
  AmbientLight,
  CameraHelper,
  Color,
  DirectionalLight,
  DirectionalLightHelper,
  Vector3,
} from 'three'
import { aiter } from 'iterator-helper'

import { abortable } from '../utils/iterator.js'
import { current_character_position } from '../game/game.js'

const CAMERA_SHADOW_FAR = 500
const CAMERA_SHADOW_NEAR = 0.1
const CAMERA_SHADOW_SIZE = 100

function distance_between(position1, position2) {
  const { x, y, z } = position1
  const { x: x2, y: y2, z: z2 } = position2
  return Math.sqrt((x - x2) ** 2 + (y - y2) ** 2 + (z - z2) ** 2)
}

/** @type {Type.Module} */
export default function () {
  return {
    observe({ scene, events, signal }) {
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
      // scene.add(dirlight_helper)
      // scene.add(dircamera_helper)

      function update_directional_light_position(
        /** @type Vector3 */ light_position,
        /** @type Vector3 */ player_position,
      ) {
        const light_target_position = player_position.clone
          ? player_position.clone()
          : new Vector3(player_position.x, player_position.y, player_position.z)

        const light_position_offset = light_position.clone().multiplyScalar(400)
        directional_light.position
          .copy(light_target_position)
          .add(light_position_offset)
        directional_light.target.position.copy(light_target_position)
      }

      function update_sky_lights_color(sky_lights) {
        scene.fog.color = sky_lights.fog.color.clone()

        directional_light.color = sky_lights.directional.color
        directional_light.intensity = sky_lights.directional.intensity

        ambient_light.color = sky_lights.ambient.color
        ambient_light.intensity = sky_lights.ambient.intensity
      }

      aiter(abortable(on(events, 'STATE_UPDATED', { signal }))).reduce(
        ({ last_sky_lights_version, last_player_position }, [state]) => {
          const lights_changed =
            state.settings.sky.lights.version !== last_sky_lights_version
          const player_position = current_character_position(state)

          if (lights_changed) {
            last_sky_lights_version = state.settings.sky.lights.version
            update_sky_lights_color(state.settings.sky.lights)
          }

          if (last_player_position && player_position) {
            const player_moved =
              distance_between(last_player_position, player_position) > 5

            if (lights_changed || player_moved) {
              update_directional_light_position(
                state.settings.sky.lights.directional.position,
                last_player_position,
              )
            }
          }

          return {
            last_sky_lights_version,
            last_player_position: player_position,
          }
        },
        {
          last_sky_lights_version: 0,
          last_player_position: null,
        },
      )
    },
  }
}
