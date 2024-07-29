import EventEmitter from 'events'

import { Transaction } from '@mysten/sui/transactions'
import { BigNumber as BN } from 'bignumber.js'
import { MIST_PER_SUI, normalizeSuiAddress, toB64 } from '@mysten/sui/utils'
import { LRUCache } from 'lru-cache'
import { Network } from '@mysten/kiosk'
import { SDK } from '@aresrpg/aresrpg-sdk/sui'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { bcs } from '@mysten/sui/bcs'

import { context } from '../game/game.js'
import logger from '../../logger.js'
import toast from '../../toast.js'
import {
  NETWORK,
  VITE_SPONSOR_URL,
  VITE_SUI_RPC,
  VITE_SUI_WSS,
} from '../../env.js'
// @ts-ignore
import { i18n } from '../../i18n.js'

// @ts-ignore
import TwemojiSalt from '~icons/twemoji/salt'
// @ts-ignore
import MapGasStation from '~icons/map/gas-station'
// @ts-ignore
import TokenSui from '~icons/token/sui'
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
  wss_url: VITE_SUI_WSS,
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

const CHARACTER_NAMES = new LRUCache({ max: 1000 })

export async function sui_get_character_name(id) {
  if (!CHARACTER_NAMES.has(id)) {
    const character = await sdk.get_character_by_id(id)
    CHARACTER_NAMES.set(id, character.name)
  }
  return CHARACTER_NAMES.get(id)
}

/** @return {Promise<Type.SuiCharacter>} */
export async function sui_get_character(id) {
  return sdk.get_character_by_id(id)
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

async function needs_sponsor() {
  const balance = await get_bn_sui_balance()
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

async function get_base_sui_coin(tx) {
  const brokie = await needs_sponsor()

  if (!brokie) return tx.gas

  const [first, ...rest] = await get_all_coins({ type: '0x2::sui::SUI' })

  if (first) {
    const coin = tx.object(first.coinObjectId)

    if (rest.length)
      tx.mergeCoins(
        coin,
        rest.map(c => tx.object(c.coinObjectId)),
      )

    return coin
  }
}

async function get_coin_with_balance({ tx, type, balance }) {
  const [first, ...rest] = await get_all_coins({ type })

  if (first) {
    const coin = tx.object(first.coinObjectId)

    if (rest.length)
      tx.mergeCoins(
        coin,
        rest.map(c => tx.object(c.coinObjectId)),
      )

    return tx.splitCoins(coin, [tx.pure.u64(balance)])
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
      txb: toB64(txb_kind_bytes),
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

/** @param {Transaction} transaction */
export const execute = async transaction => {
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

    const is_an_absolute_brokie = await needs_sponsor()

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
  return sdk.get_owned_admin_cap(get_address())
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

export async function sui_get_locked_characters() {
  return sdk.get_locked_characters(get_address())
}

export async function sui_get_unlocked_characters() {
  return sdk.get_unlocked_characters(get_address())
}

export async function sui_get_kiosk_cap(kiosk_id) {
  return sdk.get_kiosk_owner_cap({ address: get_address(), kiosk_id })
}

export async function sui_get_locked_items() {
  return sdk.get_locked_items(get_address())
}

export async function sui_get_unlocked_items() {
  return sdk.get_unlocked_items(get_address())
}

export async function sui_get_my_listings() {
  return sdk.get_unlocked_items(get_address(), true)
}

export async function sui_get_item(id) {
  return sdk.get_item_by_id(id)
}

export async function sui_get_finished_crafts() {
  const address = get_address()
  if (!address) return []

  return sdk.get_finished_crafts(address)
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

  const { kiosks, finalize } = await sdk.get_user_kiosks({
    tx,
    address: get_address(),
  })

  await Promise.all(
    recipe.ingredients.map(async ({ item_type, amount }) => {
      const item = find_item_or_token(item_type)

      if (!item) throw new Error(`Item not found, ${item_type}`)

      // @ts-ignore
      if (item.is_token) {
        const [coin] = await get_coin_with_balance({
          tx,
          type: item_type,
          balance: amount,
        })

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
          kiosks,
        })

        sdk.craft_use_item_ingredient({
          tx,
          craft,
          // @ts-ignore
          kiosk: item.kiosk_id,
          // @ts-ignore
          kiosk_cap: kiosks.get(item.kiosk_id),
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

  const { kioskOwnerCaps } = await sdk.kiosk_client.getOwnedKiosks({
    address: get_address(),
  })

  const first_personal_kiosk = kioskOwnerCaps.find(
    ({ isPersonal }) => !!isPersonal,
  )

  if (!first_personal_kiosk) {
    toast.error(t('SUI_NO_PERSONAL_KIOSK'))
    return
  }

  sdk.craft_item({
    tx,
    recipe: finished_craft.recipe_id,
    finished_craft: finished_craft.id,
    kiosk: first_personal_kiosk.kioskId,
    kiosk_cap: first_personal_kiosk.objectId,
  })

  tx.setSender(get_address())

  await execute(tx)
}

export async function sui_delete_item(item) {
  const tx = new Transaction()

  sdk.add_header(tx)

  const { finalize, kiosks } = await sdk.get_user_kiosks({
    tx,
    address: get_address(),
  })

  sdk.delete_item({
    tx,
    item_id: item.id,
    kiosk_id: item.kiosk_id,
    kiosk_cap: kiosks.get(item.kiosk_id),
  })

  finalize()

  await execute(tx)
}

export async function sui_feed_pet(pet) {
  const tx = new Transaction()

  sdk.add_header(tx)

  const { kiosks, finalize } = await sdk.get_user_kiosks({
    address: get_address(),
    tx,
  })

  const kiosk_cap = kiosks.get(pet.kiosk_id)

  switch (pet.item_type) {
    case 'suifren_capy':
    case 'suifren_bullshark':
      {
        const balance = await get_bn_sui_balance()

        if (balance.isLessThan(1)) return

        const coin = await get_base_sui_coin(tx)

        const [payment] = tx.splitCoins(coin, [
          tx.pure.u64(sui_to_mists(1).toString()),
        ])

        sdk.feed_suifren({
          tx,
          kiosk_id: pet.kiosk_id,
          kiosk_cap,
          suifren_id: pet.id,
          coin: payment,
          fren_type: pet.item_type,
        })
      }
      break
    case 'vaporeon':
      {
        const balance = await sdk.sui_client.getBalance({
          coinType: sdk.HSUI,
          owner: get_address(),
        })

        if (new BN(balance.totalBalance).isLessThan(5000000000)) return

        const [payment] = await get_coin_with_balance({
          tx,
          type: sdk.HSUI,
          balance: 5000000000,
        })

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
  kiosks,
  additional_items = [],
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
        target_kiosk_cap: kiosks.get(item.kiosk_id),
        item_id: id,
        item_kiosk: kiosk_id,
        item_kiosk_cap: kiosks.get(kiosk_id),
      })
    })
  })
}

export async function sui_withdraw_items_from_extension(items) {
  const tx = new Transaction()

  sdk.add_header(tx)

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

  const state = context.get_state()

  await sui_merge_stackable_items({
    tx,
    state,
    kiosks,
    additional_items: items,
  })

  finalize()

  await execute(tx)
}

export async function sui_equip_items({ character, to_equip, to_unequip }) {
  const tx = new Transaction()

  sdk.add_header(tx)

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

async function get_bn_sui_balance() {
  const mists = await sui_get_sui_balance()
  return new BN(mists.toString()).dividedBy(MIST_PER_SUI.toString())
}

export async function sui_create_character({ name, type, sex = 'male' }) {
  const tx = new Transaction()

  sdk.add_header(tx)

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

  return await execute(tx)
}

export async function sui_is_character_name_taken(name) {
  try {
    return sdk.is_character_name_taken({
      address: get_address(),
      name,
    })
  } catch (error) {
    if (error.message === 'NO_GAS')
      toast.error(t('SUI_NO_GAS'), 'Suuuuuu', MapGasStation)
    else toast.error(error.message, 'Transaction failed')
  }
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

function merge_all_items({ tx, item, kiosks, items }) {
  items
    .filter(({ stackable }) => !!stackable)
    .forEach(({ id, item_type, kiosk_id }) => {
      if (item.id !== id && item.item_type === item_type)
        sdk.merge_items({
          tx,
          target_kiosk: item.kiosk_id,
          target_item_id: item.id,
          target_kiosk_cap: kiosks.get(item.kiosk_id),
          item_id: id,
          item_kiosk: kiosk_id,
          item_kiosk_cap: kiosks.get(kiosk_id),
        })
    })
}

function get_item_with_amount({ tx, item, amount, kiosks }) {
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

  merge_all_items({ tx, item, kiosks, items: unlocked_items })

  if (total_amount === +amount) return tx.pure.id(item.id)

  return sdk.split_item({
    tx,
    kiosk: item.kiosk_id,
    kiosk_cap: kiosks.get(item.kiosk_id),
    item_id: item.id,
    amount,
  })
}

export async function sui_list_item({ item, price, amount }) {
  const tx = new Transaction()

  sdk.add_header(tx)

  const { kiosks, finalize } = await sdk.get_user_kiosks({
    address: get_address(),
    tx,
  })

  const item_id = get_item_with_amount({ tx, item, amount, kiosks })

  sdk.list_item({
    tx,
    kiosk: item.kiosk_id,
    kiosk_cap: kiosks.get(item.kiosk_id),
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

  const { kiosks, finalize } = await sdk.get_user_kiosks({
    address: get_address(),
    tx,
  })

  sdk.delist_item({
    tx,
    kiosk: item.kiosk_id,
    kiosk_cap: kiosks.get(item.kiosk_id),
    item_id: item.id,
    item_type: item._type,
  })

  merge_all_items({
    tx,
    item,
    kiosks,
    items: context.get_state().sui.unlocked_items,
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

export async function sui_get_aresrpg_kiosk() {
  return sdk.get_aresrpg_kiosk(get_address())
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

/** @param {Type.SuiItem} item */
export async function sui_buy_item(item) {
  const tx = new Transaction()

  sdk.add_header(tx)

  const { kiosk_tx, kiosk_cap, kiosk_id } = await sdk.enforce_personal_kiosk({
    tx,
    recipient: get_address(),
  })

  const seller_kiosk = tx.object(item.kiosk_id)

  const [policy] = await sdk.kiosk_client.getTransferPolicies({
    type: item._type,
  })

  if (!policy) {
    toast.error(`No transfer policy found for the type ${item._type}`)
    return
  }

  const available_coin = await get_base_sui_coin(tx)

  const [payment] = tx.splitCoins(available_coin, [
    tx.pure.u64(item.list_price),
  ])

  const [item_input, transfer_promise] = tx.moveCall({
    target: `0x2::kiosk::purchase`,
    typeArguments: [item._type],
    arguments: [tx.object(seller_kiosk), tx.pure.id(item.id), payment],
  })

  let should_be_locked = false

  for (const rule of policy.rules) {
    const rule_definition = sdk.kiosk_client.rules.find(
      x => get_normalize_rule(x.rule) === get_normalize_rule(rule),
    )
    if (!rule_definition)
      throw new Error(`No resolver for the following rule: ${rule}.`)

    if (rule_definition.hasLockingRule) should_be_locked = true

    rule_definition.resolveRuleFunction({
      packageId: rule_definition.packageId,
      transaction: tx,
      transactionBlock: tx,
      itemType: item._type,
      itemId: item.id,
      price: item.list_price.toString(),
      sellerKiosk: item.kiosk_id,
      policyId: policy.id,
      transferRequest: transfer_promise,
      purchasedItem: item_input,
      kiosk: kiosk_id,
      kioskCap: kiosk_cap,
      extraArgs: { available_coin },
    })
  }

  tx.moveCall({
    target: `0x2::transfer_policy::confirm_request`,
    typeArguments: [item._type],
    arguments: [tx.object(policy.id), transfer_promise],
  })

  if (!should_be_locked)
    tx.moveCall({
      target: `0x2::kiosk::place`,
      typeArguments: [item._type],
      arguments: [kiosk_id, kiosk_cap, item_input],
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

  const tx_toast = toast.tx(t('SUI_SUBSCRIBE_START'))

  try {
    await try_reset()
    active_subscription.emitter = emitter
    active_subscription.interval = setInterval(() => {
      emitter.emit('update', { type: 'interval' })
    }, 10000)

    active_subscription.unsubscribe = await sdk.subscribe(event => {
      const { type } = event
      let [, , event_name] = type.split('::')

      if (event_name.startsWith('ItemListed')) event_name = 'ItemListedEvent'

      if (event_name.startsWith('ItemPurchased'))
        event_name = 'ItemPurchasedEvent'

      if (event_name.startsWith('ItemDelisted'))
        event_name = 'ItemDelistedEvent'

      logger.SUI(`rpc event ${event_name}`, event)
      emitter.emit('update', {
        type: event_name,
        payload: {
          ...event.parsedJson,
          sender_is_me: event.sender === get_address(),
        },
      })
    })
    tx_toast.update('success', t('SUI_SUBSCRIBED'))
  } catch (error) {
    if (error.message.includes('Invalid params'))
      console.error(
        'Unable to subscribe to the Sui node as it is too crowded. Please try again later.',
      )
    else console.error('Unable to subscribe to the Sui node', error)
    tx_toast.update('error', t('SUI_SUBSCRIBE_ERROR'))
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
  const { bytes, signature, zk } = await get_wallet().signPersonalMessage(
    message,
    address,
  )

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
      extraArgs: { available_coin },
    } = params

    const policy_obj = txb.object(policyId)

    // calculates the amount
    const [amount] = txb.moveCall({
      target: `${packageId}::royalty_rule::fee_amount`,
      typeArguments: [itemType],
      arguments: [policy_obj, txb.pure.u64(price || '0')],
    })

    // splits the coin.
    const fee_coin = txb.splitCoins(available_coin, [amount])

    // pays the policy
    txb.moveCall({
      target: `${packageId}::royalty_rule::pay`,
      typeArguments: [itemType],
      arguments: [policy_obj, transferRequest, fee_coin],
    })
  },
})
