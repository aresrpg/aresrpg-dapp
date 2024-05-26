import EventEmitter from 'events'

import { TransactionBlock } from '@mysten/sui.js/transactions'
import { BigNumber as BN } from 'bignumber.js'
import { MIST_PER_SUI, normalizeSuiAddress, toB64 } from '@mysten/sui.js/utils'
import { LRUCache } from 'lru-cache'
import { Network } from '@mysten/kiosk'
import { SDK } from '@aresrpg/aresrpg-sdk/sui'
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client'
import { bcs } from '@mysten/sui.js/bcs'

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
    SUI_MIN_1: 'You need at least 1 Sui to perform this action',
    WALLET_CONFIG: 'Wallet configuration error',
    SUI_SUBSCRIBE_OK: 'Connected to Sui',
    E_PET_ALREADY_FED: 'This pet is not hungry',
    INV_NOT_EMPTY: 'You must unequip all items before that',
    SUBSCRIBE_ERROR:
      'The Sui node refused the subscription, please refresh the page to try again',
    FAILURE: 'Блять! This transaction failed, please try again',
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
    SUI_MIN_1: "Vous avez besoin d'au moins 1 Sui pour effectuer cette action",
    WALLET_CONFIG: 'Erreur de configuration du portefeuille',
    SUI_SUBSCRIBE_OK: 'Connecté à Sui',
    E_PET_ALREADY_FED: 'Ce famillier n a pas faim',
    INV_NOT_EMPTY: `Vous devez déséquiper tous les objets d'abord`,
    SUBSCRIBE_ERROR: `La node Sui a refusé la connection, veuillez rafraîchir la page pour réessayer`,
    FAILURE: 'Блять! Cette transaction a échoué, veuillez réessayer',
  },
}

export const sdk = await SDK({
  rpc_url: VITE_SUI_RPC,
  wss_url: VITE_SUI_WSS,
  network: Network[NETWORK.toUpperCase()],
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

/** @param {TransactionBlock} transaction_block */
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

    transaction_block.setSender(sender)

    const txb_kind_bytes = await transaction_block.build({
      client: sdk.sui_client,
      onlyTransactionKind: true,
    })

    const { bytes, digest, error } = await fetch(
      `${VITE_SPONSOR_URL}/sponsor`,
      {
        method: 'POST',
        body: JSON.stringify({
          address: sender,
          txb: toB64(txb_kind_bytes),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    ).then(res => res.json())

    if (error) throw new Error(error)

    const sponsored = TransactionBlock.from(bytes)

    const { signature } = await wallet.signTransactionBlock({
      transaction_block: sponsored,
      sender,
    })

    const result = await fetch(`${VITE_SPONSOR_URL}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        digest,
        signature,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    await sdk.sui_client.waitForTransactionBlock({ digest })

    return result
  } catch (error) {
    const { message, code } = error

    console.dir({ execute_error: true, error })

    if (code === 'salt_failure')
      toast.error(t('ENOKI_SALT'), 'Oh no!', TwemojiSalt)
    else if (message.includes('No valid gas coins'))
      toast.error(t('NO_GAS'), 'Suuuuuu', MapGasStation)
    else if (message === 'EAlreadyFed')
      toast.warn(t('E_PET_ALREADY_FED'), 'Burp!', TwemojiSushi)
    else if (message === 'EInventoryNotEmpty') toast.error(t('INV_NOT_EMPTY'))
    else if (message.includes('Some("assert_latest") }, 1'))
      toast.error(t('OUTDATED'))
    else if (message === 'FAILURE') toast.error(t('FAILURE'))
    else toast.error(message, 'Transaction failed')
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

export async function sui_withdraw_policies_profit() {
  const tx = new TransactionBlock()

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

export async function sui_feed_pet(pet) {
  const tx = new TransactionBlock()

  sdk.add_header(tx)

  const balance = BN((await sui_get_sui_balance()).toString()).dividedBy(
    MIST_PER_SUI.toString(),
  )

  if (balance.isLessThan(1)) {
    toast.error(t('SUI_MIN_1'), 'Suuuuuu', MapGasStation)
    return
  }

  const {
    data: [first, ...rest],
  } = await sdk.sui_client.getCoins({
    coinType: '0x2::sui::SUI',
    owner: get_address(),
  })

  if (rest.length)
    tx.mergeCoins(
      tx.object(first.coinObjectId),
      rest.map(c => tx.object(c.coinObjectId)),
    )

  const [payment] = tx.splitCoins(tx.object(first.coinObjectId), [
    tx.pure(sui_to_mists(1).toString()),
  ])

  const { kiosks, finalize } = await sdk.get_user_kiosks({
    address: get_address(),
    tx,
  })

  const kiosk_cap = kiosks.get(pet.kiosk_id)

  sdk.feed_suifren({
    tx,
    kiosk_id: pet.kiosk_id,
    kiosk_cap,
    suifren_id: pet.id,
    coin: payment,
    fren_type: pet.item_type,
  })

  finalize()

  return await execute(tx)
}

export async function sui_withdraw_items_from_extension(items) {
  const tx = new TransactionBlock()

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

  finalize()

  await execute(tx)
}

export async function sui_equip_items({ character, to_equip, to_unequip }) {
  const tx = new TransactionBlock()

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
  return sui.toFixed(3)
}

export async function sui_get_sui_balance() {
  return sdk.get_sui_balance(get_address())
}

export async function sui_create_character({ name, type, sex = 'male' }) {
  const tx = new TransactionBlock()

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

  sdk.add_header(tx)
  sdk.borrow_personal_kiosk_cap({
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
  const tx = new TransactionBlock()

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

export async function sui_list_item({ item, price, amount }) {
  const tx = new TransactionBlock()

  sdk.add_header(tx)

  const { kiosks, finalize } = await sdk.get_user_kiosks({
    address: get_address(),
    tx,
  })

  sdk.list_item({
    tx,
    kiosk: item.kiosk_id,
    kiosk_cap: kiosks.get(item.kiosk_id),
    item_id: item.id,
    item_type: item._type,
    price: BigInt(
      new BN(price).multipliedBy(MIST_PER_SUI.toString()).toString(),
    ),
  })

  finalize()

  await execute(tx)
}

export async function sui_delist_item(item) {
  const tx = new TransactionBlock()

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

export async function sui_claim_kiosks_profits() {
  const amount = bcs.option(bcs.u64()).serialize(null)
  const address = get_address()
  const tx = new TransactionBlock()

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
  const tx = new TransactionBlock()

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

  const {
    data: [first, ...rest],
  } = await sdk.sui_client.getCoins({
    coinType: '0x2::sui::SUI',
    owner: get_address(),
  })

  const available_coin = tx.object(first.coinObjectId)

  if (rest.length)
    tx.mergeCoins(
      available_coin,
      rest.map(c => tx.object(c.coinObjectId)),
    )

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

  if (!t) {
    const { i18n } = await import('../../main.js')
    // eslint-disable-next-line prefer-destructuring
    t = i18n.global.t
  }

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
      let [, , event_name] = type.split('::')

      if (event_name.startsWith('ItemListed')) event_name = 'ItemListedEvent'

      if (event_name.startsWith('ItemPurchased'))
        event_name = 'ItemPurchasedEvent'

      if (event_name.startsWith('ItemDelisted'))
        event_name = 'ItemDelistedEvent'

      logger.SUI(`rpc event ${event_name}`, event)
      emitter.emit(event_name, {
        ...event.parsedJson,
        sender_is_me: event.sender === get_address(),
      })
    })
    toast.info(t('SUI_SUBSCRIBE_OK'), null, TokenSui)
  } catch (error) {
    if (error.message.includes('Invalid params'))
      console.error(
        'Unable to subscribe to the Sui node as it is too crowded. Please try again later.',
      )
    else console.error('Unable to subscribe to the Sui node', error)
    toast.error(t('SUBSCRIBE_ERROR'), 'Damn Rpc..', GameIconsBrokenBottle)
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
      transactionBlock: txb,
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
