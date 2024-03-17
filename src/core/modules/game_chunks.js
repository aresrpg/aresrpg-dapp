import { on } from 'events'
import { setInterval } from 'timers/promises'

import { to_chunk_position, spiral_array } from '@aresrpg/aresrpg-protocol'
import { aiter } from 'iterator-helper'
import {
  BoxGeometry,
  FrontSide,
  Mesh,
  MeshPhongMaterial,
  PlaneGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { abortable } from '../core-utils/iterator.js'

/** @type {Type.Module} */
export default function () {
  return {
    name: 'game_chunks',
    observe({ events, signal, scene, get_state, camera_controls }) {
      window.dispatchEvent(new Event('assets_loading'))

      function display_chunk() {
        const plane = new PlaneGeometry(100, 100)
        const material = new MeshPhongMaterial({
          color: 0xeeeeee,
          side: FrontSide,
        })
        const mesh = new Mesh(plane, material)

        mesh.castShadow = false
        mesh.receiveShadow = true

        mesh.position.y = 99.5
        mesh.rotation.x = -Math.PI / 2
        scene.add(mesh)

        events.emit('CHUNKS_LOADED')
      }

      display_chunk()

      events.on('CLEAR_CHUNKS', () => {
        // reset_chunks(true)
      })

      // allow first loading of chunks
      events.once('packet/playerPosition', ({ position }) => {
        // rebuild_chunks(to_chunk_position(position))
      })

      aiter(abortable(on(events, 'STATE_UPDATED', { signal }))).reduce(
        async (
          { last_view_distance, last_far_view_distance },
          [
            {
              settings: { view_distance, far_view_distance },
            },
          ],
        ) => {
          if (last_view_distance)
            if (
              last_view_distance !== view_distance ||
              last_far_view_distance !== far_view_distance
            ) {
              // await reset_chunks(true)
            }

          return {
            last_view_distance: view_distance,
            last_far_view_distance: far_view_distance,
          }
        },
      )

      // handle voxels chunks
      aiter(abortable(setInterval(1000, null, { signal }))).reduce(
        async last_chunk => {
          const { player } = get_state()

          if (!player) return
          const current_chunk = to_chunk_position(player.position)

          if (
            last_chunk &&
            (last_chunk?.x !== current_chunk.x ||
              last_chunk?.z !== current_chunk.z)
          ) {
            // await rebuild_chunks()
          }

          return current_chunk
        },
        null,
      )

      signal.addEventListener('abort', () => {
        // reset_chunks()
      })
    },
  }
}
