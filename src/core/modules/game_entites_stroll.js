import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Vector3 } from 'three'

import { abortable } from '../utils/iterator.js'
import { context, current_three_character } from '../game/game.js'
import {
  get_nearest_floor_pos,
  get_nearest_floor_pos_async,
} from '../utils/terrain/world_utils.js'

const MOVE_INTERVAL = 5000 // 5 seconds in milliseconds
const MOVE_PROBABILITY = 0.1 // 10% chance to move
const MAX_MOVE_DISTANCE = 6
const MOB_SPEED = 4.0
const MAX_ANIMATION_DISTANCE = 50

function get_random_offset(max_distance) {
  return (Math.random() - 0.5) * 2 * max_distance
}

/** @type {Type.Module} */
export default function () {
  return {
    tick(state, _, delta) {
      const { visible_mobs_group } = state
      const character = current_three_character(state)
      if (!character) return
      for (const { entities } of visible_mobs_group.values()) {
        for (const mob of entities) {
          if (
            mob.position.distanceTo(character.position) < MAX_ANIMATION_DISTANCE
          ) {
            if (mob.target_position) {
              const direction = new Vector3()
                .subVectors(mob.target_position, mob.position)
                .normalize()
              const movement = direction.multiplyScalar(MOB_SPEED * delta)

              const new_position = mob.position.clone().add(movement)
              const surface_block = get_nearest_floor_pos(new_position)

              new_position.setY(surface_block.y + mob.height * 0.5)

              mob.move(new_position)
              mob.rotate(movement)
              mob.animate('RUN')

              // Check if mob has reached the target position
              if (new_position.distanceTo(mob.target_position) < 2) {
                mob.target_position = null
              }
            } else {
              mob.animate('IDLE')
            }

            mob.mixer.update(delta)
          }
        }
      }
    },
    observe() {
      const { visible_mobs_group } = context.get_state()

      aiter(
        abortable(setInterval(MOVE_INTERVAL, null, { signal: context.signal })),
      ).forEach(async () => {
        visible_mobs_group.forEach(({ entities }) => {
          // this kinda is background task, we do not need to wait for it (it has a catch block)
          // ? Could it become a problem if the get_ground_height takes more time than MOVE_INTERVAL?
          Promise.all(
            entities.map(async mob => {
              // 10% chance to move the mob
              const should_move = Math.random() < MOVE_PROBABILITY
              if (should_move) {
                const { mob_group_id } = mob
                const { position: spawn_position } =
                  visible_mobs_group.get(mob_group_id)

                const offset_x = get_random_offset(MAX_MOVE_DISTANCE)
                const offset_z = get_random_offset(MAX_MOVE_DISTANCE)

                const surface_block = await get_nearest_floor_pos_async({
                  x: spawn_position.x + offset_x,
                  y: spawn_position.y,
                  z: spawn_position.z + offset_z,
                })

                mob.target_position = {
                  ...surface_block,
                  y: surface_block.y + mob.height * 0.5,
                }
              }
            }),
          ).catch(error => {
            console.error('Error moving mobs:', error)
          })
        })
      })
    },
  }
}
