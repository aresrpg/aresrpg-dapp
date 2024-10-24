import { context } from '../game/game.js'
import { spawn_crescent_sword } from '../utils/game/objects.js'
import { state_iterator } from '../utils/iterator.js'

function is_in_team(team, character_id) {
  return team.some(({ id }) => id === character_id)
}

/** @type {Type.Module} */
export default function () {
  const fight_swords = new Map()
  return {
    reduce(state, { type, payload }) {
      if (type === 'action/join_fight') {
        const character = state.characters.find(
          ({ id }) => id === payload.character_id,
        )

        if (character) character.current_fight_id = payload.fight_id
      }

      return state
    },
    observe() {
      context.events.on('packet/fightSpawn', async fight => {
        try {
          const { visible_fights, characters } = context.get_state()

          fight.start_time = +fight.start_time

          visible_fights.set(fight.id, fight)

          characters.forEach(character => {
            if (
              is_in_team(fight.team1, character.id) ||
              is_in_team(fight.team2, character.id)
              // is_in_team(fight.spectators, character.id)
            ) {
              context.dispatch('action/join_fight', {
                character_id: character.id,
                fight_id: fight.id,
              })
            }
          })

          fight_swords.set(
            fight.id,
            await spawn_crescent_sword(fight, context.scene),
          )
        } catch (error) {
          console.error('Failed to spawn fight', error)
        }
      })

      context.events.on('packet/fightsDespawn', ({ ids }) => {
        const { visible_fights } = context.get_state()

        ids.forEach(id => {
          visible_fights.delete(id)
          const dispose = fight_swords.get(id)
          if (dispose) {
            dispose()
            fight_swords.delete(id)
          }
        })
      })

      state_iterator().forEach(state => {
        if (!state.online) {
          fight_swords.forEach(dispose => dispose())
          fight_swords.clear()

          state.visible_fights.clear()
        }
      })
    },
  }
}
