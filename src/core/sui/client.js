import { coinWithBalance, Transaction } from '@mysten/sui/transactions'
import { BigNumber as BN } from 'bignumber.js'
import {
  fromBase64,
  isValidSuiNSName,
  MIST_PER_SUI,
  normalizeSuiAddress,
  toBase64,
} from '@mysten/sui/utils'
import { LRUCache } from 'lru-cache'
import { KioskTransaction, Network, TRANSFER_POLICY_TYPE } from '@mysten/kiosk'
import { SDK } from '@aresrpg/aresrpg-sdk/sui'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { bcs } from '@mysten/sui/bcs'

import { context } from '../game/game.js'
import logger from '../../logger.js'
import toast from '../../toast.js'
import { NETWORK, VITE_SPONSOR_URL, VITE_SUI_RPC } from '../../env.js'
// @ts-ignore
import { i18n } from '../../i18n.js'

// @ts-ignore
import TwemojiSalt from '~icons/twemoji/salt'
// @ts-ignore
import MapGasStation from '~icons/map/gas-station'
// @ts-ignore
import TwemojiSushi from '~icons/twemoji/sushi'
// @ts-ignore
import GameIconsBrokenBottle from '~icons/game-icons/broken-bottle'
// @ts-ignore
import MaterialSymbolsLightRuleSettings from '~icons/material-symbols-light/rule-settings'

const SUINS_CACHE = new LRUCache({ max: 50 })

const { t } = i18n.global

export const sdk = await SDK({
  rpc_url: VITE_SUI_RPC,
  network: Network[NETWORK.toUpperCase()],
})

sdk.kiosk_client.addRuleResolver({
  rule: `${sdk.PACKAGE_ID}::amount_rule::Rule`,
  packageId: sdk.LATEST_PACKAGE_ID,
  resolveRuleFunction: params => {
    const { transaction, transferRequest, packageId, purchasedItem } = params

    transaction.moveCall({
      target: `${packageId}::amount_rule::prove`,
      arguments: [transferRequest, purchasedItem],
    })
  },
})

const current_server_requests = new Map()
const current_pending_transactions = new Map()

// this function has to be called in game.js to avoid circular dependencies
export function listen_for_requests() {
  context.events.on('packet/requestResponse', ({ id, message }) => {
    if (current_server_requests.has(id)) {
      const resolve = current_server_requests.get(id)
      resolve(JSON.parse(message))
      current_server_requests.delete(id)
    }
  })
  context.events.on('packet/transactionSignRequest', async ({ id, bytes }) => {
    if (!current_pending_transactions.has(id)) return

    try {
      const signature = await sign_transaction(bytes)
      context.send_packet('packet/transactionSignResponse', {
        id,
        signature,
      })
    } catch (error) {
      console.error('Failed to sign transaction:', error)
      current_pending_transactions.get(id).reject(error)
    }
  })
  context.events.on('packet/transactionResult', ({ id, digest }) => {
    if (current_pending_transactions.has(id)) {
      current_pending_transactions.get(id).resolve(digest)
      current_pending_transactions.delete(id)
    }
  })
}

async function create_server_transaction(type, data) {
  const id = crypto.randomUUID()

  const promise = new Promise((resolve, reject) =>
    current_pending_transactions.set(id, { resolve, reject }),
  )
  context.send_packet('packet/transactionCreate', {
    id,
    message: JSON.stringify({ type, payload: data }),
  })
  return promise
}

async function indexer_request(type, payload) {
  const id = crypto.randomUUID()

  let resolve_promise = null
  const promise = new Promise(resolve => (resolve_promise = resolve))
  current_server_requests.set(id, resolve_promise)
  context.send_packet('packet/requestResponse', {
    id,
    message: JSON.stringify({ type, payload }),
  })
  return promise
}

const CHARACTER_NAMES = new LRUCache({ max: 1000 })

export async function sui_get_character_name(id) {
  if (!CHARACTER_NAMES.has(id)) {
    const character = await indexer_request('sui_get_character_name', id)
    CHARACTER_NAMES.set(id, character.name)
  }
  return CHARACTER_NAMES.get(id)
}

export function sui_use_item({ item_id, character_id }) {
  return create_server_transaction('sui_use_item', {
    item_id,
    character_id,
  })
}

/** @return {Promise<Type.SuiCharacter>} */
export async function sui_get_character(id) {
  return indexer_request('sui_get_character', id)
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

function needs_sponsor() {
  const balance = get_bn_sui_balance()
  return balance.isLessThan(0.1)
}

async function get_all_coins({ type, cursor = null, result = [] }) {
  const { data, hasNextPage, nextCursor } = await sdk.sui_client.getCoins({
    owner: get_address(),
    coinType: type,
    cursor,
  })
  result.push(data)
  if (hasNextPage)
    return get_all_coins({
      type,
      result,
      cursor: nextCursor,
    })
  return result.flat(Infinity)
}

async function get_coin_with_balance({ tx, type = '0x2::sui::SUI', balance }) {
  const [first, ...rest] = await get_all_coins({ type })

  if (first) {
    const coin = tx.object(first.coinObjectId)

    if (rest.length)
      tx.mergeCoins(
        coin,
        rest.map(c => tx.object(c.coinObjectId)),
      )

    return tx.splitCoins(coin, [balance])[0]
  }
}

async function execute_sponsored({ transaction, sender, wallet }) {
  const txb_kind_bytes = await transaction.build({
    client: sdk.sui_client,
    onlyTransactionKind: true,
  })

  const { bytes, digest, error } = await fetch(`${VITE_SPONSOR_URL}/sponsor`, {
    method: 'POST',
    body: JSON.stringify({
      address: sender,
      txb: toBase64(txb_kind_bytes),
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(res => res.json())

  if (error === 'FAILURE')
    toast.warn(t('SUI_ENOKI_DOWN'), 'Beeb boop', GameIconsBrokenBottle)

  if (error) throw new Error(error)

  const sponsored = Transaction.from(bytes)

  const { signature } = await wallet.signTransaction({
    transaction: sponsored,
    sender,
  })

  const submit_result = await fetch(`${VITE_SPONSOR_URL}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      digest,
      signature,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(res => res.json())

  if (submit_result.error) throw new Error(submit_result.error)

  return { digest }
}

async function execute_unsponsored({ transaction, sender, wallet }) {
  const { bytes, signature } = await wallet.signTransaction({
    transaction,
    sender,
  })

  return await sdk.sui_client.executeTransactionBlock({
    transactionBlock: bytes,
    signature,
  })
}

export async function sign_transaction(tx_bytes) {
  const sender = get_address()
  if (!sender) {
    toast.error(t('APP_LOGIN_AGAIN'), t('APP_WALLET_NOT_FOUND'))
    throw new Error('WALLET_NOT_FOUND')
  }

  const wallet = get_wallet()

  if (wallet.chain !== `sui:${NETWORK}`) {
    toast.error(
      t('WALLET_PLEASE_SWITCH_NETWORK') + ' ' + NETWORK,
      t('WALLET_CONFIG'),
      MaterialSymbolsLightRuleSettings,
    )
    throw new Error('WRONG_NETWORK')
  }

  const transaction = Transaction.from(tx_bytes)

  const { signature } = await wallet.signTransaction({
    transaction,
    sender,
  })

  return signature
}

/** @param {Transaction} transaction */
export const execute = async (transaction, allow_sponsor = true) => {
  const sender = get_address()
  if (!sender) {
    toast.error(t('APP_LOGIN_AGAIN'), t('APP_WALLET_NOT_FOUND'))
    throw new Error('Wallet not found')
  }

  try {
    const wallet = get_wallet()

    if (wallet.chain !== `sui:${NETWORK}`) {
      toast.error(
        t('WALLET_PLEASE_SWITCH_NETWORK') + ' ' + NETWORK,
        t('WALLET_CONFIG'),
        MaterialSymbolsLightRuleSettings,
      )
      return
    }

    transaction.setSender(sender)

    const is_an_absolute_brokie = needs_sponsor()

    if (is_an_absolute_brokie && !allow_sponsor) {
      throw new Error('Needs sponsor but was not allowed')
    }
    console.log('needs sponsor:', is_an_absolute_brokie)

    const { digest } = is_an_absolute_brokie
      ? await execute_sponsored({ transaction, sender, wallet })
      : await execute_unsponsored({ transaction, sender, wallet })

    await sdk.sui_client.waitForTransaction({ digest })

    return digest
  } catch (error) {
    const { message, code } = error

    console.dir({ execute_error: true, error })

    if (code === 'salt_failure')
      toast.error(t('SUI_ENOKI_SALT'), 'Oh no!', TwemojiSalt)
    else if (message.includes('No valid gas coins'))
      toast.error(t('SUI_NO_GAS'), 'Suuuuuu', MapGasStation)
    else if (message === 'EAlreadyFed')
      toast.warn(t('SUI_PET_ALREADY_FED'), 'Burp!', TwemojiSushi)
    else if (message === 'EInventoryNotEmpty')
      toast.error(t('SUI_INV_NOT_EMPTY'))
    else if (message.includes('Some("assert_latest") }, 1'))
      toast.error(t('APP_OUTDATED'))
    throw error
  }
}

const active_subscription = {
  unsubscribe: null,
  emitter: null,
  interval: null,
}

export async function sui_get_policies_profit() {
  return sdk.get_policies_profit(get_address())
}

export async function sui_get_admin_caps() {
  return indexer_request('sui_get_owned_admin_cap', get_address())
}

const last_mint = new Map()

export async function sui_faucet_mint(ticker) {
  const tx = new Transaction()

  if (last_mint.has(ticker)) {
    const last = last_mint.get(ticker)
    if (Date.now() - last < 5000) {
      toast.warn(t('APP_WAIT_A_MINUTE'))
      return 'WAIT_A_MINUTE'
    }
  }

  last_mint.set(ticker, Date.now())

  const REGISTRY = {
    fud: '0xe4606306dd5128869a5a91a64127c93b66a69d604f4251044e5f225f029efbc8',
    afsui: '0x0f97b302865e71f5801e0cd744fc725b123d3e3d0f9098c9fb831918c4dc1eba',
    hsui: '0x5560cb112985a74e3c9df3f47f2b3dda3aad6d0593522a25f1c88b82eea18fa1',
    kares: '0xcb6cb2767c753f790bb506d3e9f4c10e7166adb22ff067a719817f36bf814583',
  }

  sdk.add_header(tx)

  tx.moveCall({
    target: `0x02a56d35041b2974ec23aff7889d8f7390b53b08e8d8bb91aa55207a0d5dd723::${ticker}::mint`,
    arguments: [tx.object(REGISTRY[ticker]), tx.pure.u64(10n * MIST_PER_SUI)],
  })

  await execute(tx)
}

export async function sui_delete_admin_cap(id) {
  const tx = new Transaction()

  sdk.add_header(tx)
  sdk.admin_delete_admin_cap({ tx, admin_cap: id })

  await execute(tx)
}

export async function sui_get_supported_tokens() {
  return sdk.get_supported_tokens(get_address())
}

export async function sui_delete_recipe({ admin_cap, recipe_id }) {
  const tx = new Transaction()

  sdk.add_header(tx)
  sdk.admin_delete_recipe({ tx, admin_cap, recipe: recipe_id })

  await execute(tx)
}

export async function sui_withdraw_policies_profit() {
  const tx = new Transaction()

  sdk.add_header(tx)
  await sdk.admin_withdraw_profit({ tx, address: get_address() })
  await execute(tx)
}

export async function sui_get_recipes() {
  return indexer_request('sui_get_recipes')
}

export async function sui_get_characters() {
  return indexer_request('sui_get_characters', get_address())
}

export async function sui_get_items() {
  return indexer_request('sui_get_items', get_address())
}

export async function sui_get_my_listings() {
  return indexer_request('sui_get_listed_items', get_address())
}

export async function sui_get_finished_crafts() {
  const address = get_address()
  if (!address) return []

  return indexer_request('sui_get_finished_crafts', address)
}

function find_item_or_token(type) {
  const { sui } = context.get_state()
  const mixed_inventory = [...sui.unlocked_items, ...sui.tokens]
  return mixed_inventory.find(item => item.item_type === type)
}

export async function sui_craft_item(recipe) {
  const tx = new Transaction()

  sdk.add_header(tx)

  const [craft] = sdk.craft_start({ tx, recipe: recipe.id })

  const { get_kiosk_cap_ref, finalize } = await sdk.get_user_kiosks({
    tx,
    address: get_address(),
  })

  await Promise.all(
    recipe.ingredients.map(async ({ item_type, amount }) => {
      const item = find_item_or_token(item_type)

      if (!item) throw new Error(`Item not found, ${item_type}`)

      // @ts-ignore
      if (item.is_token) {
        const [coin] = coinWithBalance({
          type: item_type,
          balance: amount,
        })(tx)

        sdk.craft_use_token_ingredient({
          tx,
          craft,
          coin,
          coin_type: item_type,
        })
      } else {
        const available = get_item_with_amount({
          tx,
          item,
          amount,
          get_kiosk_cap_ref,
        })

        sdk.craft_use_item_ingredient({
          tx,
          craft,
          // @ts-ignore
          kiosk: item.kiosk_id,
          // @ts-ignore
          kiosk_cap: get_kiosk_cap_ref(item.kiosk_id),
          item_id: available,
        })
      }
    }),
  )

  sdk.craft_prove_ingredients_used({ tx, craft })

  finalize()

  await execute(tx)
}

export async function sui_reveal_craft(finished_craft) {
  if (!finished_craft) throw new Error('No craft id')

  const tx = new Transaction()

  sdk.add_header(tx)

  const { kiosk, personal_kiosk_cap } = await sui_get_aresrpg_kiosk()

  if (!kiosk) {
    toast.error(t('SUI_NO_PERSONAL_KIOSK'))
    return
  }

  sdk.craft_item({
    tx,
    recipe: finished_craft.recipe_id,
    finished_craft: finished_craft.id,
    kiosk: kiosk.id,
    kiosk_cap: personal_kiosk_cap,
  })

  tx.setSender(get_address())

  await execute(tx)
}

export async function sui_delete_item(item) {
  const tx = new Transaction()

  sdk.add_header(tx)

  const { finalize, get_kiosk_cap_ref } = await sdk.get_user_kiosks({
    tx,
    address: get_address(),
  })

  sdk.delete_item({
    tx,
    item_id: item.id,
    kiosk_id: item.kiosk_id,
    kiosk_cap: get_kiosk_cap_ref(item.kiosk_id),
  })

  finalize()

  await execute(tx)
}

export async function sui_feed_pet(pet) {
  const tx = new Transaction()

  sdk.add_header(tx)

  const { get_kiosk_cap_ref, finalize } = await sdk.get_user_kiosks({
    address: get_address(),
    tx,
  })

  const kiosk_cap = get_kiosk_cap_ref(pet.kiosk_id)

  switch (pet.item_type) {
    case 'suifren_capy':
    case 'suifren_bullshark':
      {
        const balance = await get_bn_sui_balance()

        if (balance.isLessThan(1)) return

        sdk.feed_suifren({
          tx,
          kiosk_id: pet.kiosk_id,
          kiosk_cap,
          suifren_id: pet.id,
          coin: coinWithBalance({
            balance: BigInt(sui_to_mists(1).toString()),
            useGasCoin: !needs_sponsor(),
          })(tx),
          fren_type: pet.item_type,
        })
      }
      break
    case 'vaporeon':
      {
        const balance = await sdk.sui_client.getBalance({
          coinType: sdk.HSUI.address,
          owner: get_address(),
        })

        if (new BN(balance.totalBalance).isLessThan(5000000000)) return

        const [payment] = coinWithBalance({
          type: sdk.HSUI.address,
          balance: 5000000000,
        })(tx)

        sdk.feed_vaporeon({
          tx,
          kiosk_id: pet.kiosk_id,
          kiosk_cap,
          vaporeon_id: pet.id,
          coin: payment,
        })
      }
      break
    default:
      throw new Error('Unknown pet type')
  }

  finalize()

  return await execute(tx)
}

async function sui_merge_stackable_items({
  tx,
  state,
  additional_items = [],
  get_kiosk_cap_ref,
}) {
  const visited = new Set()

  const items = [...state.sui.unlocked_items, ...additional_items]

  items.forEach(item => {
    const same_type = items
      .filter(({ id }) => !visited.has(id))
      .filter(({ stackable }) => !!stackable)
      .filter(({ item_type }) => item.item_type === item_type)
      .filter(({ id }) => id !== item.id)

    visited.add(item.id)

    same_type.forEach(({ id, kiosk_id }) => {
      visited.add(id)
      sdk.merge_items({
        tx,
        target_item_id: item.id,
        target_kiosk: item.kiosk_id,
        target_kiosk_cap: get_kiosk_cap_ref(item.kiosk_id),
        item_id: id,
        item_kiosk: kiosk_id,
        item_kiosk_cap: get_kiosk_cap_ref(kiosk_id),
      })
    })
  })
}

export async function sui_withdraw_items_from_extension(items) {
  const tx = new Transaction()

  sdk.add_header(tx)

  const by_kiosk = new Map()
  const kiosk_cap_ref = new Map()

  items.forEach(item => {
    if (!by_kiosk.has(item.kiosk_id)) by_kiosk.set(item.kiosk_id, [])
    by_kiosk.get(item.kiosk_id).push(item.id)
  })

  const { get_kiosk_cap_ref, finalize } = await sdk.get_user_kiosks({
    address: get_address(),
    tx,
  })

  by_kiosk.forEach((ids, kiosk_id) => {
    sdk.withdraw_items({
      tx,
      kiosk_id,
      kiosk_cap: get_kiosk_cap_ref(kiosk_id),
      item_ids: ids,
    })
  })

  const state = context.get_state()

  await sui_merge_stackable_items({
    tx,
    state,
    additional_items: items,
    get_kiosk_cap_ref,
  })

  finalize()

  await execute(tx)
}

export async function sui_equip_items({ character, to_equip, to_unequip }) {
  const tx = new Transaction()

  sdk.add_header(tx)

  const { get_kiosk_cap_ref, finalize } = await sdk.get_user_kiosks({
    tx,
    address: get_address(),
  })

  to_unequip.forEach(({ item, slot }) => {
    sdk.unequip_item({
      tx,
      kiosk: character.kiosk_id,
      kiosk_cap: get_kiosk_cap_ref(character.kiosk_id),
      item_kiosk: item.kiosk_id,
      character_id: character.id,
      slot,
      item_type: item._type,
    })
  })

  to_equip.forEach(({ item, slot }) => {
    sdk.equip_item({
      tx,
      kiosk: character.kiosk_id,
      kiosk_cap: get_kiosk_cap_ref(character.kiosk_id),
      item_kiosk: item.kiosk_id,
      item_kiosk_cap: get_kiosk_cap_ref(item.kiosk_id),
      item_id: item.id,
      character_id: character.id,
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

export function sui_to_mists(amount) {
  return BN(amount).multipliedBy(MIST_PER_SUI.toString())
}

export function pretty_print_mists(amount) {
  const sui = +mists_to_sui(amount)
  return sui.toFixed(3).replace(/\.0+$/, '')
}

export async function sui_get_sui_balance() {
  return sdk.get_sui_balance(get_address())
}

function get_bn_sui_balance() {
  const mists = context.get_state().sui.balance
  return new BN(mists.toString()).dividedBy(MIST_PER_SUI.toString())
}

const known_kiosk_caps = new Map()

export async function sui_enforce_personal_kiosk(tx) {
  // this call is fine as it is cached
  const { kiosk } = await sui_get_aresrpg_kiosk()

  if (!kiosk) return sdk.create_personal_kiosk({ tx })

  if (!known_kiosk_caps.has(kiosk.id)) {
    known_kiosk_caps.set(
      kiosk.id,
      await sdk.kiosk_client
        .getOwnedKiosks({ address: get_address() })
        .then(k => k.kioskOwnerCaps.find(k => k.kioskId === kiosk.id)),
    )
  }

  const kiosk_tx = new KioskTransaction({
    kioskClient: sdk.kiosk_client,
    transaction: tx,
    cap: known_kiosk_caps.get(kiosk.id),
  })

  return {
    kiosk_cap: kiosk_tx.kioskCap,
    kiosk_id: kiosk.id,
    kiosk_tx,
  }
}

// Convert a number to a hex color code
function number_to_color(num) {
  return (
    '#' +
    Math.max(0, Math.min(16777215, Math.floor(num)))
      .toString(16)
      .padStart(6, '0')
  )
}

// Convert a hex color code to a number
function color_to_number(hex) {
  return parseInt(hex.replace(/^#/, ''), 16)
}

export async function sui_create_character({
  name,
  type,
  male = true,
  color_1,
  color_2,
  color_3,
}) {
  const tx = new Transaction()

  sdk.add_header(tx)

  const { kiosk_cap, kiosk_id, kiosk_tx } = await sui_enforce_personal_kiosk(tx)

  const character_id = sdk.create_character({
    tx,
    name,
    classe: type,
    male,
    kiosk_id,
    kiosk_cap,
    color_1: color_to_number(color_1),
    color_2: color_to_number(color_2),
    color_3: color_to_number(color_3),
  })

  sdk.select_character({
    character_id,
    kiosk_id,
    kiosk_cap,
    tx,
  })

  kiosk_tx.finalize()

  return await execute(tx)
}

export async function sui_is_character_name_taken(name) {
  return indexer_request('sui_is_character_name_taken', name)
}

// character must be locked in the extension as it's the only way to access the object bypassing the lock
export async function sui_delete_character({
  kiosk_id,
  personal_kiosk_cap_id,
  id,
}) {
  const tx = new Transaction()

  sdk.add_header(tx)
  sdk.borrow_personal_kiosk_cap({
    personal_kiosk_cap_id,
    tx,
    handler: kiosk_cap => {
      sdk.delete_character({
        tx,
        kiosk_id,
        kiosk_cap,
        character_id: id,
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
  const tx = new Transaction()

  sdk.add_header(tx)
  sdk.borrow_personal_kiosk_cap({
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
  const tx = new Transaction()

  sdk.add_header(tx)
  sdk.borrow_personal_kiosk_cap({
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

function merge_all_items({ tx, item, get_kiosk_cap_ref, items }) {
  items
    .filter(({ stackable }) => !!stackable)
    .forEach(({ id, item_type, kiosk_id }) => {
      if (item.id !== id && item.item_type === item_type)
        sdk.merge_items({
          tx,
          target_kiosk: item.kiosk_id,
          target_item_id: item.id,
          target_kiosk_cap: get_kiosk_cap_ref(item.kiosk_id),
          item_id: id,
          item_kiosk: kiosk_id,
          item_kiosk_cap: get_kiosk_cap_ref(kiosk_id),
        })
    })
}

function get_item_with_amount({ tx, item, amount, get_kiosk_cap_ref }) {
  if (!item.is_aresrpg_item || !item.stackable) return tx.pure.id(item.id)

  const {
    sui: { unlocked_items },
  } = context.get_state()

  const total_amount =
    item.amount +
    unlocked_items.reduce((acc, { id, item_type, amount }) => {
      if (item.id !== id && item.item_type === item_type) return acc + amount
      return acc
    }, 0)

  if (total_amount < +amount) throw new Error('Not enough items')

  merge_all_items({ tx, item, get_kiosk_cap_ref, items: unlocked_items })

  if (total_amount === +amount) return tx.pure.id(item.id)

  return sdk.split_item({
    tx,
    kiosk: item.kiosk_id,
    kiosk_cap: get_kiosk_cap_ref(item.kiosk_id),
    item_id: item.id,
    amount,
  })
}

export async function sui_list_item({ item, price, amount }) {
  const tx = new Transaction()

  sdk.add_header(tx)

  const { get_kiosk_cap_ref, finalize } = await sdk.get_user_kiosks({
    address: get_address(),
    tx,
  })

  const item_id = get_item_with_amount({ tx, item, amount, get_kiosk_cap_ref })

  sdk.list_item({
    tx,
    kiosk: item.kiosk_id,
    kiosk_cap: get_kiosk_cap_ref(item.kiosk_id),
    item_id,
    item_type: item._type,
    price: BigInt(
      new BN(price).multipliedBy(MIST_PER_SUI.toString()).toString(),
    ),
  })

  finalize()

  await execute(tx)
}

export async function sui_delist_item(item) {
  const tx = new Transaction()

  sdk.add_header(tx)

  const { get_kiosk_cap_ref, finalize } = await sdk.get_user_kiosks({
    address: get_address(),
    tx,
  })

  const kiosk_cap_ref = new Map()

  sdk.delist_item({
    tx,
    kiosk: item.kiosk_id,
    kiosk_cap: get_kiosk_cap_ref(item.kiosk_id),
    item_id: item.id,
    item_type: item._type,
  })

  merge_all_items({
    tx,
    item,
    items: context.get_state().sui.unlocked_items,
    get_kiosk_cap_ref,
  })

  finalize()

  await execute(tx)
}

export function get_normalize_rule(rule) {
  const normalized_rule = rule.split('::')
  normalized_rule[0] = normalizeSuiAddress(normalized_rule[0])
  return normalized_rule.join('::')
}

export async function sui_get_kiosks_profits() {
  const { kioskIds } = await sdk.kiosk_client.getOwnedKiosks({
    address: get_address(),
  })

  const kiosks = await Promise.all(
    kioskIds.map(async id =>
      sdk.kiosk_client.getKiosk({
        id,
        options: { withKioskFields: true },
      }),
    ),
  )

  return kiosks
    .map(kiosk => BigInt(kiosk.kiosk.profits))
    .reduce((acc, profits) => acc + profits, 0n)
}

const known_kiosks = new Map()

export async function sui_get_aresrpg_kiosk() {
  if (!known_kiosks.has(get_address())) {
    known_kiosks.set(
      get_address(),
      await indexer_request('sui_get_aresrpg_kiosk', get_address()),
    )
  }
  return known_kiosks.get(get_address())
}

export async function sui_claim_kiosks_profits() {
  const amount = bcs.option(bcs.u64()).serialize(null)
  const address = get_address()
  const tx = new Transaction()

  const { kiosks, finalize } = await sdk.get_user_kiosks({
    tx,
    address,
  })

  kiosks.forEach((kiosk_cap, kiosk_id) => {
    const kioskcap =
      typeof kiosk_cap === 'object' ? kiosk_cap : tx.object(kiosk_cap)
    const [coin] = tx.moveCall({
      target: `0x2::kiosk::withdraw`,
      arguments: [tx.object(kiosk_id), kioskcap, amount],
    })
    tx.transferObjects([coin], address)
  })

  finalize()

  await execute(tx)
}

export async function sui_send({ amount, recipient }) {
  const tx = new Transaction()

  sdk.add_header(tx)

  const address = isValidSuiNSName(recipient)
    ? await suins_client.resolveNameServiceAddress({ name: recipient })
    : recipient

  logger.SUI('send', { amount, recipient })

  tx.transferObjects([coinWithBalance({ balance: amount })], address)

  return execute(tx)
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const TransferPolicyType = bcs.struct(TRANSFER_POLICY_TYPE, {
  id: bcs.Address,
  balance: bcs.u64(),
  rules: bcs.vector(bcs.string()),
})

/** @param {Type.SuiItem} item */
export async function sui_buy_item(item) {
  const tx = new Transaction()

  if (needs_sponsor()) {
    toast.warn(t('APP_MARKET_INSUFFICIENT_FUNDS'))
    return
  }

  sdk.add_header(tx)

  const { kiosk_tx, kiosk_cap, kiosk_id } = await sui_enforce_personal_kiosk(tx)

  const seller_kiosk = tx.object(item.kiosk_id)
  const policy_id = sdk.TRANSFER_POLICIES[item._type]

  const raw_policy = await sdk.sui_client.getObject({
    id: policy_id,
    options: { showBcs: true },
  })

  if (!raw_policy) {
    toast.error(`No transfer policy found for the type ${item._type}`)
    return
  }

  const parsed_policy = TransferPolicyType.parse(
    // @ts-ignore
    fromBase64(raw_policy.data.bcs.bcsBytes),
  )

  const policy = {
    rules: parsed_policy.rules,
    balance: parsed_policy.balance,
  }

  const [item_input, transfer_promise] = tx.moveCall({
    target: `0x2::kiosk::purchase`,
    typeArguments: [item._type],
    arguments: [
      seller_kiosk,
      tx.pure.id(item.id),
      coinWithBalance({
        balance: BigInt(item.list_price),
        useGasCoin: true,
      }),
    ],
  })

  let should_be_locked = false

  for (const rule of policy.rules) {
    const rule_definition = sdk.kiosk_client.rules.find(
      x => get_normalize_rule(x.rule) === get_normalize_rule(rule),
    )
    if (!rule_definition)
      throw new Error(`No resolver for the following rule: ${rule}.`)

    if (rule_definition.hasLockingRule) should_be_locked = true

    await rule_definition.resolveRuleFunction({
      packageId: rule_definition.packageId,
      transaction: tx,
      itemType: item._type,
      itemId: item.id,
      price: item.list_price.toString(),
      sellerKiosk: seller_kiosk,
      policyId: policy_id,
      transferRequest: transfer_promise,
      purchasedItem: item_input,
      kiosk: typeof kiosk_id === 'string' ? tx.object(kiosk_id) : kiosk_id,
      kioskCap:
        typeof kiosk_cap === 'string' ? tx.object(kiosk_cap) : kiosk_cap,
      extraArgs: {},
      transactionBlock: tx,
    })
  }

  tx.moveCall({
    target: `0x2::transfer_policy::confirm_request`,
    typeArguments: [item._type],
    arguments: [tx.object(policy_id), transfer_promise],
  })

  if (!should_be_locked)
    tx.moveCall({
      target: `0x2::kiosk::place`,
      typeArguments: [item._type],
      arguments: [
        typeof kiosk_id === 'string' ? tx.object(kiosk_id) : kiosk_id,
        typeof kiosk_cap === 'string' ? tx.object(kiosk_cap) : kiosk_cap,
        item_input,
      ],
    })

  kiosk_tx.finalize()

  return await execute(tx)
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
//   const tx = new Transaction()
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
    format: 'at',
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
  const { bytes, signature, zk, ...rest } =
    await get_wallet().signPersonalMessage(message, address)

  context.send_packet('packet/signatureResponse', {
    bytes,
    signature,
    zk: !!zk,
  })
}

// const floor_price_rule_package_id = sdk.kiosk_client.getRulePackageId(
//   'floorPriceRulePackageId',
// )
// const lock_rule_package_id = sdk.kiosk_client.getRulePackageId(
//   'kioskLockRulePackageId',
// )
// const personal_rule_package_id = sdk.kiosk_client.getRulePackageId(
//   'kioskLockRulePackageId',
// )

// const price_floor_rule_id = `${floor_price_rule_package_id}::floor_price_rule::Rule`
// const lock_rule_id = `${lock_rule_package_id}::kiosk_lock_rule::Rule`
// const personal_kiosk_rule_id = `${personal_rule_package_id}::personal_kiosk_rule::Rule`

function replace_rule(rule, new_rule) {
  const rule_package_id = sdk.kiosk_client.getRulePackageId(rule)
  const rule_index = sdk.kiosk_client.rules.findIndex(
    ({ rule }) => rule === `${rule_package_id}${new_rule.rule}`,
  )

  if (rule_index === -1) throw new Error(`Rule ${rule} not found`)
  sdk.kiosk_client.rules[rule_index] = {
    ...new_rule,
    rule: `${rule_package_id}${new_rule.rule}`,
    packageId: rule_package_id,
  }
}

replace_rule('royaltyRulePackageId', {
  rule: '::royalty_rule::Rule',
  resolveRuleFunction(params) {
    const {
      transaction: txb,
      itemType,
      price,
      packageId,
      transferRequest,
      policyId,
    } = params

    const policy_obj = txb.object(policyId)

    // calculates the amount
    const [amount] = txb.moveCall({
      target: `${packageId}::royalty_rule::fee_amount`,
      typeArguments: [itemType],
      arguments: [policy_obj, txb.pure.u64(price || '0')],
    })

    // pays the policy
    txb.moveCall({
      target: `${packageId}::royalty_rule::pay`,
      typeArguments: [itemType],
      arguments: [
        policy_obj,
        transferRequest,
        txb.splitCoins(txb.gas, [amount])[0],
      ],
    })
  },
})

export async function sui_add_stats({ character_id, stats }) {
  return create_server_transaction('sui_add_stats', {
    character_id,
    stats,
  })
}
