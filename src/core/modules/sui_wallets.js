import { on } from 'events'

import { aiter, iter } from 'iterator-helper'

import { get_alias, set_network } from '../sui/client.js'
import { initialize_wallets, wallet_emitter } from '../sui/wallet.js'
import { context } from '../game/game.js'

/** @type {Type.Module} */
export default function () {
  return {
    reduce(state, { type, payload }) {
      if (type === 'action/register_wallet') {
        return {
          ...state,
          sui: {
            ...state.sui,
            wallets: {
              ...state.sui.wallets,
              [payload.name]: payload,
            },
          },
        }
      }
      if (type === 'action/select_wallet') {
        return {
          ...state,
          sui: {
            ...state.sui,
            selected_wallet_name: payload,
          },
        }
      }
      if (type === 'action/select_address') {
        return {
          ...state,
          sui: {
            ...state.sui,
            selected_address: payload,
          },
        }
      }
      return state
    },
    observe() {
      context.events.once('STATE_UPDATED', async () => {
        try {
          await initialize_wallets(localStorage.getItem('last_selected_wallet'))
        } catch (error) {
          console.error('Unable to initialize wallets', error)
        }
      })

      wallet_emitter.on(
        'wallet',
        /** @param {Type.Wallet} wallet */
        async wallet => {
          try {
            // find the wallet by its name and replace it
            await set_network(wallet.chain)

            await iter(wallet.accounts)
              .toAsyncIterator()
              .forEach(async account => {
                account.alias = await get_alias(account.address)
              })

            context.dispatch('action/register_wallet', wallet)
          } catch (error) {
            console.error('Unable to handle the wallet event', error)
          }
        },
      )

      wallet_emitter.on('switch_wallet', name => {
        if (!name) {
          context.dispatch('action/select_wallet', null)
          context.dispatch('action/select_address', null)

          localStorage.removeItem('last_selected_address')
          localStorage.removeItem('last_selected_wallet')
          return
        }

        const wallet = context.get_state().sui.wallets[name]
        // make sure the wallet exists before dispatching
        if (!wallet) return

        context.dispatch('action/select_wallet', name)
        localStorage.setItem('last_selected_wallet', name)
      })

      aiter(on(context.events, 'STATE_UPDATED'))
        .map(
          ([
            {
              sui: { selected_wallet_name, wallets, selected_address },
            },
          ]) => ({
            selected_wallet_name,
            wallets,
            selected_address,
          }),
        )
        .reduce(
          (
            last_wallet_name,
            { selected_wallet_name, wallets, selected_address },
          ) => {
            if (last_wallet_name !== selected_wallet_name) {
              const last_selected_address =
                selected_address ||
                localStorage.getItem('last_selected_address')
              const available_addresses = wallets[
                selected_wallet_name
              ].accounts.map(({ address }) => address)

              // here we try to select the address depending on last choices or the first one
              if (
                last_selected_address &&
                available_addresses.includes(last_selected_address)
              ) {
                context.dispatch('action/select_address', last_selected_address)
              } else {
                context.dispatch(
                  'action/select_address',
                  available_addresses[0],
                )
                localStorage.setItem(
                  'last_selected_address',
                  available_addresses[0],
                )
              }
            }

            return selected_wallet_name
          },
        )
    },
  }
}
