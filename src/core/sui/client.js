import EventEmitter from 'events'

import { TransactionBlock } from '@mysten/sui.js/transactions'
import { BigNumber as BN } from 'bignumber.js'
import { MIST_PER_SUI } from '@mysten/sui.js/utils'
import { LRUCache } from 'lru-cache'
import { KioskTransaction, Network } from '@mysten/kiosk'
import { SDK } from '@aresrpg/aresrpg-sdk/sui'

import { context } from '../game/game.js'
import logger from '../../logger.js'
import toast from '../../toast.js'
import {
  VITE_SUI_MAINNET_RPC,
  VITE_SUI_MAINNET_WSS,
  VITE_SUI_TESTNET_RPC,
  VITE_SUI_TESTNET_WSS,
} from '../../env.js'

const SUINS_CACHE = new LRUCache({ max: 50 })

export const OBJECTS_CACHE = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
})

let current_network = 'sui:devnet'

const sdk_mainnet = await SDK({
  rpc_url: VITE_SUI_MAINNET_RPC,
  wss_url: VITE_SUI_MAINNET_WSS,
  network: Network.MAINNET,
})

const sdk_testnet = await SDK({
  rpc_url: VITE_SUI_TESTNET_RPC,
  wss_url: VITE_SUI_TESTNET_WSS,
  network: Network.TESTNET,
})

export const sdk = () =>
  current_network === 'mainnet' ? sdk_mainnet : sdk_testnet

/** @return {Promise<Type.SuiCharacter>} */
export async function sui_get_character(id) {
  const object = OBJECTS_CACHE.get(id)
  if (object)
    // @ts-ignore
    return object

  const fetched_object = sdk().get_character(id)

  OBJECTS_CACHE.set(id, fetched_object)
  return fetched_object
}

export const set_network = network => {
  if (network === 'sui:mainnet' || network === 'sui:testnet') {
    const [, parsed_network] = network.split(':')

    logger.SUI('switch network', { network })
    current_network = parsed_network
  }
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
  const sender = get_address()
  if (!sender) {
    toast.error('Please login again', 'Wallet not found')
    throw new Error('Wallet not found')
  }

  try {
    const { transactionBlockBytes, signature } =
      await get_wallet().signTransactionBlock({
        transaction_block,
        sender,
      })

    const result = await sdk().sui_client.executeTransactionBlock({
      transactionBlock: transactionBlockBytes,
      signature,
      options: { showEffects: true },
    })

    return result
  } catch (error) {
    if (
      error.message.includes('rejection') ||
      error.message.includes('Rejected')
    )
      return

    if (error.message.includes('Some("assert_latest") }, 1')) {
      toast.error(
        `The app is outdated and can't use this feature. Please update the app.`,
      )
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
  return sdk().get_locked_characters(get_address())
}

export async function sui_get_unlocked_characters() {
  return sdk().get_unlocked_characters(get_address())
}

export function mists_to_sui(balance) {
  return BN(balance).dividedBy(MIST_PER_SUI.toString()).toString()
}

export async function sui_get_sui_balance() {
  return sdk().get_sui_balance(get_address())
}

async function enforce_personal_kiosk(tx, recipient) {
  const { kioskOwnerCaps } = await sdk().kiosk_client.getOwnedKiosks({
    address: recipient,
  })

  const first_personal_kiosk = kioskOwnerCaps.find(
    ({ isPersonal }) => !!isPersonal,
  )

  const kiosk_tx = new KioskTransaction({
    transactionBlock: tx,
    kioskClient: sdk().kiosk_client,
    ...(first_personal_kiosk && { cap: first_personal_kiosk }),
  })

  if (!first_personal_kiosk) kiosk_tx.createPersonal(true)

  return {
    kiosk_tx,
    kiosk_id: kiosk_tx.getKiosk(),
    kiosk_cap: kiosk_tx.getKioskCap(),
  }
}

export async function sui_create_character({ name, type, sex = 'male' }) {
  const tx = new TransactionBlock()

  const { kiosk_tx, kiosk_id, kiosk_cap } = await enforce_personal_kiosk(
    tx,
    get_address(),
  )

  const [character_id] = tx.moveCall({
    target: `${sdk().LATEST_PACKAGE_ID}::aresrpg::create_and_lock_character`,
    arguments: [
      kiosk_id,
      kiosk_cap,
      tx.object(sdk().NAME_REGISTRY),
      tx.object(sdk().CHARACTER_POLICY),
      tx.pure(name),
      tx.pure(type),
      tx.pure(sex),
      tx.object(sdk().VERSION),
    ],
  })

  // finalize resolve the kiosk promise (personal kiosk borrow of kiosk cap)
  logger.SUI('create character', { name, type, sex })

  lock_character({
    character_id,
    kiosk_id,
    kiosk_cap,
    tx,
  })

  kiosk_tx.finalize()

  await execute(tx)
}

export async function sui_is_character_name_taken(name) {
  const txb = new TransactionBlock()
  txb.setSender(get_address())
  txb.moveCall({
    target: `${sdk().LATEST_PACKAGE_ID}::registry::assert_name_available`,
    arguments: [txb.object(sdk().NAME_REGISTRY), txb.pure(name.toLowerCase())],
  })

  txb.setGasBudget(100000000)

  const { sui_client } = sdk()

  try {
    const {
      effects: {
        status: { status, error },
      },
    } = await sui_client.dryRunTransactionBlock({
      transactionBlock: await txb.build({ client: sui_client }),
    })

    logger.SUI('is character name taken', { name, status, error })

    return status === 'failure'
  } catch (error) {
    if (
      error.message.includes('rejection') ||
      error.message.includes('Rejected')
    )
      return

    if (error.message.includes('No valid gas coins')) {
      toast.error(
        'You need Sui in your wallet to perform this action',
        'Transaction failed',
      )
      return
    }

    toast.error(error.message, 'Transaction failed')
    throw error
  }
}

function lock_character({ character_id, kiosk_id, kiosk_cap, tx }) {
  tx.moveCall({
    target: `${sdk().LATEST_PACKAGE_ID}::aresrpg::select_character`,
    arguments: [
      kiosk_id,
      kiosk_cap,
      tx.object(sdk().CHARACTER_PROTECTED_POLICY),
      character_id,
      tx.object(sdk().VERSION),
    ],
  })

  logger.SUI('lock character', character_id)
}

async function borrow_kiosk_owner_cap({ personal_kiosk_cap_id, tx, handler }) {
  const personal_kiosk_package_id = sdk().kiosk_client.getRulePackageId(
    'personalKioskRulePackageId',
  )

  const [kiosk_cap, promise] = tx.moveCall({
    target: `${personal_kiosk_package_id}::personal_kiosk::borrow_val`,
    arguments: [tx.object(personal_kiosk_cap_id)],
  })

  handler(kiosk_cap)

  tx.moveCall({
    target: `${personal_kiosk_package_id}::personal_kiosk::return_val`,
    arguments: [tx.object(personal_kiosk_cap_id), kiosk_cap, promise],
  })
}

// character must be locked in the extension as it's the only way to access the object bypassing the lock
export async function sui_delete_character({
  kiosk_id,
  personal_kiosk_cap_id,
  id,
}) {
  const tx = new TransactionBlock()

  borrow_kiosk_owner_cap({
    personal_kiosk_cap_id,
    tx,
    handler: kiosk_cap => {
      tx.moveCall({
        target: `${sdk().LATEST_PACKAGE_ID}::aresrpg::delete_character`,
        arguments: [
          tx.object(kiosk_id),
          kiosk_cap,
          tx.object(sdk().NAME_REGISTRY),
          tx.pure.id(id),
          tx.object(sdk().VERSION),
        ],
      })
    },
  })

  logger.SUI('delete character', id)

  await execute(tx)
}

export async function sui_lock_character({
  kiosk_id,
  personal_kiosk_cap_id,
  id,
}) {
  const tx = new TransactionBlock()

  borrow_kiosk_owner_cap({
    personal_kiosk_cap_id,
    tx,
    handler: kiosk_cap => {
      lock_character({
        character_id: tx.pure.id(id),
        kiosk_id: tx.object(kiosk_id),
        kiosk_cap,
        tx,
      })
    },
  })

  await execute(tx)
}

export async function sui_unlock_character({
  kiosk_id,
  personal_kiosk_cap_id,
  id,
}) {
  const tx = new TransactionBlock()

  borrow_kiosk_owner_cap({
    personal_kiosk_cap_id,
    tx,
    handler: kiosk_cap => {
      tx.moveCall({
        target: `${sdk().LATEST_PACKAGE_ID}::aresrpg::unselect_character`,
        arguments: [
          tx.object(kiosk_id),
          kiosk_cap,
          tx.object(sdk().CHARACTER_POLICY),
          tx.pure.id(id),
          tx.object(sdk().VERSION),
        ],
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
//     await sdk().kiosk_client.getOwnedKiosks({
//       address: get_address(),
//     })
//   const personal_kiosk_cap = my_kiosk_caps.find(
//     ({ objectId }) => objectId === personal_kiosk_cap_id,
//   )
//   const tx = new TransactionBlock()
//   const source_kiosk_tx = new KioskTransaction({
//     transactionBlock: tx,
//     kioskClient: sdk().kiosk_client,
//     cap: personal_kiosk_cap,
//   })

//   const recipient_kiosk = await enforce_personal_kiosk(tx, address)
//   const item = {
//     itemType: `${sdk().PACKAGE_ID}::character::Character`,
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

    active_subscription.unsubscribe = await sdk().subscribe(event => {
      logger.SUI('rpc event', event)
      emitter.emit('update', event)
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

/** @type {(address: string) => Promise<string>} */
export async function get_alias(address) {
  const cached = SUINS_CACHE.get(address)
  // @ts-ignore
  if (cached) return cached

  const {
    data: [name],
  } = await sdk_mainnet.sui_client.resolveNameServiceNames({
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
