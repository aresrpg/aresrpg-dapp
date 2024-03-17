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
  VITE_ARESRPG_PACKAGE_MAINNET_ORIGINAL,
  VITE_ARESRPG_PACKAGE_MAINNET_UPGRADED,
  VITE_ARESRPG_PACKAGE_TESTNET_ORIGINAL,
  VITE_ARESRPG_PACKAGE_TESTNET_UPGRADED,
  VITE_USE_ANKR,
} from '../../env.js'

const PACKAGES = {
  'sui:testnet': {
    original: VITE_ARESRPG_PACKAGE_TESTNET_ORIGINAL,
    upgraded: VITE_ARESRPG_PACKAGE_TESTNET_UPGRADED,
  },
  'sui:mainnet': {
    original: VITE_ARESRPG_PACKAGE_MAINNET_ORIGINAL,
    upgraded: VITE_ARESRPG_PACKAGE_MAINNET_UPGRADED,
  },
}

const SuiNS_CACHE = new LRUCache({ max: 50 })
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

export const set_network = network => {
  if (network === 'sui:mainnet' || network === 'sui:testnet') {
    if (last_used_network === network) return
    last_used_network = network

    console.log('switch network to', network)

    client = get_client(network.split(':')[1])
    const { original, upgraded } = PACKAGES[network]
    package_original = original
    package_upgraded = upgraded
  }
}

export function use_client(
  wallet = inject('selected_wallet'),
  account = inject('selected_account'),
) {
  const execute = transactionBlock =>
    wallet.value.signAndExecuteTransactionBlock({
      transactionBlock,
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
    async create_character(name, storage_id) {
      const tx = new TransactionBlock()

      const [character] = tx.moveCall({
        target: `${package_upgraded}::user::create_user_character`,
        arguments: [tx.pure(name)],
      })

      tx.transferObjects([character], account.value.address)

      await execute(tx)
    },

    async delete_character(id) {
      const tx = new TransactionBlock()

      tx.moveCall({
        target: `${package_upgraded}::user::delete_user_character`,
        arguments: [tx.object(id)],
      })

      await execute(tx)
    },

    async lock_user_character({ storage_id, storage_cap_id, character_id }) {
      const tx = new TransactionBlock()

      tx.moveCall({
        target: `${package_upgraded}::storage::store`,
        arguments: [
          tx.object(storage_cap_id),
          tx.object(storage_id),
          tx.pure(character_id),
          tx.object(character_id),
        ],
        typeArguments: [`${package_original}::user::Usercharacter`],
      })

      await execute(tx)
    },

    async unlock_user_character({ storage_id, storage_cap_id, character_id }) {
      const tx = new TransactionBlock()
      const [character] = tx.moveCall({
        target: `${package_upgraded}::storage::remove`,
        arguments: [
          tx.object(storage_cap_id),
          tx.object(storage_id),
          tx.pure(character_id),
        ],
        typeArguments: [`${package_original}::user::Usercharacter`],
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

    async get_storage_id() {
      const result = await client.getOwnedObjects({
        owner: account.value.address,
        filter: {
          StructType: `${package_original}::storage::StorageCap`,
        },
        options: {
          showContent: true,
        },
      })

      const [storage = { storage_cap_id: null, storage_id: null }] =
        result.data.map(
          ({
            data: {
              content: {
                // @ts-ignore
                fields: {
                  storage_id,
                  id: { id },
                },
              },
            },
          }) => ({
            storage_id,
            storage_cap_id: id,
          }),
        )

      return storage
    },

    async get_locked_characters(storage_cap_id) {
      const result = await client.getObject({
        id: storage_cap_id,
        options: { showContent: true },
      })

      if (!result) throw new Error('No storage found')

      const {
        data: {
          content: {
            // @ts-ignore
            fields: {
              stored: {
                fields: { contents },
              },
            },
          },
        },
      } = result

      const characters = await client.multiGetObjects({
        ids: contents,
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
          StructType: `${package_original}::user::Usercharacter`,
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
  const cached = SuiNS_CACHE.get(address)
  if (cached) return cached

  const {
    data: [name],
  } = await mainnet_client.resolveNameServiceNames({ address, limit: 1 })

  if (name) {
    SuiNS_CACHE.set(address, name)
    return name
  }
}
