import EventEmitter from 'events'

import { SuiClient, SuiHTTPTransport } from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import BN from 'bignumber.js'
import { MIST_PER_SUI } from '@mysten/sui.js/utils'
import { LRUCache } from 'lru-cache'

import {
  VITE_ARESRPG_SERVER_ADMIN_CAP_MAINNET,
  VITE_ARESRPG_SERVER_ADMIN_CAP_TESTNET,
  VITE_ARESRPG_NAME_REGISTRY_MAINNET,
  VITE_ARESRPG_NAME_REGISTRY_TESTNET,
  VITE_ARESRPG_PACKAGE_MAINNET_ORIGINAL,
  VITE_ARESRPG_PACKAGE_MAINNET_UPGRADED,
  VITE_ARESRPG_PACKAGE_TESTNET_ORIGINAL,
  VITE_ARESRPG_PACKAGE_TESTNET_UPGRADED,
  VITE_SUI_MAINNET_RPC,
  VITE_SUI_MAINNET_WSS,
  VITE_SUI_TESTNET_RPC,
  VITE_SUI_TESTNET_WSS,
} from '../../env.js'
import { context } from '../game/game.js'
import logger from '../../logger.js'
import toast from '../../toast.js'

const PACKAGES = {
  'sui:testnet': {
    original: VITE_ARESRPG_PACKAGE_TESTNET_ORIGINAL,
    upgraded: VITE_ARESRPG_PACKAGE_TESTNET_UPGRADED,
    name_registry: VITE_ARESRPG_NAME_REGISTRY_TESTNET,
    admin_cap: VITE_ARESRPG_SERVER_ADMIN_CAP_TESTNET,
  },
  'sui:mainnet': {
    original: VITE_ARESRPG_PACKAGE_MAINNET_ORIGINAL,
    upgraded: VITE_ARESRPG_PACKAGE_MAINNET_UPGRADED,
    name_registry: VITE_ARESRPG_NAME_REGISTRY_MAINNET,
    admin_cap: VITE_ARESRPG_SERVER_ADMIN_CAP_MAINNET,
  },
}

const SUINS_CACHE = new LRUCache({ max: 50 })
const OBJECTS_CACHE = new LRUCache({
  max: 500,
})

const get_url = (network, ws) => {
  const is_mainnet = network === 'mainnet'
  const rpc = is_mainnet ? VITE_SUI_MAINNET_RPC : VITE_SUI_TESTNET_RPC
  const wss = is_mainnet ? VITE_SUI_MAINNET_WSS : VITE_SUI_TESTNET_WSS

  return ws ? wss : rpc
}

const get_client = network =>
  new SuiClient({
    transport: new SuiHTTPTransport({
      url: get_url(network),
      websocket: {
        reconnectTimeout: 1000,
        url: get_url(network, true).replace('http', 'ws'),
      },
    }),
  })

// client used to resolve SuiNS aliases
const mainnet_client = get_client('mainnet')

// client of which network is determined by user
let client = get_client('mainnet')

let last_used_network = 'sui:devnet'
let package_original = VITE_ARESRPG_PACKAGE_MAINNET_ORIGINAL
let package_upgraded = VITE_ARESRPG_PACKAGE_MAINNET_UPGRADED
let name_registry = VITE_ARESRPG_NAME_REGISTRY_MAINNET
let admin_cap = VITE_ARESRPG_SERVER_ADMIN_CAP_MAINNET
let known_storages = []

function parse_sui_object(object) {
  const { fields } = object.data.content
  return {
    ...fields,
    id: fields.id.id,
  }
}

async function get_cached_object(id, client) {
  const object = OBJECTS_CACHE.get(id)
  if (object) return object

  const fetched_object = parse_sui_object(
    await client.getObject({ id, options: { showContent: true } }),
  )

  OBJECTS_CACHE.set(id, fetched_object)
  return fetched_object
}

async function get_cached_objects(ids, client) {
  const missing = ids.filter(id => !OBJECTS_CACHE.has(id))

  if (missing.length) {
    const results = await client.multiGetObjects({
      ids: missing,
      options: { showContent: true },
    })

    results.map(parse_sui_object).forEach(result => {
      OBJECTS_CACHE.set(result.id, result)
    })
  }

  return ids.map(id => OBJECTS_CACHE.get(id))
}

export const set_network = async network => {
  if (network === 'sui:mainnet' || network === 'sui:testnet') {
    if (last_used_network === network) return
    last_used_network = network

    logger.SUI('switch network', network)

    client = get_client(network.split(':')[1])

    const {
      original,
      upgraded,
      name_registry: name_reg,
      admin_cap: adm_cap,
    } = PACKAGES[network]

    package_original = original
    package_upgraded = upgraded
    name_registry = name_reg
    admin_cap = adm_cap
    try {
      const known_storages_result = await get_cached_object(admin_cap, client)

      known_storages = known_storages_result.known_storages.fields.contents
    } catch (error) {
      console.error('unable to get the admin cap, env missing ?')
    }
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
    const result = await client.executeTransactionBlock({
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

    if (error.message.includes(', 5')) {
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

function random_storage() {
  const storage =
    known_storages[Math.floor(Math.random() * known_storages.length)]

  if (!storage) throw new Error('No available storage')
  return storage
}

export function mists_to_sui(balance) {
  return BN(balance).dividedBy(MIST_PER_SUI.toString()).toString()
}

export async function sui_get_sui_balance() {
  const { totalBalance } = await client.getBalance({
    owner: get_address(),
  })

  return BigInt(totalBalance)
}

export async function sui_create_character({ name, type, sex = 'male' }) {
  const tx = new TransactionBlock()

  const [character] = tx.moveCall({
    target: `${package_upgraded}::character::create_character`,
    arguments: [
      tx.object(name_registry),
      tx.pure(name),
      tx.pure(type),
      tx.pure(sex),
    ],
  })

  tx.transferObjects([character], get_address())

  logger.SUI('create character', { name, type, sex })

  await execute(tx)
}

export async function sui_is_character_name_taken(name) {
  const txb = new TransactionBlock()
  txb.setSender(get_address())
  txb.moveCall({
    target: `${package_upgraded}::character::is_name_taken`,
    arguments: [txb.object(name_registry), txb.pure(name)],
  })

  txb.setGasBudget(100000000)

  try {
    const {
      effects: {
        status: { status, error },
      },
    } = await client.dryRunTransactionBlock({
      transactionBlock: await txb.build({ client }),
    })

    logger.SUI('is character name taken', { name, status })

    if (error?.includes('Some("is_name_taken") }, 5')) {
      toast.error(
        `The app is outdated and can't use this feature. Please update the app.`,
      )
    }

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

export async function sui_delete_character(id) {
  const tx = new TransactionBlock()

  tx.moveCall({
    target: `${package_upgraded}::character::delete_character`,
    arguments: [tx.object(id), tx.object(name_registry)],
  })

  logger.SUI('delete character', id)

  await execute(tx)
}

export async function sui_lock_character(character_id) {
  const tx = new TransactionBlock()

  tx.moveCall({
    target: `${package_upgraded}::server::lock_character`,
    arguments: [tx.object(random_storage()), tx.object(character_id)],
  })

  logger.SUI('lock character', character_id)

  await execute(tx)
}

export async function sui_unlock_character(receipt) {
  const tx = new TransactionBlock()
  const [character] = tx.moveCall({
    target: `${package_upgraded}::server::unlock_character`,
    arguments: [tx.object(receipt.storage_id), tx.object(receipt.id)],
  })
  tx.transferObjects([character], tx.pure(get_address()))

  logger.SUI('unlock character', receipt.id)

  await execute(tx)
}

export async function sui_send_object(id, to) {
  const is_alias = to.endsWith('.sui')
  const address = is_alias
    ? await mainnet_client.resolveNameServiceAddress({ name: to })
    : to

  const tx = new TransactionBlock()
  tx.transferObjects([tx.object(id)], tx.pure(address))

  logger.SUI('send object', { id, to })

  await execute(tx)
}

export async function sui_get_receipts() {
  const owner = get_address()
  if (!owner) return []

  const result = await client.getOwnedObjects({
    owner,
    filter: {
      StructType: `${package_original}::server::CharacterLockReceipt`,
    },
    options: {
      showContent: true,
    },
  })

  const receipts = result.data.map(({ data }) => ({
    // @ts-ignore
    ...data.content.fields,
    // @ts-ignore
    id: data.content.fields.id.id,
  }))

  return receipts
}

export async function sui_get_locked_characters(receipts) {
  if (!receipts.length) return []

  const characters = await get_cached_objects(
    receipts.map(({ character_id }) => character_id),
    client,
  )

  return characters.map(character => ({
    ...character,
    position: JSON.parse(character.position),
  }))
}

export async function sui_get_unlocked_characters() {
  const owner = get_address()
  if (!owner) return []

  const result = await client.getOwnedObjects({
    owner,
    filter: {
      StructType: `${package_original}::character::Character`,
    },
    options: {
      showContent: true,
    },
  })

  const mapped = result.data
    .map(
      ({
        data: {
          // @ts-ignore
          content: { fields },
        },
      }) => ({
        ...fields,
        id: fields.id.id,
      }),
    )
    .map(character => ({
      ...character,
      position: JSON.parse(character.position),
    }))

  return mapped
}

export async function sui_get_character(id) {
  return get_cached_object(id, client)
}

export async function sui_get_inventory() {}

export async function sui_subscribe({ signal }) {
  const emitter = new EventEmitter()

  logger.SUI('subscribing to events')

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

    active_subscription.unsubscribe = await client.subscribeEvent({
      onMessage: event => {
        logger.SUI('rpc event', event)
        emitter.emit('update', event)
      },
      filter: {
        All: [
          { Package: package_original },
          { MoveEventField: { path: '/for', value: get_address() } },
        ],
      },
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
  } = await mainnet_client.resolveNameServiceNames({ address, limit: 1 })

  if (name) {
    SUINS_CACHE.set(address, name)
    return name
  }
}

export async function sui_sign_payload(message) {
  const address = get_address()
  const { bytes, signature } = await get_wallet().signPersonalMessage(
    message,
    address,
  )

  context.send_packet('packet/signatureResponse', { bytes, signature })
}
