import {
  getFullnodeUrl,
  SuiClient,
  SuiHTTPTransport,
} from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import BN from 'bignumber.js';
import { MIST_PER_SUI } from '@mysten/sui.js/utils';
import { LRUCache } from 'lru-cache';
import { inject } from 'vue';

import {
  VITE_ARESRPG_PACKAGE_DEVNET_ORIGINAL,
  VITE_ARESRPG_PACKAGE_DEVNET_UPGRADED,
  VITE_ARESRPG_PACKAGE_MAINNET,
  VITE_ARESRPG_PACKAGE_TESTNET,
} from '../../env.js';

const PACKAGES = {
  'sui:testnet': {
    original: VITE_ARESRPG_PACKAGE_TESTNET,
    upgraded: VITE_ARESRPG_PACKAGE_TESTNET,
  },
  'sui:mainnet': {
    original: VITE_ARESRPG_PACKAGE_MAINNET,
    upgraded: VITE_ARESRPG_PACKAGE_MAINNET,
  },
  'sui:devnet': {
    original: VITE_ARESRPG_PACKAGE_DEVNET_ORIGINAL,
    upgraded: VITE_ARESRPG_PACKAGE_DEVNET_UPGRADED,
  },
};

const SuiNS_CACHE = new LRUCache({ max: 50 });

const get_client = network =>
  new SuiClient({ url: `https://fullnode.${network}.sui.io:443` });

// client used to resolve SuiNS aliases
const mainnet_client = get_client('mainnet');

// client of which network is determined by user
let client = get_client('mainet');

let last_used_network = 'sui:mainnet';
let package_original = VITE_ARESRPG_PACKAGE_MAINNET;
let package_upgraded = VITE_ARESRPG_PACKAGE_MAINNET;

export const set_network = network => {
  if (last_used_network === network) return;
  last_used_network = network;
  console.log('switch network to', network);
  client = get_client(network.split(':')[1]);
  const { original, upgraded } = PACKAGES[network];
  package_original = original;
  package_upgraded = upgraded;
};

export function use_client() {
  const wallet = inject('selected_wallet');
  const account = inject('selected_account');

  const execute = transactionBlock =>
    wallet.value.signAndExecuteTransactionBlock({
      transactionBlock,
      account: account.value,
      chain: wallet.value.chain,
    });

  const calls = {
    async get_sui_balance() {
      const { totalBalance } = await client.getBalance({
        owner: account.value.address,
      });
      return BN(totalBalance).dividedBy(MIST_PER_SUI.toString());
    },

    async request_storage() {
      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${package_upgraded}::storage::create`,
      });

      await execute(tx);
    },

    async create_profile(name, storage_id) {
      const tx = new TransactionBlock();

      const [profile] = tx.moveCall({
        target: `${package_upgraded}::user::create_user_profile`,
        arguments: [tx.pure(name)],
      });

      tx.transferObjects([profile], account.value.address);

      await execute(tx);
    },

    async delete_profile(id) {
      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${package_upgraded}::user::delete_user_profile`,
        arguments: [tx.object(id)],
      });

      await execute(tx);
    },

    async lock_user_profile({ storage_id, storage_cap_id, profile_id }) {
      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${package_upgraded}::storage::store`,
        arguments: [
          tx.object(storage_cap_id),
          tx.object(storage_id),
          tx.pure(profile_id),
          tx.object(profile_id),
        ],
        typeArguments: [`${package_original}::user::UserProfile`],
      });

      await execute(tx);
    },

    async unlock_user_profile({ storage_id, storage_cap_id, profile_id }) {
      const tx = new TransactionBlock();
      const [profile] = tx.moveCall({
        target: `${package_upgraded}::storage::remove`,
        arguments: [
          tx.object(storage_cap_id),
          tx.object(storage_id),
          tx.pure(profile_id),
        ],
        typeArguments: [`${package_original}::user::UserProfile`],
      });
      tx.transferObjects([profile], tx.pure(account.value.address));

      await execute(tx);
    },

    async send_object(id, to) {
      const is_alias = to.endsWith('.sui');
      const address = is_alias
        ? await mainnet_client.resolveNameServiceAddress({ name: to })
        : to;

      const tx = new TransactionBlock();
      tx.transferObjects([tx.object(id)], tx.pure(address));

      await execute(tx);
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
      });

      const [storage = { storage_cap_id: null }] = result.data.map(
        ({
          data: {
            content: {
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
      );

      return storage;
    },

    async get_locked_profiles(storage_cap_id) {
      const result = await client.getObject({
        id: storage_cap_id,
        options: { showContent: true },
      });

      if (!result) throw new Error('No storage found');

      const {
        data: {
          content: {
            fields: {
              stored: {
                fields: { contents },
              },
            },
          },
        },
      } = result;

      const profiles = await client.multiGetObjects({
        ids: contents,
        options: { showContent: true },
      });

      return profiles.map(
        ({
          data: {
            content: { fields },
          },
        }) => ({
          ...fields,
          id: fields.id.id,
        }),
      );
    },

    async get_unlocked_user_profiles() {
      const result = await client.getOwnedObjects({
        owner: account.value.address,
        filter: {
          StructType: `${package_original}::user::UserProfile`,
        },
        options: {
          showContent: true,
        },
      });

      return result.data.map(
        ({
          data: {
            content: { fields },
          },
        }) => ({
          ...fields,
          id: fields.id.id,
        }),
      );
    },

    async on_user_update(onMessage) {
      const unsubscribe = await client.subscribeEvent({
        onMessage,
        filter: {
          Package: package_upgraded,
          // Sender: account.value.address,
          // All: [
          //   {
          //     Sender: account.value.address,
          //   },
          //   { MoveEventType: `${package_upgraded}::user::UserUpdate` },
          // ],
        },
      });
      return unsubscribe;
    },
  };

  return calls;
}

export async function get_alias(address) {
  const cached = SuiNS_CACHE.get(address);
  if (cached) return cached;

  const {
    data: [name],
  } = await mainnet_client.resolveNameServiceNames({ address, limit: 1 });

  if (name) {
    SuiNS_CACHE.set(address, name);
    return name;
  }
}
