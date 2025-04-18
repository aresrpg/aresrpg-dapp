import { Vector3 } from 'three'
import { VoxelmapCollisions } from '@aresrpg/aresrpg-engine'
import { world_settings } from '@aresrpg/aresrpg-sdk/world'

import { current_sui_character, current_three_character } from '../game/game.js'
import { state_iterator } from '../utils/iterator.js'
import { ENTITIES } from '../game/entities.js'

const PET_SPEED = 8.0 // Adjust this value to set the pet's movement speed
const PET_COLLISION_RADIUS = 0.2
const PET_COLLISION_HEIGHT = 0.9

export function tick_pet(
  character,
  pet,
  delta,
  /** @type VoxelmapCollisions | null */ voxelmap_collisions,
) {
  if (character) {
    const distance_to_player = pet.position.distanceTo(character.position)

    if (distance_to_player > 50) {
      pet.move(character.position)
      return
    }

    if (distance_to_player > 7) {
      let need_to_recompute_target_position = true
      if (pet.target_position) {
        const distance_target_to_player = pet.target_position.distanceTo(
          character.position,
        )
        need_to_recompute_target_position = distance_target_to_player > 7
      }

      if (need_to_recompute_target_position) {
        pet.target_position = character.position
          .clone()
          .add(new Vector3(Math.random() * 7 - 3, 0, Math.random() * 7 - 3))
      }
    }

    if (distance_to_player < 1) pet.target_position = null
  }

  if (voxelmap_collisions) {
    const is_underwater = pet.position.y < world_settings.getSeaLevel() + 0.5

    const velocity = new Vector3()

    if (pet.target_position && delta > 0) {
      const to_target_position = new Vector3().subVectors(
        pet.target_position,
        pet.position,
      )

      if (!is_underwater) {
        to_target_position.setY(0)
      }

      const distance_to_target = to_target_position.length()
      velocity.addScaledVector(
        to_target_position.normalize(),
        Math.min(distance_to_target / delta, PET_SPEED),
      )
    }

    const pet_center = new Vector3(0, 0.5 * pet.height, 0)

    const pet_collisions = voxelmap_collisions.entityMovement(
      {
        radius: PET_COLLISION_RADIUS,
        height: PET_COLLISION_HEIGHT,
        position: new Vector3().subVectors(pet.position, pet_center),
        velocity,
      },
      {
        deltaTime: delta,
        ascendSpeed: 20,
        gravity: is_underwater ? 0 : 50000,
        missingVoxels: {
          considerAsBlocking: true,
          exportAsList: false,
        },
      },
    )

    if (pet_collisions.computationStatus === 'partial') {
      // logger.WARNING(
      //   'Physics engine lacked some info to compute pet collisions.',
      // )
    }

    const new_position = pet_collisions.position.add(pet_center)
    const horizontal_movement = new Vector3()
      .subVectors(new_position, pet.position)
      .setY(0)

    pet.move(new_position)

    if (horizontal_movement.lengthSq() > 0.00001) {
      pet.rotate(horizontal_movement.normalize())
      pet.animate('RUN')
    } else {
      pet.animate('IDLE')
    }

    // Check if pet has reached the target position
    if (
      pet.target_position &&
      new_position.distanceTo(pet.target_position) < 2
    ) {
      pet.target_position = null
    }
  }

  pet?.mixer.update(delta)
}

/** @type {Type.Module} */
export default function () {
  /** @type {Map<string, Type.ThreeEntity>} */
  const pets = new Map()

  return {
    async tick(_, { physics }, delta) {
      const character = current_three_character()

      const pet = pets.get(character?.id)
      if (pet) tick_pet(character, pet, delta, physics.voxelmap_collisions)
    },
    observe() {
      state_iterator().reduce((last_address, { sui: { selected_address } }) => {
        if (last_address !== selected_address) {
          pets.forEach(pet => pet.remove())
          pets.clear()
        }
        return selected_address
      })
      state_iterator().forEach(async state => {
        const character = current_sui_character(state)

        if (!character) return

        const pet = pets.get(character.id)

        if (pet?.id !== character.pet?.id) {
          if (pet) {
            pet.remove()
            pets.delete(character.id)
          }
          if (character.pet) {
            const spawned_pet = await ENTITIES[character.pet.item_type]({
              id: character.pet.id,
              name: character.pet.name,
            })

            // @ts-ignore
            if (character.pet.shiny) {
              spawned_pet.set_variant('shiny')
            }

            spawned_pet.floating_title.text = `${character.pet.name} (${character.pet.level})`
            pets.set(character.id, spawned_pet)
          }
        }
      })
    },
  }
}
