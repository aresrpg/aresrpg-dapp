import { aiter } from 'iterator-helper'
import CameraControls from 'camera-controls'
import { clamp, smootherstep } from 'three/src/math/MathUtils.js'
import { Vector3 } from 'three'

import { abortable, state_iterator, typed_on } from '../utils/iterator.js'
import { context, current_three_character } from '../game/game.js'
import { sea_level } from '../utils/terrain/world_settings.js'

import { is_hovering_mob_group } from './player_entities_interract.js'

const CAMERA_MIN_DISTANCE = 0.001
const CAMERA_DISTANCE_STEP = 1
const CAMERA_MAX_DISTANCE = 50

/** @type {Type.Module} */
export default function () {
  return {
    tick(state, { camera_controls, dispatch, camera, physics }, delta) {
      const player = current_three_character(state)
      if (!player?.position) return

      const camera_state = state.settings.camera

      camera_controls.voxelmap_collisions = camera_state.is_free
        ? null
        : physics.voxelmap_collisions

      if (!camera_state.is_free) {
        const { x, y, z } = player.position

        // Set the perspective camera position to follow the player
        const center_camera_on_head =
          1 - smootherstep(camera_controls.distance, 0, 10)
        const head_height = 1
        const y_shift = state.current_fight
          ? -5
          : head_height * center_camera_on_head
        camera_controls.moveTo(x, y + y_shift, z, true)
        camera_controls.setTarget(x, y + y_shift, z, true)

        if (typeof player.object3d !== 'undefined') {
          player.object3d.visible = camera_controls.distance > 0.75
        }
      }
      camera_controls.update(delta)

      const is_underwater = camera.position.y <= sea_level
      if (camera_state.is_underwater !== is_underwater) {
        dispatch('action/camera_went_underwater', is_underwater)
      }
    },
    reduce(state, { type, payload }) {
      switch (type) {
        case 'action/camera_went_underwater':
          return {
            ...state,
            settings: {
              ...state.settings,
              camera: {
                ...state.settings.camera,
                is_underwater: payload,
              },
            },
          }
      }

      return state
    },
    observe({ events, camera_controls, renderer, signal }) {
      camera_controls.dollyDragInverted = true
      camera_controls.dollyToCursor = true
      camera_controls.maxDistance = CAMERA_MAX_DISTANCE
      camera_controls.minDistance = CAMERA_MIN_DISTANCE
      camera_controls.smoothTime = 0.1
      camera_controls.dollyTo(8)
      camera_controls.rotate(0, 1)

      // let is_dragging = false

      const set_distance = distance => {
        distance = clamp(distance, CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE)
        distance = Math.round(distance)
        camera_controls.dollyTo(distance, true)
      }

      const on_mouse_down = () => {
        if (context.get_state().current_fight || is_hovering_mob_group()) return
        // is_dragging = true
        renderer.domElement.requestPointerLock()
      }

      const on_mouse_wheel = event => {
        const delta_abs = Math.max(
          CAMERA_DISTANCE_STEP,
          0.35 * camera_controls.distance,
        )
        const delta = delta_abs * Math.sign(event.deltaY)
        set_distance(camera_controls.distance + delta)
      }

      renderer.domElement.addEventListener('mousedown', on_mouse_down, {
        signal,
      })

      aiter(abortable(typed_on(events, 'STATE_UPDATED', { signal }))).reduce(
        (last_free_camera, { settings: { camera } }) => {
          const free_camera = camera.is_free
          if (last_free_camera !== free_camera) {
            if (free_camera) {
              camera_controls.colliderMeshes = []
              camera_controls.maxDistance = 1000
              camera_controls.minDistance = 0
              renderer.domElement.removeEventListener(
                'mousedown',
                on_mouse_down,
              )
              renderer.domElement.removeEventListener('wheel', on_mouse_wheel)
              // @ts-ignore
              camera_controls.mouseButtons.right = CameraControls.ACTION.TRUCK
              // @ts-ignore
              camera_controls.mouseButtons.wheel = CameraControls.ACTION.DOLLY
            } else {
              camera_controls.maxDistance = CAMERA_MAX_DISTANCE
              camera_controls.minDistance = CAMERA_MIN_DISTANCE
              renderer.domElement.addEventListener('mousedown', on_mouse_down, {
                signal,
              })
              renderer.domElement.addEventListener('wheel', on_mouse_wheel, {
                signal,
              })
              set_distance(camera_controls.distance)
              // @ts-ignore
              camera_controls.mouseButtons.right = CameraControls.ACTION.ROTATE
              // @ts-ignore
              camera_controls.mouseButtons.wheel = CameraControls.ACTION.NONE
            }
          }
          return free_camera
        },
      )

      state_iterator().reduce((was_in_fight, { current_fight }) => {
        if (was_in_fight !== !!current_fight) {
          if (current_fight) context.switch_to_isometric()
          else context.switch_to_perspective()
        }

        return !!current_fight
      })

      window.addEventListener(
        'mouseup',
        () => {
          // is_dragging = false
          if (document.pointerLockElement === renderer.domElement) {
            document.exitPointerLock()
          }
        },
        { signal },
      )
    },
  }
}
