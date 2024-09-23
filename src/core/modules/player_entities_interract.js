import { CartoonRenderpass } from '../game/rendering/cartoon_renderpass.js'
import { context, current_three_character } from '../game/game.js'
import { state_iterator } from '../utils/iterator.js'
import { create_billboard_text } from '../game/rendering/billboard_text.js'

let current_hovered_group = null

export function is_hovering_mob_group() {
  return !!current_hovered_group
}

/** @type {Type.Module} */
export default function () {
  let current_text = null

  function create_text({ position, entities }) {
    remove_text()

    const total_lvl = entities.reduce((acc, mob) => acc + mob.level, 0)
    const names = entities.map(mob => `${mob.name} (${mob.level})`).join('\n')

    current_text = create_billboard_text()
    current_text.position.x = position.x
    current_text.position.z = position.z
    current_text.position.y = position.y + 2.5
    current_text.fontSize = 0.3
    current_text.color = 'white'
    current_text.anchorX = 'center'
    current_text.anchorY = 'bottom'
    current_text.outlineBlur = '10%'
    current_text.outlineColor = '#283593'
    current_text.outlineWidth = 0.05
    current_text.text = `  [Lvl. ${total_lvl}]\n${names}`
    current_text.layers.set(CartoonRenderpass.non_outlined_layer)

    context.scene.add(current_text)
  }

  function remove_text() {
    if (current_text) {
      context.scene.remove(current_text)
      current_text.dispose()
      current_text = null
    }
  }

  return {
    tick(state, context) {
      if (document.pointerLockElement) return

      const { mouse_position, mouse_raycaster, frustum, camera } = context
      const { visible_mobs_group } = state

      const mobs_in_frame = [...visible_mobs_group.values()]
        .map(({ entities }) => entities)
        .flat()
        .filter(mob =>
          frustum.intersectsObject(mob.object3d.getObjectByName('hitbox')),
        )

      if (mobs_in_frame.length) {
        mouse_raycaster.setFromCamera(mouse_position, camera)

        let intersects_with_mob = null

        for (const mob of mobs_in_frame) {
          const intersects = mouse_raycaster.intersectObject(
            mob.object3d.getObjectByName('hitbox'),
          )

          if (intersects.length) {
            intersects_with_mob = mob
            break
          }
        }

        if (
          intersects_with_mob &&
          camera.position.distanceTo(intersects_with_mob.position) < 50
        ) {
          const group_id = intersects_with_mob.mob_group_id
          if (current_hovered_group !== group_id) {
            current_hovered_group = group_id
            create_text(visible_mobs_group.get(group_id))
          }
        } else {
          remove_text()
          current_hovered_group = null
        }
      }
    },
    observe({ signal }) {
      function on_click() {
        if (current_hovered_group) {
          const state = context.get_state()
          const hovered_group = state.visible_mobs_group.get(
            current_hovered_group,
          )

          if (hovered_group) {
            const character = current_three_character(state)
            const distance = character.position.distanceTo(
              hovered_group.position,
            )
            if (distance < 10) {
              context.send_packet('packet/characterAttackMobGroup', {
                id: character.id,
                mob_group_id: current_hovered_group,
              })
            }
          }
        }
      }

      document.addEventListener('click', on_click, { signal })

      state_iterator().forEach(state => {
        if (
          !state.online ||
          !state.visible_mobs_group.has(current_hovered_group)
        )
          remove_text()
      })
    },
  }
}
