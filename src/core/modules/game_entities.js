import { setInterval } from 'timers/promises'

import { Color, Vector3 } from 'three'
import { aiter } from 'iterator-helper'
import { ITEM_CATEGORY } from '@aresrpg/aresrpg-sdk/items'

import { abortable, typed_on } from '../utils/iterator.js'
import { sui_get_character } from '../sui/client.js'
import { experience_to_level } from '../utils/game/experience.js'
import { current_three_character } from '../game/game.js'
import { ENTITIES } from '../game/entities.js'
import { get_nearest_floor_pos } from '../utils/terrain/world_utils.js'
import { get_player_skin } from '../utils/three/skin.js'

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

  /** @param {import("@aresrpg/aresrpg-sdk/types").SuiCharacter} character */
  async function spawn_pet(character) {
    despawn_pet(character)

    const spawned_pet = await ENTITIES[character.pet.item_type]({
      name: character.pet.name,
      id: character.pet.id,
    })

    // @ts-ignore
    if (character.pet.shiny) spawned_pet.set_variant('shiny')

    spawned_pet.floating_title.text = `${character.pet.name} (${character.name})`

    spawned_pet.target_position = new Vector3()
      .copy(character.position)
      .add(new Vector3(Math.random() * 7 - 3, 0, Math.random() * 7 - 3))

    spawned_pets.set(character.id, spawned_pet)

    tick_pet(character, spawned_pet, 0, null)
  }

  return {
    tick({ visible_characters }, { physics }, delta) {
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
          if (pet) tick_pet(character, pet, delta, physics.voxelmap_collisions)

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
      events.on('packet/characterPosition', async ({ id, position }) => {
        const {
          visible_characters,
          sui: { characters },
        } = get_state()
        const character_is_mine = characters.some(({ id: c_id }) => c_id === id)

        if (!visible_characters.has(id) && !character_is_mine) {
          try {
            const default_three_character = await ENTITIES.from_character(
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

            const sui_data = await sui_get_character(id)
            default_three_character.remove()

            const skin = get_player_skin(sui_data)
            const level = experience_to_level(sui_data.experience)
            const content = {
              ...sui_data,
              name: `${sui_data.name} (${level})`,
            }
            /** @type {Type.ThreeEntity} */
            const three_character = skin
              ? await ENTITIES[skin](content)
              : await ENTITIES.from_character(content)

            if (sui_data.pet) await spawn_pet(sui_data)

            three_character.set_equipment(sui_data)
            three_character.move(default_three_character.object3d.position)

            visible_characters.set(id, {
              ...visible_characters.get(id),
              ...sui_data,
              ...three_character,
            })
          } catch (error) {
            console.error('Error updating character through Sui data:', error)
          }
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

      const entities_to_spawn = new Map()

      events.on('packet/entityGroupsDespawn', ({ ids }) => {
        const { visible_mobs_group } = get_state()
        ids.forEach(id => {
          if (entities_to_spawn.has(id)) entities_to_spawn.delete(id)
          if (visible_mobs_group.has(id)) {
            const pos = visible_mobs_group.get(id).position
            visible_mobs_group.get(id).entities.forEach(mob => mob.remove())
            visible_mobs_group.delete(id)
          }
        })
      })

      events.on('packet/entityGroupSpawn', async payload => {
        if (payload.position.y < 20) alert('Mob spawned underground')
        entities_to_spawn.set(payload.id, payload)
      })

      async function get_random_surface_position(near_position) {
        return get_nearest_floor_pos(
          new Vector3(
            near_position.x + Math.random() * 6 - 2,
            near_position.y,
            near_position.z + Math.random() * 6 - 2,
          ),
        )
      }

      // less stress on the main thread by deferring the entity spawning
      aiter(abortable(setInterval(200, null, { signal }))).forEach(async () => {
        const { visible_mobs_group } = get_state()
        // process first entitiy to spawn
        const next_group = entities_to_spawn.values().next().value
        if (!next_group) return

        const { id: group_id, position: spawn_position, entities } = next_group
        try {
          visible_mobs_group.set(group_id, {
            id: group_id,
            position: spawn_position,
            entities: await Promise.all(
              entities.map(async ({ name, id, level, type, size, variant }) => {
                const spawned_mob = {
                  ...(await ENTITIES[type]({
                    id,
                    name: `${name} (${level})`,
                    scale_factor: size,
                  })),
                  name,
                  level,
                  mob_group_id: group_id,
                  spawn_position,
                }

                if (variant) spawned_mob.set_variant(variant)

                const surface_block =
                  (await get_random_surface_position(spawn_position)) ||
                  spawn_position

                spawned_mob.move(
                  new Vector3(
                    surface_block.x,
                    surface_block.y + spawned_mob.height * 0.5,
                    surface_block.z,
                  ),
                )
                return spawned_mob
              }),
            ),
          })

          entities_to_spawn.delete(group_id)
        } catch (error) {
          console.error('Error spawning mob group:', error)
        }
      })

      // manage LOD when other entities moves
      events.on('packet/characterPosition', ({ id, position }) => {
        const {
          visible_characters,
          sui: { characters },
        } = get_state()
        const entity = visible_characters.get(id)
        // can happen when a character previously foreign was sent to me
        // without being despawned, so it would be mine but also in the visible_characters
        const character_mine = characters.find(({ id: c_id }) => c_id === id)

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

      aiter(
        abortable(typed_on(SUI_EMITTER, 'ItemEquipEvent', { signal })),
      ).forEach(async ({ item, character_id, slot }) => {
        try {
          const { visible_characters } = get_state()
          const character = visible_characters.get(character_id)

          if (!character) return

          const previous_skin = get_player_skin(character)
          character[slot] = item
          const skin = get_player_skin(character)

          if (previous_skin !== skin) {
            character.remove()

            const three_character = skin
              ? await ENTITIES[skin](character)
              : await ENTITIES.from_character(character)

            three_character.move(character.position)
            three_character.animate(character.action)
            visible_characters.set(character_id, {
              ...character,
              ...three_character,
            })
            three_character.set_equipment(character)
          } else character.set_equipment(character)

          if (slot === ITEM_CATEGORY.PET)
            if (character.pet) await spawn_pet(character)
            else despawn_pet(character)
        } catch (error) {
          console.error(
            'Error handling ItemEquipEvent (for other players):',
            error,
          )
        }
      })
    },
  }
}
