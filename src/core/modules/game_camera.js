import { on } from 'events'

import { aiter } from 'iterator-helper'
import CameraControls from 'camera-controls'
import { clamp, smootherstep } from 'three/src/math/MathUtils.js'

import { abortable } from '../utils/iterator.js'
import { current_three_character } from '../game/game.js'

const CAMERA_MIN_DISTANCE = 0.001
const CAMERA_DISTANCE_STEP = 1
const CAMERA_MAX_DISTANCE = 50

/** @type {Type.Module} */
export default function () {
  return {
    tick(state, { camera_controls }, delta) {
      const player = current_three_character(state)
      if (!player?.position) return

      const {
        settings: { free_camera },
      } = state

      if (!free_camera) {
        const { x, y, z } = player.position

        const center_camera_on_head =
          1 - smootherstep(camera_controls.distance, 0, 10)
        const head_height = 1
        const y_shift = head_height * center_camera_on_head
        camera_controls.moveTo(x, y + y_shift, z, true)
        camera_controls.setTarget(x, y + y_shift, z, true)

        if (typeof player.object3d !== 'undefined') {
          player.object3d.visible = camera_controls.distance > 0.75
        }
      }
      camera_controls.update(delta)
    },
    observe({ events, camera, camera_controls, renderer, signal }) {
      function set_camera_padding(top, right, bottom, left) {
        const full_width = window.innerWidth - left + right
        const full_height = window.innerHeight - top + bottom
        const width_offset = -left + right
        const height_offset = -top + bottom
        const view_width = window.innerWidth
        const view_height = window.innerHeight
        camera.setViewOffset(
          full_width,
          full_height,
          width_offset,
          height_offset,
          view_width,
          view_height,
        )
        camera.updateProjectionMatrix()
      }

      camera_controls.dollyDragInverted = true
      camera_controls.dollyToCursor = true
      camera_controls.maxDistance = CAMERA_MAX_DISTANCE
      camera_controls.minDistance = CAMERA_MIN_DISTANCE
      camera_controls.smoothTime = 0.1
      camera_controls.dollyTo(8)
      camera_controls.rotate(0, 1)

      set_camera_padding(200, 0, 0, 0)

      // let is_dragging = false

      const set_distance = distance => {
        distance = clamp(distance, CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE)
        distance = Math.round(distance)
        camera_controls.dollyTo(distance, true)
      }

      const on_mouse_down = () => {
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

      aiter(abortable(on(events, 'STATE_UPDATED', { signal }))).reduce(
        (
          last_free_camera,
          [
            {
              settings: { free_camera },
            },
          ],
        ) => {
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
              set_camera_padding(0, 0, 0, 0)
              // @ts-ignore
              camera_controls.mouseButtons.right = CameraControls.ACTION.OFFSET
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
              set_camera_padding(200, 0, 0, 0)
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
