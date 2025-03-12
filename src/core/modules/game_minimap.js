import { Vector3 } from 'three'

/** @type {Type.Module} */
export default function () {
  return {
    tick(state, { camera, renderer, voxel_engine }) {
      const { minimap } = voxel_engine

      const player = state.characters.find(
        character => character.id === state.selected_character_id,
      )
      if (player) {
        minimap.centerPosition.copy(player.position)
        minimap.setMarker('player_position', player.position.clone())

        const camera_forward = new Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion)
          .setY(0)
          .normalize()

        minimap.orientation =
          Math.atan2(camera_forward.z, camera_forward.x) + Math.PI / 2
      }

      minimap.update(renderer)
    },
    observe({ voxel_engine, signal }) {
      const { minimap } = voxel_engine

      minimap.altitudeScaling = 1
      minimap.verticalAngle = 1.2
      minimap.crustThickness = 0.04
      minimap.viewDistance = 500
      minimap.lockNorth = false
      minimap.maxHeight = 1
      minimap.screenSize = 400

      const update_screen_position = () => {
        minimap.screenPosition.set(
          window.innerWidth - 650,
          window.innerHeight - 300,
        )
      }

      window.addEventListener('resize', update_screen_position, { signal })
      update_screen_position()
    },
    post_render({ renderer, voxel_engine }) {
      voxel_engine.minimap.render(renderer)
    },
  }
}
