import { EventEmitter, on } from 'events'
import assert from 'assert'
import { setTimeout } from 'timers/promises'

import { aiter } from 'iterator-helper'

import { i18n } from '../../i18n.js'
import { context, disconnect_ws } from '../game/game.js'
import {
  pretty_print_mists,
  sdk,
  sui_get_admin_caps,
  sui_get_aresrpg_kiosk,
  sui_get_finished_crafts,
  sui_get_kiosk_cap,
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
  name: 'Oeuftermath',
  classe: 'default',
  sex: 'default',
  realm: 'overworld',

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

async function find_character_or_retry(id) {
  const character = await sdk.get_character_by_id(id)

  if (!character) {
    console.warn('Character not found, retrying in 1s')
    await setTimeout(1000)
    return find_character_or_retry(id)
  }

  return character
}

async function find_item_or_retry(id) {
  const item = await sdk.get_item_by_id(id)

  if (!item) {
    console.warn('Item not found, retrying in 1s')
    await setTimeout(1000)
    return find_item_or_retry(id)
  }

  return item
}

export const SUI_EMITTER = new EventEmitter()

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
              item.id === payload.id
                ? {
                    ...item,
                    ...payload,
                  }
                : item,
            ),
          },
        }
      }
      if (type === 'action/sui_add_item_for_sale') {
        const item = state.sui.unlocked_items.find(
          item => item.id === payload.id,
        )

        return {
          ...state,
          sui: {
            ...state.sui,
            items_for_sale: [
              ...state.sui.items_for_sale,
              {
                ...item,
                list_price: payload.list_price,
              },
            ],
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
        const item = state.sui.items_for_sale.find(
          item => item.id === payload.id,
        )

        delete item.list_price

        if (payload.keep) {
          if (item.is_aresrpg_character) {
            // @ts-ignore
            state.sui.unlocked_characters.push(item)
          }

          state.sui.unlocked_items.push(item)
        }

        return {
          ...state,
          sui: {
            ...state.sui,
            items_for_sale: state.sui.items_for_sale.filter(
              item => item.id !== payload.id,
            ),
          },
        }
      }
      if (type === 'action/sui_add_unlocked_character') {
        return {
          ...state,
          sui: {
            ...state.sui,
            unlocked_characters: [...state.sui.unlocked_characters, payload],
            unlocked_items: [...state.sui.unlocked_items, payload],
          },
        }
      }
      if (type === 'action/sui_remove_unlocked_character') {
        return {
          ...state,
          sui: {
            ...state.sui,
            unlocked_characters: state.sui.unlocked_characters.filter(
              character => character.id !== payload,
            ),
            unlocked_items: state.sui.unlocked_items.filter(
              character => character.id !== payload,
            ),
          },
        }
      }
      if (type === 'action/sui_split_item') {
        const item = state.sui.unlocked_items.find(
          item => item.id === payload.item_id,
        )

        item.amount -= payload.amount

        return {
          ...state,
          sui: {
            ...state.sui,
            unlocked_items: [
              ...state.sui.unlocked_items,
              {
                ...item,
                id: payload.new_item_id,
                amount: payload.amount,
              },
            ],
          },
        }
      }
      if (type === 'action/sui_merge_item') {
        const { item_id, target_item_id, final_amount } = payload
        const target_item = state.sui.unlocked_items.find(
          item => item.id === target_item_id,
        )

        target_item.amount = final_amount

        return {
          ...state,
          sui: {
            ...state.sui,
            unlocked_items: state.sui.unlocked_items.filter(
              ({ id }) => id !== item_id,
            ),
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
      if (type === 'action/sui_equip_item') {
        const { slot, item_id, character_id } = payload

        const character = state.sui.locked_characters.find(
          character => character.id === character_id,
        )
        const item = state.sui.unlocked_items.find(item => item.id === item_id)

        assert(character, 'Character not found')

        character[slot] = item

        return {
          ...state,
          sui: {
            ...state.sui,
            unlocked_items: state.sui.unlocked_items.filter(
              item => item.id !== item_id,
            ),
          },
        }
      }
      if (type === 'action/sui_unequip_item') {
        const { character_id, slot } = payload

        const character = state.sui.locked_characters.find(
          character => character.id === character_id,
        )
        const item = character[slot]

        if (!character) return state

        character[slot] = null

        return {
          ...state,
          sui: {
            ...state.sui,
            unlocked_items: [...state.sui.unlocked_items, item],
          },
        }
      }
      if (type === 'action/sui_add_locked_character') {
        return {
          ...state,
          sui: {
            ...state.sui,
            locked_characters: [...state.sui.locked_characters, payload],
          },
        }
      }
      if (type === 'action/sui_remove_locked_character') {
        return {
          ...state,
          sui: {
            ...state.sui,
            locked_characters: state.sui.locked_characters.filter(
              character => character.id !== payload,
            ),
          },
        }
      }
      if (type === 'action/add_finished_craft') {
        return {
          ...state,
          sui: {
            ...state.sui,
            finished_crafts: [
              ...state.sui.finished_crafts,
              {
                id: payload.id,
                recipe_id: payload.recipe_id,
              },
            ],
          },
        }
      }

      return state
    },
    async observe() {
      let controller = new AbortController()

      const { t } = i18n.global

      let tx = null

      state_iterator().reduce(
        async (last_address, { sui: { selected_address } }) => {
          const address_changed = last_address !== selected_address

          if (address_changed) {
            disconnect_ws()

            if (selected_address) {
              if (tx) tx.remove()

              tx = toast.tx(t('SUI_FETCHING_DATA'))

              // unsubscription is handled internally
              sui_subscribe(controller).then(emitter => {
                async function is_kiosk_mine(id) {
                  const kiosk = await sui_get_kiosk_cap(id)

                  return !!kiosk
                }

                function is_for_a_visible_character(id) {
                  const state = context.get_state()
                  return state.visible_characters.has(id)
                }

                function is_owned_item(id) {
                  const state = context.get_state()
                  return state.sui.unlocked_items.some(item => item.id === id)
                }

                async function handle_item_merge_event(event) {
                  if (event.sender_is_me) {
                    try {
                      context.dispatch('action/sui_merge_item', {
                        target_item_id: event.target_item_id,
                        item_id: event.item_id,
                        final_amount: event.final_amount,
                      })
                    } catch (error) {
                      console.error(error)
                    }
                    SUI_EMITTER.emit('ItemMergeEvent', event)
                  }
                }

                async function handle_item_split_event({
                  item_id,
                  new_item_id,
                  sender_is_me,
                  amount,
                }) {
                  if (sender_is_me) {
                    context.dispatch('action/sui_split_item', {
                      item_id,
                      new_item_id,
                      amount,
                    })
                  }
                }

                async function handle_item_equip_event(event) {
                  if (event.sender_is_me) {
                    try {
                      context.dispatch('action/sui_equip_item', {
                        slot: event.slot,
                        item_id: event.item_id,
                        character_id: event.character_id,
                      })
                    } catch (error) {
                      console.error(error)
                    }
                  }
                  if (is_for_a_visible_character(event.character_id))
                    SUI_EMITTER.emit('ItemEquipEvent', event)
                }

                async function handle_item_unequip_event(event) {
                  if (event.sender_is_me)
                    context.dispatch('action/sui_unequip_item', event)

                  if (is_for_a_visible_character(event.character_id))
                    SUI_EMITTER.emit('ItemUnequipEvent', event)
                }

                async function handle_pet_feed_event({ pet_id, sender_is_me }) {
                  if (sender_is_me) {
                    try {
                      const pet = await sdk.get_item_by_id(pet_id)
                      context.dispatch('action/sui_update_item', pet)
                      // update stats and Sui
                    } catch (error) {}
                  }
                }

                async function handle_character_create_event(event) {
                  if (event.sender_is_me) {
                    try {
                      const character = await find_character_or_retry(
                        event.character_id,
                      )

                      assert(character, 'Character not found')

                      context.dispatch('action/sui_add_unlocked_character', {
                        ...character,
                        kiosk_id: event.kiosk_id,
                      })
                    } catch (error) {
                      console.error(error)
                    }
                  }
                }

                async function handle_character_select_event(event) {
                  if (event.sender_is_me) {
                    try {
                      const character = await find_character_or_retry(
                        event.character_id,
                      )

                      assert(character, 'Character not found')

                      const cap = await sui_get_kiosk_cap(event.kiosk_id)

                      assert(cap, 'No cap found')

                      context.dispatch('action/sui_add_locked_character', {
                        ...character,
                        kiosk_id: event.kiosk_id,
                        // @ts-ignore
                        personal_kiosk_cap_id: cap.id,
                      })
                      context.dispatch(
                        'action/sui_remove_unlocked_character',
                        event.character_id,
                      )
                    } catch (error) {
                      console.error(error)
                    }
                  }
                }

                async function handle_character_unselect_event(event) {
                  if (event.sender_is_me) {
                    try {
                      const character = await find_character_or_retry(
                        event.character_id,
                      )

                      assert(character, 'Character not found')

                      const cap = await sui_get_kiosk_cap(event.kiosk_id)

                      assert(cap, 'No cap found')

                      context.dispatch('action/sui_add_unlocked_character', {
                        ...character,
                        kiosk_id: event.kiosk_id,
                        // @ts-ignore
                        personal_kiosk_cap_id: cap.id,
                      })
                      context.dispatch(
                        'action/sui_remove_locked_character',
                        event.character_id,
                      )
                    } catch (error) {
                      console.error(error)
                    }
                  }
                }

                async function handle_character_delete_event(event) {
                  if (event.sender_is_me)
                    context.dispatch(
                      'action/sui_remove_unlocked_character',
                      event.character_id,
                    )
                }

                async function handle_stats_reset_event(event) {}

                async function handle_item_mint_event(event) {
                  try {
                    if (await is_kiosk_mine(event.kiosk_id)) {
                      const item = await find_item_or_retry(event.item_id)
                      const cap = await sui_get_kiosk_cap(event.kiosk_id)

                      assert(item, 'Item not found')

                      if (event.sender_is_me) {
                        const final_item = {
                          ...item,
                          kiosk_id: event.kiosk_id,
                          // @ts-ignore
                          personal_kiosk_cap_id: cap.id,
                          // @ts-ignore
                          is_kiosk_personal: cap.personal,
                        }
                        context.dispatch(
                          'action/sui_add_unlocked_item',
                          final_item,
                        )
                        SUI_EMITTER.emit('ItemRevealedEvent', final_item)
                      } else
                        context.dispatch('action/sui_add_locked_item', {
                          ...item,
                          kiosk_id: event.kiosk_id,
                        })
                    }
                  } catch (error) {
                    console.error(error)
                  }
                }

                async function handle_item_withdraw_event(event) {
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
                }

                async function handle_item_listed_event(event) {
                  if (+event.price === 0) return

                  try {
                    if (event.sender_is_me) {
                      context.dispatch('action/sui_add_item_for_sale', {
                        id: event.id,
                        list_price: event.price,
                      })

                      context.dispatch(
                        'action/sui_remove_unlocked_item',
                        event.id,
                      )
                      context.dispatch(
                        'action/sui_remove_unlocked_character',
                        event.id,
                      )
                    }
                  } catch (error) {
                    console.error(error)
                  }
                  SUI_EMITTER.emit('ItemListedEvent', event)
                }

                async function handle_item_destroy_event(event) {
                  if (event.sender_is_me) {
                    context.dispatch(
                      'action/sui_remove_unlocked_item',
                      event.item_id,
                    )
                    SUI_EMITTER.emit('ItemDestroyEvent', event)
                  }
                }

                async function handle_item_purchased_event(event) {
                  if (+event.price === 0) return
                  // If I'm the seller
                  if (await is_kiosk_mine(event.kiosk)) {
                    const my_listing = context
                      .get_state()
                      .sui.items_for_sale.find(
                        listing => listing.id === event.id,
                      )

                    // if the price isn't 0
                    toast.info(
                      // @ts-ignore
                      `${my_listing.name} ${t('SUI_ITEM_SOLD')}`,
                      // @ts-ignore
                      `+${pretty_print_mists(my_listing.list_price)} Sui`,
                      EmojioneMoneyBag,
                    )
                    context.dispatch('action/sui_remove_item_for_sale', {
                      id: event.id,
                      keep: false,
                    })

                    SUI_EMITTER.emit('ItemSoldEvent', my_listing)
                  }

                  // If I'm the buyer
                  if (event.sender_is_me) {
                    const my_listing = context
                      .get_state()
                      .sui.items_for_sale.find(
                        listing => listing.id === event.id,
                      )

                    // If I didn't list the item (making sure i'm not buying my own item)
                    if (!my_listing) {
                      try {
                        const item = await sdk.get_item_by_id(event.id)
                        const { kiosk, personal_kiosk_cap } =
                          await sui_get_aresrpg_kiosk()

                        if (item) {
                          context.dispatch('action/sui_add_unlocked_item', {
                            ...item,
                            kiosk_id: kiosk.id,
                            personal_kiosk_cap_id: personal_kiosk_cap.id,
                            is_kiosk_personal: true,
                          })
                        } else {
                          const character = await sdk.get_character_by_id(
                            event.id,
                          )

                          assert(character, 'Character not found')

                          context.dispatch(
                            'action/sui_add_unlocked_character',
                            {
                              ...character,
                              kiosk_id: kiosk.id,
                            },
                          )
                        }
                      } catch (error) {
                        console.error(error)
                      }
                    }
                  }

                  SUI_EMITTER.emit('ItemPurchasedEvent', event)
                }

                async function handle_item_delisted_event(event) {
                  if (event.sender_is_me) {
                    context.dispatch('action/sui_remove_item_for_sale', {
                      id: event.id,
                      keep: true,
                    })
                  }
                  SUI_EMITTER.emit('ItemDelistedEvent', event)
                }

                async function handle_finished_craft_event(event) {
                  if (event.sender_is_me)
                    context.dispatch('action/add_finished_craft', {
                      id: event.id,
                      recipe_id: event.recipe_id,
                    })
                }

                async function handle_vaporeon_mint_event(event) {
                  if (event.sender_is_me) {
                    const item = await sdk.get_item_by_id(event.id)
                    SUI_EMITTER.emit('VaporeonMintEvent', {
                      item,
                      shiny: event.shiny,
                    })
                    context.dispatch('action/sui_add_unlocked_item', {
                      ...item,
                      kiosk_id: event.kiosk_id,
                    })
                  }
                }

                return aiter(on(emitter, 'update')).forEach(
                  async ([{ type, payload }]) => {
                    switch (type) {
                      case 'interval':
                        context.dispatch(
                          'action/sui_data_update',
                          await Promise.all([
                            sui_get_sui_balance(),
                            sui_get_supported_tokens(),
                          ]).then(([balance, tokens]) => ({
                            balance,
                            tokens,
                          })),
                        )
                        break
                      case 'RecipeCreateEvent':
                        return SUI_EMITTER.emit(type, payload)
                      case 'RecipeDeleteEvent':
                        return SUI_EMITTER.emit(type, payload)
                      case 'ItemMergeEvent':
                        return handle_item_merge_event(payload)
                      case 'ItemSplitEvent':
                        return handle_item_split_event(payload)
                      case 'ItemEquipEvent':
                        return handle_item_equip_event(payload)
                      case 'ItemUnequipEvent':
                        return handle_item_unequip_event(payload)
                      case 'PetFeedEvent':
                        return handle_pet_feed_event(payload)
                      case 'CharacterCreateEvent':
                        return handle_character_create_event(payload)
                      case 'CharacterSelectEvent':
                        return handle_character_select_event(payload)
                      case 'CharacterUnselectEvent':
                        return handle_character_unselect_event(payload)
                      case 'CharacterDeleteEvent':
                        return handle_character_delete_event(payload)
                      case 'StatsResetEvent':
                        return handle_stats_reset_event(payload)
                      case 'ItemMintEvent':
                        return handle_item_mint_event(payload)
                      case 'ItemWithdrawEvent':
                        return handle_item_withdraw_event(payload)
                      case 'ItemListedEvent':
                        return handle_item_listed_event(payload)
                      case 'ItemDestroyEvent':
                        return handle_item_destroy_event(payload)
                      case 'ItemPurchasedEvent':
                        return handle_item_purchased_event(payload)
                      case 'ItemDelistedEvent':
                        return handle_item_delisted_event(payload)
                      case 'FinishedCraftEvent':
                        return handle_finished_craft_event(payload)
                      case 'VaporeonMintEvent':
                        return handle_vaporeon_mint_event(payload)
                      default:
                        console.warn('Unhandled event', type, payload)
                        break
                    }
                  },
                )
              })

              context.dispatch(
                'action/sui_data_update',
                Object.assign(
                  {},
                  ...(await Promise.all([
                    sui_get_admin_caps().then(result => ({
                      admin_caps: result,
                    })),
                    sui_get_locked_characters().then(result => ({
                      locked_characters: result,
                    })),
                    sui_get_unlocked_characters().then(result => ({
                      unlocked_characters: result,
                    })),
                    sui_get_sui_balance().then(result => ({ balance: result })),
                    sui_get_locked_items().then(result => ({
                      locked_items: result,
                    })),
                    sui_get_unlocked_items().then(result => ({
                      unlocked_items: result,
                    })),
                    sui_get_my_listings().then(result => ({
                      items_for_sale: result,
                    })),
                    sui_get_supported_tokens().then(result => ({
                      tokens: result,
                    })),
                    sui_get_finished_crafts().then(result => ({
                      finished_crafts: result,
                    })),
                  ])),
                ),
              )

              try {
                tx.update('success', t('SUI_DATA_FETCHED'))
                context.connect_ws()
              } catch (error) {
                console.error(error)
                tx.remove()
              }
            } else {
              if (tx) tx.update('error', t('APP_LOGIN_AGAIN'))
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
