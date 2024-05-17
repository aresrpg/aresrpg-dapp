import { Vector2, Vector3 } from 'three'
import { WorldGenerator } from '@aresrpg/aresrpg-world'

import {
  context,
  current_locked_character,
  current_three_character,
} from '../game/game.js'
import { state_iterator } from '../utils/iterator.js'

const PET_SPEED = 8.0 // Adjust this value to set the pet's movement speed

/** @type {Type.Module} */
export default function () {
  /** @type {Type.ThreeEntity} */
  let spawned_pet = null
  let pet_target_position = null

  return {
    async tick(_, __, delta) {
      if (!spawned_pet) return

      const character = current_three_character()

      if (character) {
        const distance_to_player = spawned_pet.position.distanceTo(
          character.position,
        )

        if (distance_to_player > 50) {
          spawned_pet.move(character.position.clone())
          return
        }

        if (distance_to_player > 7) {
          pet_target_position = character.position
            .clone()
            .add(new Vector3(Math.random() * 7 - 3, 0, Math.random() * 7 - 3))
        }

        if (distance_to_player < 1) pet_target_position = null
      }

      if (pet_target_position) {
        const direction = new Vector3()
          .subVectors(pet_target_position, spawned_pet.position)
          .normalize()
        const movement = direction.multiplyScalar(PET_SPEED * delta)

        const new_position = spawned_pet.position.clone().add(movement)

        const height = Math.floor(
          WorldGenerator.instance.getRawHeight(
            new Vector2(Math.floor(new_position.x), Math.floor(new_position.z)),
          ),
        )

        new_position.setY(height + spawned_pet.height * 2 + 0.2)

        spawned_pet.move(new_position)
        spawned_pet.rotate(movement)
        spawned_pet.animate('RUN')

        // Check if pet has reached the target position
        if (new_position.distanceTo(pet_target_position) < 2) {
          pet_target_position = null
        }
      } else {
        spawned_pet.animate('IDLE')
      }
    },
    observe() {
      state_iterator().forEach(state => {
        const character = current_locked_character(state)

        if (character) {
          if (character.pet?.id !== spawned_pet?.id) {
            if (spawned_pet) {
              spawned_pet.remove()
              spawned_pet = null
            }
            if (character.pet) {
              spawned_pet = context.pool.suifrens_bullshark.get({
                id: character.pet.id,
                name: character.pet.name,
              })
              spawned_pet.title.text = `${character.pet.name} (${character.pet.level})`
            }
          }
        }
      })
    },
  }
}
