import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import {
  Color,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  PlaneGeometry,
  Vector3,
} from 'three'

import { abortable } from '../utils/iterator.js'
import { current_character } from '../game/game.js'

/** @type {Type.Module} */
export default function () {
  const material = new MeshPhongMaterial({
    color: new Color(0x0000ff),
    shininess: 1,
    specular: 0xffffff,
    side: DoubleSide,
  })

  const base_size = 500
  const base_mesh = new Mesh(new PlaneGeometry(base_size, base_size), material)
  base_mesh.rotateX(Math.PI / 2)
  base_mesh.translateZ(-76)

  const meshes = []

  return {
    observe({ scene, get_state }) {
      const container = new Group()
      container.name = 'water'

      for (let d_x = -5; d_x <= 5; d_x++) {
        for (let d_z = -5; d_z <= 5; d_z++) {
          const mesh = base_mesh.clone()
          mesh.translateX(base_size * d_x)
          mesh.translateY(base_size * d_z)
          meshes.push(mesh)
          container.add(mesh)
        }
      }
      scene.add(container)

      aiter(abortable(setInterval(1000, null))).reduce(async () => {
        const state = get_state()
        const player = current_character(state)

        if (player.position) {
          container.position.set(player.position.x, 0, player.position.z)
        }
      })
    },
  }
}
