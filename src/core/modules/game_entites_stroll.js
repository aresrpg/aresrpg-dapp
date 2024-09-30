import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Vector3 } from 'three'

import { abortable } from '../utils/iterator.js'
import { context, current_three_character } from '../game/game.js'
import {
  get_optional_terrain_height,
  get_terrain_height,
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
      const { visible_mobs_group, characters } = state
      const character = current_three_character(state)
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
              const ground_height = get_optional_terrain_height(
                new_position,
                mob.height,
              )

              if (ground_height == null) continue

              new_position.setY(ground_height)

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
        visible_mobs_group.forEach(async ({ entities }) => {
          await Promise.all(
            entities.map(async mob => {
              // 10% chance to move the mob
              const should_move = Math.random() < MOVE_PROBABILITY
              if (should_move) {
                const { mob_group_id } = mob
                const { position: spawn_position } =
                  visible_mobs_group.get(mob_group_id)

                const offset_x = get_random_offset(MAX_MOVE_DISTANCE)
                const offset_z = get_random_offset(MAX_MOVE_DISTANCE)
                const target_position = new Vector3(
                  spawn_position.x,
                  0, // the target Y is corrected in the tick function
                  spawn_position.z,
                ).add(new Vector3(offset_x, 0, offset_z))

                target_position.setY(
                  await get_terrain_height(target_position, mob.height),
                )

                mob.target_position = target_position
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
