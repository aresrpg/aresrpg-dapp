import { EventEmitter } from 'events'

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
import { decrease_loading, increase_loading } from '../utils/loading.js'

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
        console.dir({ sui_add_unlocked_item: payload })
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
      return state
    },
    async observe() {
      let controller = new AbortController()

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

      state_iterator().reduce(
        async (last_address, { sui: { selected_address } }) => {
          const address_changed = last_address !== selected_address

          if (address_changed) {
            disconnect_ws()

            if (selected_address) {
              increase_loading()

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
                    debounced_update_user_data({
                      update_unlocked_items: true,
                    })
                    SUI_EMITTER.emit('ItemMergeEvent', event)
                  }
                })

                emitter.on('ItemSplitEvent', async event => {
                  if (is_owned_item(event.item_id)) {
                    debounced_update_user_data({
                      update_unlocked_items: true,
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

                emitter.on('ItemListedEvent', event => {
                  if (event.sender_is_me)
                    debounced_update_user_data({
                      update_items_for_sale: true,
                      update_unlocked_items: true,
                    })
                  SUI_EMITTER.emit('ItemListedEvent', event)
                })

                emitter.on('ItemPurchasedEvent', event => {
                  if (event.sender_is_me)
                    debounced_update_user_data({
                      update_items_for_sale: true,
                      update_unlocked_items: true,
                      update_balance: true,
                    })

                  SUI_EMITTER.emit('ItemPurchasedEvent', event)
                })

                emitter.on('ItemDelistedEvent', event => {
                  if (event.sender_is_me)
                    debounced_update_user_data({
                      update_items_for_sale: true,
                      update_unlocked_items: true,
                    })

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
              decrease_loading()
            } else {
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
