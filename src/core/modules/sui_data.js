import { ANON, context, disconnect_ws } from '../game/game.js'
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
      let controller = new AbortController()

      async function update_user_data() {
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
      }

      state_iterator().reduce(
        async (
          { last_address, last_network },
          { sui, sui: { wallets, selected_address, selected_wallet_name } },
        ) => {
          const wallet = wallets[selected_wallet_name]
          const network = wallet?.chain

          const address_changed = last_address !== selected_address
          const network_changed = last_network !== network

          if (address_changed || network_changed) {
            disconnect_ws()

            if (selected_address && network) {
              increase_loading()

              if (is_chain_supported(sui)) {
                // unsubscription is handled internally
                sui_subscribe(controller).then(emitter => {
                  emitter.on('update', update_user_data)
                })
                await update_user_data()
              } else {
                context.dispatch('action/sui_data_update', {
                  locked_characters: [ANON],
                  unlocked_characters: [],
                  character_lock_receipts: [],
                })
              }
              decrease_loading()
            } else {
              controller.abort()
              controller = new AbortController()
              context.dispatch('action/sui_data_update', {
                locked_characters: [ANON],
                unlocked_characters: [],
                character_lock_receipts: [],
              })
            }
          }
          return {
            last_address: selected_address,
            last_network: network,
          }
        },
      )
    },
  }
}
