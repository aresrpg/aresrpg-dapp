import { setInterval } from 'timers/promises'

import { Vector3 } from 'three'
import { aiter } from 'iterator-helper'
import { ITEM_CATEGORY } from '@aresrpg/aresrpg-sdk/items'

import { abortable } from '../utils/iterator.js'
import { sui_get_character, sui_get_item } from '../sui/client.js'
import { experience_to_level } from '../utils/game/experience.js'
import { context, current_three_character } from '../game/game.js'

import { DEFAULT_SUI_CHARACTER, SUI_EMITTER } from './sui_data.js'
import { tick_pet } from './player_pet.js'

const MOVE_UPDATE_INTERVAL = 0.1
const MAX_TITLE_VIEW_DISTANCE = 40
const MAX_ANIMATION_DISTANCE = 64

/** @type {Type.Module} */
export default function () {
  /** @type {Map<string, Type.ThreeEntity>} */
  const spawned_pets = new Map()

  function despawn_pet(character) {
    if (spawned_pets.has(character.id)) {
      spawned_pets.get(character.id).remove()
      spawned_pets.delete(character.id)
    }
  }

  function spawn_pet(character) {
    despawn_pet(character)

    const spawned_pet = context.pool[character.pet.item_type].get({
      id: character.pet.id,
      name: character.pet.name,
    })
    spawned_pet.title.text = `${character.pet.name} (${character.pet.level})`
    spawned_pet.move(character.position)
    spawned_pets.set(character.id, spawned_pet)
  }

  return {
    tick({ visible_characters }, __, delta) {
      // handle entities movement
      for (const character of visible_characters.values()) {
        if (character.target_position) {
          const lerp_factor = Math.min(delta / MOVE_UPDATE_INTERVAL, 1)
          const new_position = new Vector3().lerpVectors(
            character.position,
            character.target_position,
            lerp_factor,
          )

          const movement = new Vector3().subVectors(
            character.target_position,
            new_position,
          )

          character.move(new_position)
          character.rotate(movement)

          const pet = spawned_pets.get(character.id)
          if (pet) tick_pet(character, pet, delta)

          if (new_position.distanceTo(character.target_position) < 0.01)
            character.target_position = null
        }
        character.animate(character.action)
      }
    },
    observe({ events, pool, get_state, signal }) {
      // listening for character movements with the goal of registering new entities
      // the logic is only triggered when the character has never been seen before
      events.on('packet/characterPosition', ({ id, position }) => {
        const {
          visible_characters,
          sui: { locked_characters },
        } = get_state()
        const character_is_mine = locked_characters.some(
          ({ id: locked_id }) => locked_id === id,
        )

        if (!visible_characters.has(id) && !character_is_mine) {
          const default_three_character = pool
            .entity(DEFAULT_SUI_CHARACTER())
            .instanced()

          visible_characters.set(id, {
            ...DEFAULT_SUI_CHARACTER(),
            ...default_three_character,
          })

          default_three_character.move(position)

          sui_get_character(id)
            .then(sui_data => {
              default_three_character.remove()

              const level = experience_to_level(sui_data.experience)
              const three_character = pool
                .entity({
                  ...sui_data,
                  name: `${sui_data.name} (${level})`,
                })
                .instanced()

              if (sui_data.pet) spawn_pet(sui_data)

              default_three_character.apply_state(three_character)
              visible_characters.set(id, {
                ...visible_characters.get(id),
                ...three_character,
              })
            })
            .catch(error =>
              console.error(
                'Error updatintg character through Sui data:',
                error,
              ),
            )
        }
      })

      events.on('packet/entityDespawn', ({ ids }) => {
        const { visible_characters } = get_state()
        ids.forEach(id => {
          const entity = visible_characters.get(id)
          if (entity) {
            despawn_pet(entity)
            entity.remove()
            visible_characters.delete(id)
          }
        })
      })

      // manage LOD when other entities moves
      events.on('packet/characterPosition', ({ id, position }) => {
        const {
          visible_characters,
          sui: { locked_characters },
        } = get_state()
        const entity = visible_characters.get(id)
        // can happen when a character previously foreign was sent to me
        // without being despawned, so it would be mine but also in the visible_characters
        const character_mine = locked_characters.find(
          ({ id: locked_id }) => locked_id === id,
        )

        if (entity && character_mine) {
          entity.remove()
          visible_characters.delete(id)
        } else if (entity) {
          const player_position = current_three_character()?.position
          const { x, y, z } = position
          entity.target_position = new Vector3(x, y, z)
          if (player_position) {
            const distance = player_position.distanceTo(new Vector3(x, y, z))

            entity.set_low_priority(distance > MAX_ANIMATION_DISTANCE)

            if (distance > MAX_TITLE_VIEW_DISTANCE && entity.title.visible) {
              entity.title.visible = false
              despawn_pet(entity)
            } else if (
              distance <= MAX_TITLE_VIEW_DISTANCE &&
              !entity.title.visible
            ) {
              entity.title.visible = true
              spawn_pet(entity)
            }
          }
        }
      })

      // manage LOD when player moves
      aiter(abortable(setInterval(1000, null, { signal }))).forEach(() => {
        const state = get_state()
        const { visible_characters } = state
        const player_position = current_three_character(state)?.position

        if (player_position) {
          visible_characters.forEach(entity => {
            const { position } = entity
            const distance = player_position.distanceTo(position)

            entity.set_low_priority(distance > MAX_ANIMATION_DISTANCE)

            if (distance > MAX_TITLE_VIEW_DISTANCE && entity.title.visible) {
              entity.title.visible = false
              despawn_pet(entity)
            } else if (
              distance <= MAX_TITLE_VIEW_DISTANCE &&
              !entity.title.visible
            ) {
              spawn_pet(entity)
              entity.title.visible = true
            }
          })
        }
      })

      events.on('packet/characterAction', ({ id, action }) => {
        const { visible_characters } = get_state()
        const entity = visible_characters.get(id)

        if (entity) {
          if (action === 'JUMP') entity.jump_time = 0.8
          entity.action = action
        }
      })

      SUI_EMITTER.on(
        'ItemEquipEvent',
        async ({ item_id, character_id, slot }) => {
          const character = get_state().visible_characters.get(character_id)

          if (!character) return

          const item = await sui_get_item(item_id)

          character[slot] = item

          if (item.item_category === ITEM_CATEGORY.PET) {
            spawn_pet(character)
          }
        },
      )

      SUI_EMITTER.on('ItemUnequipEvent', ({ character_id, slot }) => {
        const character = get_state().visible_characters.get(character_id)

        if (!character) return

        // characters should be initialized with their equipment
        // so this should never be null
        const item = character[slot]

        if (item.item_category === ITEM_CATEGORY.PET) {
          despawn_pet(character)
        }

        character[slot] = null
      })
    },
  }
}
