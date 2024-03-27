import { context } from '../game/game.js'
import {
  sui_get_locked_characters,
  sui_get_receipts,
  sui_get_sui_balance,
  sui_get_unlocked_characters,
  sui_subscribe,
} from '../sui/client.js'
import { state_iterator } from '../utils/iterator.js'
import { decrease_loading, increase_loading } from '../utils/loading.js'
import { is_chain_supported } from '../utils/sui/is_chain_supported.js'

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
      state_iterator().reduce(
        (last_address, { sui, sui: { selected_address } }) => {
          if (selected_address && last_address !== selected_address) {
            increase_loading()

            if (is_chain_supported(sui)) {
              // unsubscription is handled internally
              sui_subscribe().then(emitter => {
                emitter.on('update', async () => {
                  const character_lock_receipts = await sui_get_receipts()
                  const [locked_characters, unlocked_characters, balance] =
                    await Promise.all([
                      sui_get_locked_characters(character_lock_receipts),
                      sui_get_unlocked_characters(),
                      sui_get_sui_balance(),
                    ])

                  context.dispatch('action/sui_data_update', {
                    balance,
                    locked_characters,
                    unlocked_characters,
                    character_lock_receipts,
                  })
                })
              })
            } else {
              context.dispatch('action/sui_data_update', {
                locked_characters: [],
                unlocked_characters: [],
                character_lock_receipts: [],
              })
              decrease_loading()
            }
          }
          return selected_address
        },
      )
    },
  }
}
