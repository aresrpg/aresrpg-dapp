import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'
import { Vector3 } from 'three'

import { abortable } from '../utils/iterator.js'
import { context, current_three_character } from '../game/game.js'
import { get_nearest_floor_pos } from '../utils/terrain/world_utils.js'
import logger from '../../logger.js'

const MOVE_INTERVAL = 5000 // 5 seconds in milliseconds
const MOVE_PROBABILITY = 0.1 // 10% chance to move
const MAX_MOVE_DISTANCE = 6
const MOB_SPEED = 4.0
const MAX_ANIMATION_DISTANCE = 50
const MOB_COLLISION_RADIUS = 0.4
const MOB_COLLISION_HEIGHT = 1.1

function get_random_offset(max_distance) {
  return (Math.random() - 0.5) * 2 * max_distance
}

/** @type {Type.Module} */
export default function () {
  return {
    tick(state, { physics }, delta) {
      const { visible_mobs_group } = state
      const character = current_three_character(state)
      if (!character) return
      for (const { entities } of visible_mobs_group.values()) {
        for (const mob of entities) {
          if (
            mob.position.distanceTo(character.position) < MAX_ANIMATION_DISTANCE
          ) {
            const direction = new Vector3()
            mob.mixer.update(delta)

            if (!mob.target_position) {
              mob.animate('IDLE')
              continue
            }

            direction
              .subVectors(mob.target_position, mob.position)
              .setY(0)
              .normalize()
            const velocity = direction.clone().multiplyScalar(MOB_SPEED)

            const mob_center = new Vector3(0, 0.5 * mob.height, 0)

            const mob_collisions = physics.voxelmap_collisions.entityMovement(
              {
                radius: MOB_COLLISION_RADIUS,
                height: MOB_COLLISION_HEIGHT,
                position: new Vector3().subVectors(mob.position, mob_center),
                velocity,
              },
              {
                deltaTime: delta,
                ascendSpeed: 20,
                gravity: 5000,
                missingVoxels: {
                  considerAsBlocking: true,
                  exportAsList: false,
                },
              },
            )

            if (mob_collisions.computationStatus === 'partial') {
              // logger.WARNING(
              //   'Physics engine lacked some info to compute mobs stroll collisions.',
              // )
            }

            const new_position = mob_collisions.position.add(mob_center)
            const horizontal_movement = new Vector3()
              .subVectors(new_position, mob.position)
              .setY(0)

            mob.move(new_position)

            if (horizontal_movement.lengthSq() > 0.00001) {
              mob.rotate(direction)
              mob.animate('RUN')
            }

            // Check if mob has reached the target position
            if (
              mob.target_position &&
              new_position.distanceTo(mob.target_position) < 2
            ) {
              mob.target_position = null
            }
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
          entities.forEach(mob => {
            // 10% chance to move the mob
            const should_move = Math.random() < MOVE_PROBABILITY
            if (should_move) {
              const { mob_group_id } = mob
              const { position: spawn_position } =
                visible_mobs_group.get(mob_group_id)

              const offset_x = get_random_offset(MAX_MOVE_DISTANCE)
              const offset_z = get_random_offset(MAX_MOVE_DISTANCE)

              const surface_block = get_nearest_floor_pos({
                x: spawn_position.x + offset_x,
                y: spawn_position.y,
                z: spawn_position.z + offset_z,
              })

              mob.target_position = {
                ...surface_block,
                y: surface_block.y + mob.height * 0.5,
              }
            }
          })
        })
      })
    },
  }
}
