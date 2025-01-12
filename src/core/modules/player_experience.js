import toast from '../../toast.js'
import { context } from '../game/game.js'
import { experience_to_level } from '../utils/game/experience.js'
import { state_iterator } from '../utils/iterator.js'

/** @type {Type.Module} */
export default function () {
  return {
    observe() {
      state_iterator()
        .filter(state => state.online)
        .reduce((last_experiences, state) => {
          state.sui.characters.forEach(character => {
            if (!last_experiences.has(character.id))
              last_experiences.set(character.id, character.experience)

            const last_experience = last_experiences.get(character.id)
            const last_level = experience_to_level(last_experience)
            const current_level = experience_to_level(character.experience)
            if (last_level !== current_level) {
              context.events.emit('LEVEL_UP', {
                level: current_level,
                levels_taken: current_level - last_level,
              })
            }

            if (last_experience !== character.experience) {
              toast.tx(`+${character.experience - last_experience} XP !`, '', {
                // @ts-ignore
                duration: 5000,
                icon: 'sword',
              })
              last_experiences.set(character.id, character.experience)
            }
          })
          return last_experiences
        }, new Map())
    },
  }
}
