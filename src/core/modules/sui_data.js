import { EventEmitter } from 'events'

import { i18n } from '../../i18n.js'
import { context, disconnect_ws } from '../game/game.js'
import {
  sdk,
  sui_get_admin_caps,
  sui_get_finished_crafts,
  sui_get_locked_characters,
  sui_get_locked_items,
  sui_get_my_listings,
  sui_get_sui_balance,
  sui_get_supported_tokens,
  sui_get_unlocked_characters,
  sui_get_unlocked_items,
  sui_subscribe,
} from '../sui/client.js'
import { state_iterator } from '../utils/iterator.js'
import toast from '../../toast.js'

// @ts-ignore
import EmojioneMoneyBag from '~icons/emojione/money-bag'

export const DEFAULT_SUI_CHARACTER = () => ({
  id: 'default',
  name: 'Chafer Lancier',
  classe: 'default',
  sex: 'default',

  position: { x: 0, y: 220, z: 0 },
  experience: 0,
  health: 30,
  selected: false,
  soul: 100,
  available_points: 0,

  vitality: 0,
  wisdom: 0,
  strength: 0,
  intelligence: 0,
  chance: 0,
  agility: 0,

  kiosk_id: null,
  personal_kiosk_cap_id: null,

  _type: null,
})

export const SUI_EMITTER = new EventEmitter()

function debounce(func, wait) {
  const timeouts = new Map()
  return function (params) {
    const key = JSON.stringify(params)
    if (timeouts.has(key)) clearTimeout(timeouts.get(key))
    const timeout = setTimeout(() => {
      func(params)
      timeouts.delete(key)
    }, wait)
    timeouts.set(key, timeout)
  }
}

/** @type {Type.Module} */
export default function () {
  return {
    // @ts-ignore - it's fine to add a character in the unlocked items
    reduce(state, { type, payload }) {
      if (type === 'action/sui_data_update') {
        // some fields might be often updated by the server, so we don't want to override them with on chain data
        payload.locked_characters?.forEach(character => {
          const existing_character = state.sui.locked_characters.find(
            ({ id }) => id === character.id,
          )

          if (existing_character?.health)
            character.health = existing_character.health
        })

        return {
          ...state,
          sui: {
            ...state.sui,
            ...payload,
          },
        }
      }
      if (type === 'action/sui_add_unlocked_item') {
        return {
          ...state,
          sui: {
            ...state.sui,
            unlocked_items: [...state.sui.unlocked_items, payload],
          },
        }
      }
      if (type === 'action/sui_add_locked_item') {
        return {
          ...state,
          sui: {
            ...state.sui,
            locked_items: [...state.sui.locked_items, payload],
          },
        }
      }
      if (type === 'action/sui_remove_locked_item') {
        return {
          ...state,
          sui: {
            ...state.sui,
            locked_items: state.sui.locked_items.filter(
              item => item.id !== payload,
            ),
          },
        }
      }
      if (type === 'action/sui_update_item') {
        return {
          ...state,
          sui: {
            ...state.sui,
            unlocked_items: state.sui.unlocked_items.map(item =>
              item.id === payload.id ? payload : item,
            ),
          },
        }
      }
      if (type === 'action/sui_add_item_for_sale') {
        return {
          ...state,
          sui: {
            ...state.sui,
            items_for_sale: [...state.sui.items_for_sale, payload],
          },
        }
      }
      if (type === 'action/sui_remove_unlocked_item') {
        return {
          ...state,
          sui: {
            ...state.sui,
            unlocked_items: state.sui.unlocked_items.filter(
              item => item.id !== payload,
            ),
          },
        }
      }
      if (type === 'action/sui_remove_item_for_sale') {
        return {
          ...state,
          sui: {
            ...state.sui,
            items_for_sale: state.sui.items_for_sale.filter(
              item => item.id !== payload,
            ),
          },
        }
      }
      if (type === 'action/sui_add_unlocked_character') {
        return {
          ...state,
          sui: {
            ...state.sui,
            unlocked_items: [...state.sui.unlocked_items, payload],
          },
        }
      }
      if (type === 'action/sui_remove_unlocked_character') {
        return {
          ...state,
          sui: {
            ...state.sui,
            unlocked_items: state.sui.unlocked_items.filter(
              character => character.id !== payload,
            ),
          },
        }
      }
      if (type === 'action/sui_split_item') {
        const { id, amount, new_id } = payload
        const item = state.sui.unlocked_items.find(item => item.id === id)

        if (!item) return state

        return {
          ...state,
          sui: {
            ...state.sui,
            unlocked_items: [
              ...state.sui.unlocked_items.filter(item => item.id !== id),
              {
                ...item,
                amount: item.amount - amount,
              },
              {
                ...item,
                id: new_id,
                amount,
              },
            ],
          },
        }
      }
      if (type === 'action/sui_merge_item') {
        const { id, merged_id } = payload
        const item = state.sui.unlocked_items.find(item => item.id === id)
        const merged_item = state.sui.unlocked_items.find(
          item => item.id === merged_id,
        )

        if (!item || !merged_item) return state

        return {
          ...state,
          sui: {
            ...state.sui,
            unlocked_items: [
              ...state.sui.unlocked_items.filter(
                item => item.id !== id && item.id !== merged_id,
              ),
              {
                ...item,
                amount: item.amount + merged_item.amount,
              },
            ],
          },
        }
      }
      if (type === 'action/sui_remove_finished_craft') {
        return {
          ...state,
          sui: {
            ...state.sui,
            finished_crafts: state.sui.finished_crafts.filter(
              craft => craft.id !== payload,
            ),
          },
        }
      }

      return state
    },
    async observe() {
      let controller = new AbortController()

      const { t } = i18n.global

      async function update_user_data({
        update_locked_characters = false,
        update_unlocked_characters = false,
        update_balance = false,
        update_tokens = false,
        update_locked_items = false,
        update_unlocked_items = false,
        update_items_for_sale = false,
        update_finished_crafts = false,
      }) {
        const update = {}

        if (update_locked_characters)
          update.locked_characters = await sui_get_locked_characters()

        if (update_unlocked_characters)
          update.unlocked_characters = await sui_get_unlocked_characters()

        if (update_balance) update.balance = await sui_get_sui_balance()

        if (update_locked_items)
          update.locked_items = await sui_get_locked_items()

        if (update_unlocked_items)
          update.unlocked_items = await sui_get_unlocked_items()

        if (update_items_for_sale)
          update.items_for_sale = await sui_get_my_listings()

        if (update_tokens) update.tokens = await sui_get_supported_tokens()

        if (update_finished_crafts)
          update.finished_crafts = await await sui_get_finished_crafts()

        context.dispatch('action/sui_data_update', update)
      }

      const debounced_update_user_data = debounce(update_user_data, 100)

      let tx = null

      state_iterator().reduce(
        async (last_address, { sui: { selected_address } }) => {
          const address_changed = last_address !== selected_address

          if (address_changed) {
            disconnect_ws()

            if (selected_address) {
              if (tx) tx.remove()

              tx = toast.tx(t('FETCHING_DATA'))

              // unsubscription is handled internally
              sui_subscribe(controller).then(emitter => {
                function is_kiosk_mine(id) {
                  const state = context.get_state()
                  const kiosk_is_mine = state.sui.locked_characters.some(
                    ({ kiosk_id }) => kiosk_id === id,
                  )

                  return kiosk_is_mine
                }

                function forward_event(name) {
                  emitter.on(name, event => SUI_EMITTER.emit(name, event))
                }

                function is_for_a_visible_character(id) {
                  const state = context.get_state()
                  return state.visible_characters.has(id)
                }

                function is_owned_item(id) {
                  const state = context.get_state()
                  return state.sui.unlocked_items.some(item => item.id === id)
                }

                emitter.on('update', () => {
                  update_user_data({
                    // update_locked_characters: true,
                    // update_unlocked_characters: true,
                    update_balance: true,
                    update_tokens: true,
                    // update_locked_items: true,
                    // update_unlocked_items: true,
                    // update_items_for_sale: true,
                  })
                })
                ;['RecipeCreateEvent', 'RecipeDeleteEvent'].forEach(
                  forward_event,
                )

                emitter.on('ItemMergeEvent', async event => {
                  if (is_owned_item(event.item_id)) {
                    context.dispatch('action/sui_merge_item', {
                      id: event.target_item_id,
                      merged_id: event.item_id,
                    })
                    SUI_EMITTER.emit('ItemMergeEvent', event)
                  }
                })

                emitter.on('ItemSplitEvent', event => {
                  if (is_owned_item(event.item_id)) {
                    context.dispatch('action/sui_split_item', {
                      id: event.item_id,
                      amount: event.amount,
                      new_id: event.new_item_id,
                    })
                    SUI_EMITTER.emit('ItemSplitEvent', event)
                  }
                })

                emitter.on('ItemEquipEvent', event => {
                  if (event.sender_is_me)
                    debounced_update_user_data({
                      update_locked_characters: true,
                      update_unlocked_items: true,
                    })
                  if (is_for_a_visible_character(event.character_id))
                    SUI_EMITTER.emit('ItemEquipEvent', event)
                })

                emitter.on('ItemUnequipEvent', event => {
                  if (event.sender_is_me)
                    debounced_update_user_data({
                      update_locked_characters: true,
                      update_unlocked_items: true,
                    })

                  if (is_for_a_visible_character(event.character_id))
                    SUI_EMITTER.emit('ItemUnequipEvent', event)
                })

                emitter.on('PetFeedEvent', event => {
                  if (event.sender_is_me)
                    debounced_update_user_data({
                      update_locked_characters: true,
                      update_unlocked_items: true,
                      update_balance: true,
                    })
                })

                emitter.on('CharacterCreateEvent', event => {
                  if (event.sender_is_me)
                    debounced_update_user_data({
                      update_unlocked_characters: true,
                    })
                })

                emitter.on('CharacterSelectEvent', event => {
                  if (event.sender_is_me)
                    debounced_update_user_data({
                      update_locked_characters: true,
                      update_unlocked_characters: true,
                    })
                })

                emitter.on('CharacterUnselectEvent', event => {
                  if (event.sender_is_me)
                    debounced_update_user_data({
                      update_locked_characters: true,
                      update_unlocked_characters: true,
                    })
                })

                emitter.on('CharacterDeleteEvent', event => {
                  if (event.sender_is_me)
                    debounced_update_user_data({
                      update_unlocked_characters: true,
                    })
                })

                emitter.on('StatsResetEvent', event => {
                  if (event.sender_is_me)
                    debounced_update_user_data({
                      update_locked_characters: true,
                      update_unlocked_items: true,
                    })
                })

                emitter.on('ItemMintEvent', async event => {
                  try {
                    if (is_kiosk_mine(event.kiosk_id)) {
                      const item = await sdk.get_item_by_id(event.item_id)
                      if (event.sender_is_me)
                        context.dispatch('action/sui_add_unlocked_item', {
                          ...item,
                          kiosk_id: event.kiosk_id,
                        })
                      else
                        context.dispatch('action/sui_add_locked_item', {
                          ...item,
                          kiosk_id: event.kiosk_id,
                        })
                    }
                  } catch (error) {
                    console.error(error)
                  }
                })

                emitter.on('ItemWithdrawEvent', async event => {
                  try {
                    if (event.sender_is_me) {
                      const item = await sdk.get_item_by_id(event.item_id)
                      context.dispatch('action/sui_add_unlocked_item', {
                        ...item,
                        kiosk_id: event.kiosk_id,
                      })
                      context.dispatch(
                        'action/sui_remove_locked_item',
                        event.item_id,
                      )
                    }
                  } catch (error) {
                    console.error(error)
                  }
                })

                emitter.on('ItemListedEvent', async event => {
                  try {
                    if (event.sender_is_me) {
                      const item = await sdk.get_item_by_id(event.id)
                      if (item) {
                        context.dispatch(
                          'action/sui_remove_unlocked_item',
                          event.id,
                        )
                        context.dispatch('action/sui_add_item_for_sale', {
                          ...item,
                          list_price: event.price,
                          kiosk_id: event.kiosk,
                        })
                      } else {
                        const character = await sdk.get_character_by_id(
                          event.id,
                        )
                        if (character) {
                          context.dispatch(
                            'action/sui_remove_unlocked_character',
                            event.id,
                          )
                          context.dispatch(
                            'action/sui_add_item_for_sale',
                            // @ts-ignore
                            {
                              ...character,
                              list_price: event.price,
                              kiosk_id: event.kiosk,
                            },
                          )
                        }
                      }
                    }
                  } catch (error) {
                    console.error(error)
                  }
                  SUI_EMITTER.emit('ItemListedEvent', event)
                })

                emitter.on('ItemDestroyEvent', event => {
                  if (event.sender_is_me) {
                    context.dispatch(
                      'action/sui_remove_unlocked_item',
                      event.item_id,
                    )
                    SUI_EMITTER.emit('ItemDestroyEvent', event)
                  }
                })

                emitter.on('ItemPurchasedEvent', async event => {
                  if (event.sender_is_me) {
                    const my_listing = context
                      .get_state()
                      .sui.items_for_sale.find(
                        listing => listing.id === event.id,
                      )

                    // I listed the item, and the price isn't 0
                    if (+my_listing?.list_price?.toString()) {
                      toast.info(
                        // @ts-ignore
                        `${my_listing.name} ${t('item_sold')}`,
                        // @ts-ignore
                        `+${pretty_print_mists(my_listing.list_price)} Sui`,
                        EmojioneMoneyBag,
                      )
                      context.dispatch(
                        'action/sui_remove_item_for_sale',
                        event.id,
                      )
                      // I didn't listed the item, meaning I bought it from someone
                    } else if (!my_listing) {
                      try {
                        const item = await sdk.get_item_by_id(event.id)
                        if (item) {
                          context.dispatch('action/sui_add_unlocked_item', {
                            ...item,
                            kiosk_id: event.kiosk,
                          })
                        } else {
                          const character = await sdk.get_character_by_id(
                            event.id,
                          )
                          if (character)
                            context.dispatch(
                              'action/sui_add_unlocked_character',
                              {
                                ...character,
                                kiosk_id: event.kiosk,
                              },
                            )
                        }
                      } catch (error) {
                        console.error(error)
                      }
                    }
                  }

                  SUI_EMITTER.emit('ItemPurchasedEvent', event)
                })

                emitter.on('ItemDelistedEvent', async event => {
                  try {
                    if (event.sender_is_me) {
                      context.dispatch(
                        'action/sui_remove_item_for_sale',
                        event.id,
                      )

                      const item = await sdk.get_item_by_id(event.id)

                      if (item) {
                        context.dispatch('action/sui_add_unlocked_item', {
                          ...item,
                          kiosk_id: event.kiosk,
                        })
                      } else {
                        const character = await sdk.get_character_by_id(
                          event.id,
                        )
                        if (character)
                          context.dispatch(
                            'action/sui_add_unlocked_character',
                            {
                              ...character,
                              kiosk_id: event.kiosk,
                            },
                          )
                      }
                    }
                  } catch (error) {
                    console.error(error)
                  }
                  SUI_EMITTER.emit('ItemDelistedEvent', event)
                })

                emitter.on('FinishedCraftEvent', event => {
                  if (event.sender_is_me)
                    debounced_update_user_data({
                      update_finished_crafts: true,
                    })
                })
              })

              const result = await sui_get_admin_caps()

              context.dispatch('action/sui_data_update', {
                admin_caps: result,
              })

              await update_user_data({
                update_locked_characters: true,
                update_unlocked_characters: true,
                update_balance: true,
                update_locked_items: true,
                update_unlocked_items: true,
                update_items_for_sale: true,
                update_tokens: true,
                update_finished_crafts: true,
              })
              tx.update('success', t('DATA_FETCHED'))
            } else {
              if (tx) tx.update('error', t('LOGIN_AGAIN'))
              controller.abort()
              controller = new AbortController()

              context.dispatch('action/sui_data_update', {
                locked_characters: [DEFAULT_SUI_CHARACTER()],
                unlocked_characters: [],
                locked_items: [],
                unlocked_items: [],
                items_for_sale: [],
                balance: 0n,
                admin_caps: [],
              })
            }
          }

          return selected_address
        },
      )
    },
  }
}
