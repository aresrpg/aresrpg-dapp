import { setInterval } from 'timers/promises'

import { Vector3 } from 'three'
import { CHUNK_SIZE } from '@aresrpg/aresrpg-protocol'
import { aiter } from 'iterator-helper'

import { compute_animation_state } from '../animations/animation.js'
import { abortable } from '../utils/iterator.js'
import { sui_get_character } from '../sui/client.js'
import { experience_to_level } from '../utils/game/experience.js'
import { current_character } from '../game/game.js'

const MOVE_UPDATE_INTERVAL = 0.1
const MAX_TITLE_VIEW_DISTANCE = CHUNK_SIZE * 1.3
const MAX_ANIMATION_DISTANCE = 64

const CANCELED_BY_MOVING = ['DANCE']
const CANCELED_BY_NOT_MOVING = ['JUMP', 'WALK', 'RUN']

/** @type {Type.Module} */
export default function () {
  return {
    tick({ visible_characters }, __, delta) {
      // handle entities movement
      for (const character of visible_characters.values()) {
        if (character.jump_time == null) character.jump_time = 0
        character.jump_time = Math.max(0, character.jump_time - delta)

        if (character.action === 'JUMP' && !character.jump_time)
          character.action = null

        if (character.target_position) {
          const old_position = character.position.clone()
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

          // if is moving
          if (old_position.distanceTo(character.target_position) > 0.5) {
            if (CANCELED_BY_MOVING.includes(character.action))
              character.action = null
          }

          const is_moving_horizontally = movement.setY(0).lengthSq() > 0.1

          if (new_position.distanceTo(character.target_position) < 0.01) {
            character.target_position = null
            if (CANCELED_BY_NOT_MOVING.includes(character.action)) {
              character.action = null
            }
          }

          character.animate(
            compute_animation_state({
              is_on_ground: character.action !== 'JUMP',
              is_moving_horizontally,
              action: character.action,
            }),
          )
        } else {
          character.animate(
            compute_animation_state({
              is_on_ground: character.action !== 'JUMP',
              is_moving_horizontally: false,
              action: character.action,
            }),
          )
        }
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
          const default_sui_data = {
            id,
            name: 'Loading..',
            experience: 0,
            classe: 'iop',
            sex: 'male',
            position: new Vector3(position.x, position.y, position.z),
          }
          const default_three_character = pool
            .entity(default_sui_data)
            .instanced()

          visible_characters.set(id, {
            ...default_sui_data,
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
          const player = current_character()
          const { x, y, z } = position
          entity.target_position = new Vector3(x, y, z)
          if (player.position) {
            const distance = player.position.distanceTo(new Vector3(x, y, z))

            entity.set_low_priority(distance > MAX_ANIMATION_DISTANCE)

            if (distance > MAX_TITLE_VIEW_DISTANCE && entity.title.visible) {
              entity.title.visible = false
            } else if (
              distance <= MAX_TITLE_VIEW_DISTANCE &&
              !entity.title.visible
            ) {
              entity.title.visible = true
            }
          }
        }
      })

      // manage LOD when player moves
      aiter(abortable(setInterval(1000, null, { signal }))).forEach(() => {
        const state = get_state()
        const { visible_characters } = state
        const player = current_character(state)

        if (player.position) {
          visible_characters.forEach(entity => {
            const { position } = entity
            const distance = player.position.distanceTo(position)

            entity.set_low_priority(distance > MAX_ANIMATION_DISTANCE)

            if (distance > MAX_TITLE_VIEW_DISTANCE && entity.title.visible) {
              entity.title.visible = false
            } else if (
              distance <= MAX_TITLE_VIEW_DISTANCE &&
              !entity.title.visible
            ) {
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
    },
  }
}
