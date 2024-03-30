import { EventEmitter, on } from 'events'

import { aiter } from 'iterator-helper'
import {
  getWallets,
  isWalletWithRequiredFeatureSet,
} from '@mysten/wallet-standard'

export const wallet_emitter = new EventEmitter()
const internal_emitter = new EventEmitter()

const is_sui_wallet = wallet =>
  isWalletWithRequiredFeatureSet(wallet, [
    'sui:signAndExecuteTransactionBlock',
    'sui:signPersonalMessage',
    'sui:signTransactionBlock',
  ])

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
      signAndExecuteTransactionBlock({ transaction_block, sender }) {
        return features[
          'sui:signAndExecuteTransactionBlock'
          // @ts-ignore
        ].signAndExecuteTransactionBlock({
          account: { address: sender },
          transactionBlock: transaction_block,
        })
      },
      signPersonalMessage(msg, address) {
        // @ts-ignore
        return features['sui:signPersonalMessage'].signPersonalMessage({
          // @ts-ignore
          account: { address },
          message: new TextEncoder().encode(msg),
        })
      },
      signTransactionBlock({ transaction_block, sender }) {
        // @ts-ignore
        return features['sui:signTransactionBlock'].signTransactionBlock({
          account: { address: sender },
          transactionBlock: transaction_block,
        })
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
      signAndExecuteTransactionBlock,
      signPersonalMessage,
      signTransactionBlock,
    }) => {
      internal_emitter.emit('update', {
        accounts,
        chain: chains[0],
        icon,
        name,
        version,
        connect,
        disconnect,
        signAndExecuteTransactionBlock,
        signPersonalMessage,
        signTransactionBlock,
      })

      // @ts-ignore
      features['standard:events'].on('change', ({ accounts, chains }) => {
        if (accounts) {
          internal_emitter.emit('update', {
            accounts: accounts.map(({ address }) => ({ address })),
            // if present it will be the same for all accounts
            chain: accounts[0].chains?.[0],
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
    },
  )

  if (last_selected_wallet_name) {
    const wallet = wallets.find(w => w.name === last_selected_wallet_name)
    if (wallet) await wallet.connect()
  }
}
