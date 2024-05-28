import { Heightmap } from '@aresrpg/aresrpg-world'
import { Vector2, Vector3 } from 'three'

import {
  context,
  current_locked_character,
  current_three_character,
} from '../game/game.js'
import { state_iterator } from '../utils/iterator.js'

const PET_SPEED = 8.0 // Adjust this value to set the pet's movement speed

export function tick_pet(character, pet, delta) {
  if (character) {
    const distance_to_player = pet.position.distanceTo(character.position)

    if (distance_to_player > 50) {
      pet.move(character.position.clone())
      return
    }

    if (distance_to_player > 7) {
      pet.target_position = character.position
        .clone()
        .add(new Vector3(Math.random() * 7 - 3, 0, Math.random() * 7 - 3))
    }

    if (distance_to_player < 1) pet.target_position = null
  }

  if (pet.target_position) {
    const direction = new Vector3()
      .subVectors(pet.target_position, pet.position)
      .normalize()
    const movement = direction.multiplyScalar(PET_SPEED * delta)

    const new_position = pet.position.clone().add(movement)

    const ground_pos = new Vector2(
      Math.floor(new_position.x),
      Math.floor(new_position.z),
    )
    const height = Math.floor(Heightmap.instance.getGroundPos(ground_pos).y)

    new_position.setY(height + pet.height * 2 + 0.2)

    pet.move(new_position)
    pet.rotate(movement)
    pet.animate('RUN')

    // Check if pet has reached the target position
    if (new_position.distanceTo(pet.target_position) < 2) {
      pet.target_position = null
    }
  } else {
    pet.animate('IDLE')
  }
}

/** @type {Type.Module} */
export default function () {
  /** @type {Map<string, Type.ThreeEntity>} */
  const pets = new Map()

  return {
    async tick(_, __, delta) {
      const character = current_three_character()

      const pet = pets.get(character?.id)
      if (pet) tick_pet(character, pet, delta)
    },
    observe() {
      state_iterator().reduce((last_address, { sui: { selected_address } }) => {
        if (last_address !== selected_address) {
          pets.forEach(pet => pet.remove())
          pets.clear()
        }
        return selected_address
      })
      state_iterator().forEach(state => {
        const character = current_locked_character(state)

        if (!character) return

        const pet = pets.get(character.id)

        if (pet?.id !== character.pet?.id) {
          if (pet) {
            pet.remove()
            pets.delete(character.id)
          }
          if (character.pet) {
            const spawned_pet = context.pool[character.pet.item_type].get({
              id: character.pet.id,
              name: character.pet.name,
            })
            spawned_pet.floating_title.text = `${character.pet.name} (${character.pet.level})`
            pets.set(character.id, spawned_pet)
          }
        }
      })
    },
  }
}
