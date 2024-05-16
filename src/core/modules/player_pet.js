import {
  context,
  current_locked_character,
  current_three_character,
} from '../game/game.js'
import { state_iterator } from '../utils/iterator.js'

/** @type {Type.Module} */
export default function () {
  /** @type {Type.ThreeEntity} */
  let spawned_pet = null

  return {
    async tick() {
      if (!spawned_pet) return

      const character = current_three_character()

      if (character) {
        if (spawned_pet.position.distanceTo(character.position) > 10)
          spawned_pet.move(character.position) // TODO: a* pathfinding
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
              console.log('Spawned new pet:', spawned_pet)
            }
          }
        }
      })
    },
  }
}
