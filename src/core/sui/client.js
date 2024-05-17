import EventEmitter from 'events'

import { TransactionBlock } from '@mysten/sui.js/transactions'
import { BigNumber as BN } from 'bignumber.js'
import { MIST_PER_SUI } from '@mysten/sui.js/utils'
import { LRUCache } from 'lru-cache'
import { Network } from '@mysten/kiosk'
import { SDK } from '@aresrpg/aresrpg-sdk/sui'
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client'

import { context } from '../game/game.js'
import logger from '../../logger.js'
import toast from '../../toast.js'
import { NETWORK, VITE_SUI_RPC, VITE_SUI_WSS } from '../../env.js'

// @ts-ignore
import TwemojiSalt from '~icons/twemoji/salt'
// @ts-ignore
import MapGasStation from '~icons/map/gas-station'
// @ts-ignore
import MaterialSymbolsLightRuleSettings from '~icons/material-symbols-light/rule-settings'

const SUINS_CACHE = new LRUCache({ max: 50 })

let t = null

export const error_sui = {
  en: {
    LOGIN_AGAIN: 'Please login again',
    WALLET_NOT_FOUND: 'Wallet not found',
    PLEASE_SWITCH_NETWORK: 'Please switch to the Sui',
    ENOKI_SALT:
      'Enoki failed to deliver the transaction (salt failure). Please try again.',
    OUTDATED: `The app is outdated and can't use this feature. Please update the app.`,
    NO_GAS: 'You need Sui in your wallet to perform this action',
    WALLET_CONFIG: 'Wallet configuration error',
  },
  fr: {
    LOGIN_AGAIN: 'Veuillez vous reconnecter',
    WALLET_NOT_FOUND: 'Portefeuille introuvable',
    PLEASE_SWITCH_NETWORK: 'Veuillez passer sur le Sui',
    ENOKI_SALT:
      "Enoki n'a pas pu livrer la transaction (échec du salt). Veuillez réessayer.",
    OUTDATED: `L'application est obsolète et ne peut pas utiliser cette fonctionnalité. Veuillez mettre à jour l'application.`,
    NO_GAS:
      'Vous avez besoin de Sui dans votre portefeuille pour effectuer cette action',
    WALLET_CONFIG: 'Erreur de configuration du portefeuille',
  },
}

export const OBJECTS_CACHE = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
})

export const sdk = await SDK({
  rpc_url: VITE_SUI_RPC,
  wss_url: VITE_SUI_WSS,
  network: Network[NETWORK],
})

/** @return {Promise<Type.SuiCharacter>} */
export async function sui_get_character(id) {
  const object = OBJECTS_CACHE.get(id)
  if (object)
    // @ts-ignore
    return object

  const fetched_object = sdk.get_character_by_id(id)

  OBJECTS_CACHE.set(id, fetched_object)
  return fetched_object
}

function get_wallet() {
  const {
    sui: { wallets, selected_wallet_name },
  } = context.get_state()

  return wallets[selected_wallet_name]
}

function get_address() {
  return context.get_state().sui.selected_address
}

const execute = async transaction_block => {
  if (!t) {
    const { i18n } = await import('../../main.js')
    // eslint-disable-next-line prefer-destructuring
    t = i18n.global.t
  }

  const sender = get_address()
  if (!sender) {
    toast.error(t('LOGIN_AGAIN'), t('WALLET_NOT_FOUND'))
    throw new Error('Wallet not found')
  }

  try {
    const wallet = get_wallet()

    if (wallet.chain !== `sui:${NETWORK}`) {
      toast.error(
        t('PLEASE_SWITCH_NETWORK') + ' ' + NETWORK,
        t('WALLET_CONFIG'),
        MaterialSymbolsLightRuleSettings,
      )
      return
    }

    // ? Enoki doesn't seem to support returning a signed transaction block
    if (wallet.name === 'Enoki') {
      return await wallet.signAndExecuteTransactionBlock({
        transaction_block,
        sender,
      })
    } else {
      // otherwise we execute the tx through our chosen RPC
      const { transactionBlockBytes, signature } =
        await get_wallet().signTransactionBlock({
          transaction_block,
          sender,
        })

      const result = await sdk.sui_client.executeTransactionBlock({
        transactionBlock: transactionBlockBytes,
        signature,
        options: { showEffects: true },
      })

      return result
    }
  } catch (error) {
    console.dir({ error }, { depth: Infinity })
    if (error.code === 'salt_failure') {
      toast.error(t('ENOKI_SALT'), 'Oh no!', TwemojiSalt)
      return
    }

    if (error.message.includes('No valid gas coins')) {
      toast.error(t('NO_GAS'), 'Suuuuuu', MapGasStation)
      return
    }

    if (
      error.message.includes('rejection') ||
      error.message.includes('Rejected')
    )
      return

    if (error.message.includes('Some("assert_latest") }, 1')) {
      toast.error(t('OUTDATED'))
    } else toast.error(error.message, 'Transaction failed')
    throw error
  }
}

const active_subscription = {
  unsubscribe: null,
  emitter: null,
  interval: null,
}

export async function sui_get_locked_characters() {
  return sdk.get_locked_characters(get_address())
}

export async function sui_get_unlocked_characters() {
  return sdk.get_unlocked_characters(get_address())
}

export async function sui_get_locked_items() {
  return sdk.get_locked_items(get_address())
}

export async function sui_get_unlocked_items() {
  return sdk.get_unlocked_items(get_address())
}

export async function sui_withdraw_items_from_extension(items) {
  const tx = new TransactionBlock()

  const by_kiosk = new Map()

  items.forEach(item => {
    if (!by_kiosk.has(item.kiosk_id)) by_kiosk.set(item.kiosk_id, [])
    by_kiosk.get(item.kiosk_id).push(item.id)
  })

  const { kiosks, finalize } = await sdk.get_user_kiosks({
    address: get_address(),
    tx,
  })

  by_kiosk.forEach((ids, kiosk_id) => {
    sdk.withdraw_items({
      tx,
      kiosk_id,
      kiosk_cap: kiosks.get(kiosk_id),
      item_ids: ids,
    })
  })

  finalize()

  await execute(tx)
}

export async function sui_equip_items({ character, to_equip, to_unequip }) {
  const tx = new TransactionBlock()

  const { kiosks, finalize } = await sdk.get_user_kiosks({
    tx,
    address: get_address(),
  })

  const { kiosk_id, id } = character
  const kiosk_cap = kiosks.get(kiosk_id)

  to_unequip.forEach(({ item, slot }) => {
    sdk.unequip_item({
      tx,
      kiosk: kiosk_id,
      kiosk_cap,
      item_kiosk: item.kiosk_id,
      character_id: id,
      slot,
      item_type: item._type,
    })
  })

  to_equip.forEach(({ item, slot }) => {
    sdk.equip_item({
      tx,
      kiosk: kiosk_id,
      kiosk_cap,
      item_kiosk: item.kiosk_id,
      item_kiosk_cap: kiosks.get(item.kiosk_id),
      item_id: item.id,
      character_id: id,
      slot,
      item_type: item._type,
    })
  })

  // return all kiosk cap for personal kiosks
  finalize()

  await execute(tx)
}

export function mists_to_sui(balance) {
  return BN(balance).dividedBy(MIST_PER_SUI.toString()).toString()
}

export async function sui_get_sui_balance() {
  return sdk.get_sui_balance(get_address())
}

export async function sui_create_character({ name, type, sex = 'male' }) {
  const tx = new TransactionBlock()

  const { kiosk_cap, kiosk_id, kiosk_tx } = await sdk.enforce_personal_kiosk({
    tx,
    recipient: get_address(),
  })

  const character_id = sdk.create_character({
    tx,
    name,
    classe: type,
    sex,
    kiosk_cap,
    kiosk_id,
  })

  sdk.select_character({
    character_id,
    kiosk_id,
    kiosk_cap,
    tx,
  })

  kiosk_tx.finalize()

  await execute(tx)
}

export async function sui_is_character_name_taken(name) {
  try {
    return sdk.is_character_name_taken({
      address: get_address(),
      name,
    })
  } catch (error) {
    if (error.message === 'NO_GAS')
      toast.error(t('NO_GAS'), 'Suuuuuu', MapGasStation)
    else toast.error(error.message, 'Transaction failed')
  }
}

// character must be locked in the extension as it's the only way to access the object bypassing the lock
export async function sui_delete_character({
  kiosk_id,
  personal_kiosk_cap_id,
  id,
}) {
  const tx = new TransactionBlock()

  sdk.borrow_kiosk_owner_cap({
    personal_kiosk_cap_id,
    tx,
    handler: kiosk_cap => {
      sdk.delete_character({
        tx,
        kiosk_id,
        kiosk_cap,
        character_id: tx.pure.id(id),
      })
    },
  })

  logger.SUI('delete character', id)

  await execute(tx)
}

export async function sui_select_character({
  kiosk_id,
  personal_kiosk_cap_id,
  id,
}) {
  const tx = new TransactionBlock()

  sdk.borrow_kiosk_owner_cap({
    personal_kiosk_cap_id,
    tx,
    handler: kiosk_cap => {
      sdk.select_character({
        tx,
        kiosk_id,
        kiosk_cap,
        character_id: tx.pure.id(id),
      })
    },
  })

  await execute(tx)
}

export async function sui_unselect_character({
  kiosk_id,
  personal_kiosk_cap_id,
  id,
}) {
  const tx = new TransactionBlock()

  sdk.borrow_kiosk_owner_cap({
    personal_kiosk_cap_id,
    tx,
    handler: kiosk_cap => {
      sdk.unselect_character({
        tx,
        kiosk_id,
        kiosk_cap,
        character_id: id,
      })
    },
  })

  logger.SUI('unlock character', { kiosk_id, id })

  await execute(tx)
}

// export async function sui_send_character(
//   { id, kiosk_id, personal_kiosk_cap_id },
//   to,
// ) {
//   const is_alias = to.endsWith('.sui')
//   const address = is_alias
//     ? await sui_mainnet_client.resolveNameServiceAddress({ name: to })
//     : to

//   const { kioskOwnerCaps: my_kiosk_caps } =
//     await sdk.kiosk_client.getOwnedKiosks({
//       address: get_address(),
//     })
//   const personal_kiosk_cap = my_kiosk_caps.find(
//     ({ objectId }) => objectId === personal_kiosk_cap_id,
//   )
//   const tx = new TransactionBlock()
//   const source_kiosk_tx = new KioskTransaction({
//     transactionBlock: tx,
//     kioskClient: sdk.kiosk_client,
//     cap: personal_kiosk_cap,
//   })

//   const recipient_kiosk = await enforce_personal_kiosk(tx, address)
//   const item = {
//     itemType: `${sdk.PACKAGE_ID}::character::Character`,
//     itemId: id,
//     price: 0n,
//   }

//   source_kiosk_tx.list(item)
//   source_kiosk_tx.finalize()

//   await recipient_kiosk.kiosk_tx.purchaseAndResolve({
//     ...item,
//     sellerKiosk: kiosk_id,
//   })

//   logger.SUI('send character', { id, to })

//   await execute(tx)
// }

export async function sui_subscribe({ signal }) {
  const emitter = new EventEmitter()

  async function try_reset() {
    if (active_subscription.emitter) {
      active_subscription.emitter.removeAllListeners()
      clearInterval(active_subscription.interval)
      if (active_subscription.unsubscribe)
        await active_subscription.unsubscribe()
    }
  }

  signal.addEventListener('abort', try_reset, { once: true })

  try {
    await try_reset()
    active_subscription.emitter = emitter
    active_subscription.interval = setInterval(() => {
      emitter.emit('update', { type: 'interval' })
    }, 10000)

    active_subscription.unsubscribe = await sdk.subscribe(event => {
      const { type } = event
      const [, , event_name] = type.split('::')
      logger.SUI(`rpc event ${event_name}`, event)
      emitter.emit(event_name, {
        ...event.parsedJson,
        sender_is_me: event.sender === get_address(),
      })
    })
  } catch (error) {
    if (error.message.includes('Invalid params'))
      console.error(
        'Unable to subscribe to the Sui node as it is too crowded. Please try again later.',
      )
    else console.error('Unable to subscribe to the Sui node', error)
    active_subscription.unsubscribe = null
  }

  return emitter
}

// this needs to always resolve mainnet names
const suins_client =
  NETWORK === 'mainnet'
    ? sdk.sui_client
    : new SuiClient({ url: getFullnodeUrl('mainnet') })

/** @type {(address: string) => Promise<string>} */
export async function get_alias(address) {
  const cached = SUINS_CACHE.get(address)
  // @ts-ignore
  if (cached) return cached

  const {
    data: [name],
  } = await suins_client.resolveNameServiceNames({
    address,
    limit: 1,
  })

  if (name) SUINS_CACHE.set(address, name)
  else SUINS_CACHE.set(address, address)

  // @ts-ignore
  return SUINS_CACHE.get(address)
}

export async function sui_sign_payload(message) {
  const address = get_address()
  const { bytes, signature } = await get_wallet().signPersonalMessage(
    message,
    address,
  )

  context.send_packet('packet/signatureResponse', { bytes, signature })
}
