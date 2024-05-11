import { setInterval } from 'timers/promises'
import { on } from 'events'

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
import { CartoonRenderpass } from '../game/rendering/cartoon_renderpass.js'

/** @type {Type.Module} */
export default function () {
  const material = new MeshPhongMaterial({
    color: new Color(0x000000),
    shininess: 1,
    specular: 0xffffff,
    side: DoubleSide,
  })

  const base_size = 500
  const base_mesh = new Mesh(new PlaneGeometry(base_size, base_size), material)
  base_mesh.rotateX(Math.PI / 2)
  base_mesh.layers.set(CartoonRenderpass.non_outlined_layer)

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

      aiter(abortable(setInterval(1000, null))).reduce(async () => {
        const state = get_state()

        const water_level = state.settings.water.level + 0.1
        let player_position_x = 0
        let player_position_z = 0

        const player = current_character(state)
        if (player && player.position) {
          player_position_x = player.position.x
          player_position_z = player.position.z
        }

        container.position.set(
          player_position_x,
          water_level,
          player_position_z,
        )

        material.color = state.settings.water.color

        if (!container.parent) {
          scene.add(container)
        }
      })
    },
  }
}
