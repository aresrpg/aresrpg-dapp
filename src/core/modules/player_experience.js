import toast from '../../toast.js'
import { state_iterator } from '../utils/iterator.js'

/** @type {Type.Module} */
export default function () {
  return {
    observe() {
      state_iterator()
        .filter(state => state.online)
        .reduce((last_experiences, state) => {
          state.sui.locked_characters.forEach(character => {
            if (!last_experiences.has(character.id)) {
              last_experiences.set(character.id, character.experience)
            }
            const last_experience = last_experiences.get(character.id)

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
