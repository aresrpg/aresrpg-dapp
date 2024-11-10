import { setInterval } from 'timers/promises'

import { Vector3 } from 'three'
import { aiter } from 'iterator-helper'
import { ITEM_CATEGORY } from '@aresrpg/aresrpg-sdk/items'

import { abortable } from '../utils/iterator.js'
import {
  sui_get_character,
  sui_get_character_name,
  sui_get_item,
} from '../sui/client.js'
import { experience_to_level } from '../utils/game/experience.js'
import { current_three_character } from '../game/game.js'
import { ENTITIES } from '../game/entities.js'
import { get_terrain_height } from '../utils/terrain/chunk_utils.js'

import { DEFAULT_SUI_CHARACTER, SUI_EMITTER } from './sui_data.js'
import { tick_pet } from './player_pet.js'
import { get_item_skin } from './player_skin.js'

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

  /** @param {import("@aresrpg/aresrpg-sdk/types").SuiCharacter} character */
  function spawn_pet(character) {
    despawn_pet(character)

    const spawned_pet = ENTITIES[character.pet.item_type]({
      name: character.pet.name,
      id: character.pet.id,
    })

    if (
      character.pet.item_type === 'vaporeon' &&
      character.pet.name.includes('shiny')
    )
      spawned_pet.set_variant('shiny')

    sui_get_character_name(character.id).then(name => {
      spawned_pet.floating_title.text = `${character.pet.name} (${name})`
    })

    spawned_pet.target_position = new Vector3()
      .copy(character.position)
      .add(new Vector3(Math.random() * 7 - 3, 0, Math.random() * 7 - 3))

    spawned_pets.set(character.id, spawned_pet)

    tick_pet(character, spawned_pet, 0)
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
        character.mixer.update(delta)
      }
    },
    observe({ events, get_state, signal }) {
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
          const default_three_character = ENTITIES.from_character(
            DEFAULT_SUI_CHARACTER(),
          )

          // it's okay to manipulate visible_characters without dispatching action
          // because it's a map and never changed, and as it manages others players, it's accessed very often and needed sequentially
          // @ts-ignore
          visible_characters.set(id, {
            ...DEFAULT_SUI_CHARACTER(),
            ...default_three_character,
          })

          default_three_character.move(position)

          sui_get_character(id)
            .then(sui_data => {
              default_three_character.remove()

              const skin = get_item_skin(sui_data)
              const level = experience_to_level(sui_data.experience)
              const content = {
                ...sui_data,
                name: `${sui_data.name} (${level})`,
              }
              /** @type {Type.ThreeEntity} */
              const three_character = skin
                ? ENTITIES[skin](content)
                : ENTITIES.from_character(content)

              if (sui_data.pet) spawn_pet(sui_data)
              if (sui_data.hat) three_character.equip_hat(sui_data.hat)

              three_character.move(default_three_character.object3d.position)

              visible_characters.set(id, {
                ...visible_characters.get(id),
                ...sui_data,
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

      events.on('packet/charactersDespawn', ({ ids }) => {
        const { visible_characters } = get_state()

        ids.forEach(id => {
          const character = visible_characters.get(id)

          if (character) {
            despawn_pet(character)
            character.remove()
            visible_characters.delete(id)
          }
        })
      })

      events.on('packet/entityGroupsDespawn', ({ ids }) => {
        const { visible_mobs_group } = get_state()
        ids.forEach(id => {
          if (visible_mobs_group.has(id)) {
            visible_mobs_group.get(id).entities.forEach(mob => mob.remove())
            visible_mobs_group.delete(id)
          }
        })
      })

      events.on(
        'packet/entityGroupSpawn',
        ({ id: group_id, position: spawn_position, entities }) => {
          const { visible_mobs_group } = get_state()

          spawn_position.y = get_terrain_height(spawn_position, 1)

          visible_mobs_group.set(group_id, {
            id: group_id,
            position: spawn_position,
            entities: entities.map(({ name, id, level, skin, size }) => {
              const spawned_mob = {
                ...ENTITIES[skin]({
                  id,
                  name: `${name} (${level})`,
                  scale_factor: size,
                }),
                name,
                level,
                mob_group_id: group_id,
                spawn_position,
              }

              // find a position in 4 block range of entity position
              const position = new Vector3(
                spawn_position.x + Math.random() * 4 - 2,
                0,
                spawn_position.z + Math.random() * 4 - 2,
              )

              const ground_height = get_terrain_height(
                position,
                spawned_mob.height,
              )

              position.setY(ground_height)
              spawned_mob.move(position)
              return spawned_mob
            }),
          })
        },
      )

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

            if (
              distance > MAX_TITLE_VIEW_DISTANCE &&
              entity.floating_title.visible
            ) {
              entity.floating_title.visible = false
              if (entity.pet) despawn_pet(entity)
            } else if (
              distance <= MAX_TITLE_VIEW_DISTANCE &&
              !entity.floating_title.visible
            ) {
              entity.floating_title.visible = true
              if (entity.pet) spawn_pet(entity)
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

            if (
              distance > MAX_TITLE_VIEW_DISTANCE &&
              entity.floating_title.visible
            ) {
              entity.floating_title.visible = false
              if (entity.pet) despawn_pet(entity)
            } else if (
              distance <= MAX_TITLE_VIEW_DISTANCE &&
              !entity.floating_title.visible
            ) {
              if (entity.pet) spawn_pet(entity)
              entity.floating_title.visible = true
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

      function update_skin({ visible_characters, character, skin }) {
        character.remove()

        const level = experience_to_level(character.experience)
        const content = {
          ...character,
          name: `${character.name} (${level})`,
        }
        const three_character = skin
          ? ENTITIES[skin](content)
          : ENTITIES.from_character(content)

        three_character.move(character.position)
        three_character.animate(character.action)
        visible_characters.set(character.id, {
          ...character,
          ...three_character,
          skin,
        })
      }

      SUI_EMITTER.on('ItemEquipEvent', async ({ item, character_id, slot }) => {
        const { visible_characters } = get_state()
        const character = visible_characters.get(character_id)

        if (!character) return

        const current_item = character[slot]
        character[slot] = item

        if (current_item && current_item !== item) {
          if (current_item.item_category === ITEM_CATEGORY.PET)
            despawn_pet(character)
          if (current_item.item_category === ITEM_CATEGORY.HAT)
            character.equip_hat(null)
        }

        if (item) {
          if (item.item_category === ITEM_CATEGORY.PET) spawn_pet(character)
          if (item.item_category === ITEM_CATEGORY.HAT)
            character.equip_hat(item)
        }

        const skin = get_item_skin(character)

        if (skin !== character.skin)
          update_skin({ visible_characters, character, skin })
      })
    },
  }
}
