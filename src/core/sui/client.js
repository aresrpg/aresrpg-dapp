import EventEmitter from 'events'

import {
  getFullnodeUrl,
  SuiClient,
  SuiHTTPTransport,
} from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import BN from 'bignumber.js'
import { MIST_PER_SUI } from '@mysten/sui.js/utils'
import { LRUCache } from 'lru-cache'
import { inject } from 'vue'

import {
  VITE_ARESRPG_NAME_REGISTRY_MAINNET,
  VITE_ARESRPG_NAME_REGISTRY_TESTNET,
  VITE_ARESRPG_PACKAGE_MAINNET_ORIGINAL,
  VITE_ARESRPG_PACKAGE_MAINNET_UPGRADED,
  VITE_ARESRPG_PACKAGE_TESTNET_ORIGINAL,
  VITE_ARESRPG_PACKAGE_TESTNET_UPGRADED,
  VITE_ARESRPG_SERVER_STORAGE_MAINNET,
  VITE_ARESRPG_SERVER_STORAGE_TESTNET,
  VITE_USE_ANKR,
} from '../../env.js'

const PACKAGES = {
  'sui:testnet': {
    original: VITE_ARESRPG_PACKAGE_TESTNET_ORIGINAL,
    upgraded: VITE_ARESRPG_PACKAGE_TESTNET_UPGRADED,
    name_registry: VITE_ARESRPG_NAME_REGISTRY_TESTNET,
    server_storage: VITE_ARESRPG_SERVER_STORAGE_TESTNET,
  },
  'sui:mainnet': {
    original: VITE_ARESRPG_PACKAGE_MAINNET_ORIGINAL,
    upgraded: VITE_ARESRPG_PACKAGE_MAINNET_UPGRADED,
    name_registry: VITE_ARESRPG_NAME_REGISTRY_MAINNET,
    server_storage: VITE_ARESRPG_SERVER_STORAGE_MAINNET,
  },
}

const SUINS_CACHE = new LRUCache({ max: 50 })
// This ANKR premium key is whitelisted to only work with the https://aresrpg.world domain
// so it is fine to publicly expose it here
const ANKR_KEY =
  '02fe1fb555dee5f0f895faf43a27d670f3abeeb11a554b5f0ff07fbd84de9201'

const get_url = (network, ws) => {
  if (VITE_USE_ANKR) {
    const prefix = network === 'mainnet' ? 'sui' : 'sui_testnet'
    const suffix = ws ? '/ws' : ''
    return `https://rpc.ankr.com/${prefix}${suffix}/${ANKR_KEY}`
  }

  return getFullnodeUrl(network)
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

let last_used_network = 'sui:mainnet'
let package_original = VITE_ARESRPG_PACKAGE_MAINNET_ORIGINAL
let package_upgraded = VITE_ARESRPG_PACKAGE_MAINNET_UPGRADED
let name_registry = VITE_ARESRPG_NAME_REGISTRY_MAINNET
let server_storage = VITE_ARESRPG_SERVER_STORAGE_MAINNET

export const set_network = network => {
  if (network === 'sui:mainnet' || network === 'sui:testnet') {
    if (last_used_network === network) return
    last_used_network = network

    console.log('switch network to', network)

    client = get_client(network.split(':')[1])
    const {
      original,
      upgraded,
      name_registry: name_reg,
      server_storage: srv_storage,
    } = PACKAGES[network]
    package_original = original
    package_upgraded = upgraded
    name_registry = name_reg
    server_storage = srv_storage
  }
}

export function use_client(
  wallet = inject('selected_wallet'),
  account = inject('selected_account'),
) {
  const execute = transaction_block =>
    wallet.value.signAndExecuteTransactionBlock({
      transaction_block,
      account: account.value,
      chain: wallet.value.chain,
    })

  const active_subscription = {
    unsubscribe: null,
    emitter: null,
  }

  const calls = {
    async get_sui_balance() {
      const { totalBalance } = await client.getBalance({
        owner: account.value.address,
      })
      return BN(totalBalance).dividedBy(MIST_PER_SUI.toString())
    },

    async request_storage() {
      const tx = new TransactionBlock()

      tx.moveCall({
        target: `${package_upgraded}::storage::create`,
      })

      await execute(tx)
    },

    // @ts-ignore
    async create_character(name) {
      const tx = new TransactionBlock()

      const [character] = tx.moveCall({
        target: `${package_upgraded}::character::create_character`,
        arguments: [tx.pure(name), tx.pure(name_registry)],
      })

      tx.transferObjects([character], account.value.address)

      await execute(tx)
    },

    async delete_character(id) {
      const tx = new TransactionBlock()

      tx.moveCall({
        target: `${package_upgraded}::character::delete_character`,
        arguments: [tx.object(id), tx.object(name_registry)],
      })

      await execute(tx)
    },

    async lock_character(character_id) {
      const tx = new TransactionBlock()

      tx.moveCall({
        target: `${package_upgraded}::server::lock_character`,
        arguments: [tx.object(server_storage), tx.object(character_id)],
      })

      await execute(tx)
    },

    async unlock_character(receipt_id) {
      const tx = new TransactionBlock()
      const [character] = tx.moveCall({
        target: `${package_upgraded}::server::unlock_character`,
        arguments: [tx.object(server_storage), tx.object(receipt_id)],
      })
      tx.transferObjects([character], tx.pure(account.value.address))

      await execute(tx)
    },

    async send_object(id, to) {
      const is_alias = to.endsWith('.sui')
      const address = is_alias
        ? await mainnet_client.resolveNameServiceAddress({ name: to })
        : to

      const tx = new TransactionBlock()
      tx.transferObjects([tx.object(id)], tx.pure(address))

      await execute(tx)
    },

    async get_receipts() {
      const result = await client.getOwnedObjects({
        owner: account.value.address,
        filter: {
          StructType: `${package_original}::server::CharacterLockReceipt`,
        },
        options: {
          showContent: true,
        },
      })

      const receipts = result.data.map(({ data }) => ({
        // @ts-ignore
        character_id: data.content.fields.character_id,
        // @ts-ignore
        id: data.content.fields.id.id,
      }))

      return receipts
    },

    async get_locked_characters() {
      const receipts = await this.get_receipts()

      if (!receipts.length) return []

      const characters = await client.multiGetObjects({
        ids: receipts.map(({ character_id }) => character_id),
        options: { showContent: true },
      })

      return characters.map(
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
    },

    async get_unlocked_user_characters() {
      const result = await client.getOwnedObjects({
        owner: account.value.address,
        filter: {
          StructType: `${package_original}::character::Character`,
        },
        options: {
          showContent: true,
        },
      })

      return result.data.map(
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
    },

    async get_inventory() {},

    async on_update() {
      const emitter = new EventEmitter()

      if (active_subscription.unsubscribe) {
        active_subscription.emitter.removeAllListeners()
        await active_subscription.unsubscribe()
      }

      active_subscription.emitter = emitter
      active_subscription.unsubscribe = await client.subscribeEvent({
        onMessage: event => emitter.emit('update', event),
        filter: {
          All: [
            { Package: package_original },
            { MoveEventField: { path: '/for', value: account.value.address } },
          ],
        },
      })

      return emitter
    },
  }

  return calls
}

export async function get_alias(address) {
  const cached = SUINS_CACHE.get(address)
  if (cached) return cached

  const {
    data: [name],
  } = await mainnet_client.resolveNameServiceNames({ address, limit: 1 })

  if (name) {
    SUINS_CACHE.set(address, name)
    return name
  }
}
