import { context, disconnect_ws } from '../game/game.js'
import {
  sui_get_locked_characters,
  sui_get_sui_balance,
  sui_get_unlocked_characters,
  sui_subscribe,
} from '../sui/client.js'
import { state_iterator } from '../utils/iterator.js'
import { decrease_loading, increase_loading } from '../utils/loading.js'

export const DEFAULT_SUI_CHARACTER = () => ({
  id: 'default',
  name: 'Chafer Lancier',
  classe: 'default',
  sex: 'default',

  position: { x: 0, y: 220, z: 0 },
  experience: 0,
  health: 30,
  selected: false,
  soul: 100,
  available_stat_points: 0,

  vitality: 0,
  wisdom: 0,
  strength: 0,
  intelligence: 0,
  chance: 0,
  agility: 0,
})

/** @type {Type.Module} */
export default function () {
  return {
    reduce(state, { type, payload }) {
      if (type === 'action/sui_data_update') {
        return {
          ...state,
          sui: {
            ...state.sui,
            ...payload,
          },
        }
      }
      return state
    },
    async observe() {
      let controller = new AbortController()
      async function update_user_data() {
        const [locked_characters, unlocked_characters, balance] =
          await Promise.all([
            sui_get_locked_characters(),
            sui_get_unlocked_characters(),
            sui_get_sui_balance(),
          ])

        context.dispatch('action/sui_data_update', {
          balance,
          locked_characters,
          unlocked_characters,
        })
      }

      state_iterator().reduce(
        async (last_address, { sui: { selected_address } }) => {
          const address_changed = last_address !== selected_address

          if (address_changed) {
            disconnect_ws()

            if (selected_address) {
              increase_loading()

              // unsubscription is handled internally
              sui_subscribe(controller).then(emitter => {
                emitter.on('update', update_user_data)
              })
              await update_user_data()
              decrease_loading()
            } else {
              controller.abort()
              controller = new AbortController()

              context.dispatch('action/sui_data_update', {
                locked_characters: [DEFAULT_SUI_CHARACTER()],
                unlocked_characters: [],
                character_lock_receipts: [],
              })
            }
          }

          return selected_address
        },
      )
    },
  }
}
