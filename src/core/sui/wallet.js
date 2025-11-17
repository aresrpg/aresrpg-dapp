import { EventEmitter, on } from 'events'

import { aiter } from 'iterator-helper'
import {
  getWallets,
  isWalletWithRequiredFeatureSet,
  signTransaction,
} from '@mysten/wallet-standard'

import { sdk } from './client.js'

export const wallet_emitter = new EventEmitter()
const internal_emitter = new EventEmitter()

const is_sui_wallet = (wallet) =>
  isWalletWithRequiredFeatureSet(wallet, ['sui:signPersonalMessage']) &&
  ('sui:signTransaction' in wallet.features ||
    'sui:signTransactionBlock' in wallet.features)

export async function initialize_wallets(last_selected_wallet_name) {
  aiter(on(internal_emitter, 'update'))
    .map(([wallet]) => wallet)
    .reduce((wallets, wallet) => {
      const last_wallet = wallets[wallet.name]

      if (!last_wallet) {
        wallet_emitter.emit('wallet', wallet)
        return { ...wallets, [wallet.name]: wallet }
      }

      const { accounts, chain } = wallet

      // if accounts are differents
      if (accounts && accounts !== last_wallet.accounts) {
        Object.assign(last_wallet, { accounts })
      }

      if (chain && chain !== last_wallet.chain) {
        Object.assign(last_wallet, { chain })
      }

      wallet_emitter.emit('wallet', last_wallet)

      return wallets
    }, {})

  const wallets = getWallets()
    .get()
    .filter(is_sui_wallet)
    .map(({ accounts, chains, features, icon, name, version }) => ({
      accounts,
      chains,
      icon,
      version,
      features,
      name,
      async connect() {
        // @ts-ignore
        const connected = await features['standard:connect'].connect()
        internal_emitter.emit('update', {
          accounts: connected.accounts.map(({ address }) => ({ address })),
          // if present it will be the same for all accounts
          chain: connected.accounts[0]?.chains?.[0],
          name,
        })
        wallet_emitter.emit('switch_wallet', name)

        return connected
      },
      async disconnect() {
        // @ts-ignore
        await features['standard:disconnect']?.disconnect()
        wallet_emitter.emit('switch_wallet', null)
      },
      signAndExecuteTransaction({ transaction, sender }) {
        throw new Error('Not implemented')
      },
      signPersonalMessage(msg, address) {
        // @ts-ignore
        return features['sui:signPersonalMessage'].signPersonalMessage({
          // @ts-ignore
          account: { address },
          message: new TextEncoder().encode(msg),
        })
      },
      /**
       * @param {object} opt
       * @param {import("@mysten/sui/transactions").Transaction} opt.transaction
       * @param {string} opt.sender
       *
       */
      signTransaction({ transaction, sender }) {
        return signTransaction(
          // @ts-ignore
          { features },
          {
            account: { address: sender },
            transaction: {
              toJSON: () =>
                transaction.toJSON({
                  supportedIntents: [],
                  client: sdk.sui_client,
                }),
            },
          }
        )
      },
    }))

  wallets.forEach(
    ({
      accounts,
      chains,
      icon,
      name,
      version,
      features,
      connect,
      disconnect,
      signAndExecuteTransaction,
      signPersonalMessage,
      signTransaction,
    }) => {
      internal_emitter.emit('update', {
        accounts,
        chain: chains[0],
        icon,
        name,
        version,
        connect,
        disconnect,
        signAndExecuteTransaction,
        signPersonalMessage,
        signTransaction,
      })

      // @ts-ignore
      features['standard:events'].on('change', ({ accounts, chains }) => {
        if (accounts) {
          internal_emitter.emit('update', {
            accounts: accounts.map(({ address }) => ({ address })),
            // if present it will be the same for all accounts
            chain: accounts?.[0]?.chains?.[0],
            name,
          })
        }
        if (chains) {
          internal_emitter.emit('update', {
            name,
            chain: chains[0],
          })
        }
      })
    }
  )

  if (last_selected_wallet_name) {
    const wallet = wallets.find((w) => w.name === last_selected_wallet_name)
    if (wallet) await wallet.connect()
  }
}
