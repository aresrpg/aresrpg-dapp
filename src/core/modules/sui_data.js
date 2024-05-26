import { EventEmitter } from 'events'

import { context, disconnect_ws } from '../game/game.js'
import {
  sui_get_kiosks_profits,
  sui_get_locked_characters,
  sui_get_locked_items,
  sui_get_my_listings,
  sui_get_policies_profit,
  sui_get_sui_balance,
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
      return state
    },
    async observe() {
      let controller = new AbortController()

      async function update_user_data({
        update_locked_characters = false,
        update_unlocked_characters = false,
        update_balance = false,
        update_locked_items = false,
        update_unlocked_items = false,
        update_items_for_sale = false,
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

                function is_for_a_visible_character(id) {
                  const state = context.get_state()
                  return state.visible_characters.has(id)
                }

                emitter.on('update', () => {
                  update_user_data({
                    // update_locked_characters: true,
                    // update_unlocked_characters: true,
                    update_balance: true,
                    // update_locked_items: true,
                    // update_unlocked_items: true,
                    // update_items_for_sale: true,
                  })
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

                emitter.on('ItemMintEvent', event => {
                  if (is_kiosk_mine(event.kiosk_id))
                    debounced_update_user_data({
                      update_locked_items: true,
                    })
                })

                emitter.on('ItemWithdrawEvent', event => {
                  if (event.sender_is_me)
                    debounced_update_user_data({
                      update_locked_items: true,
                      update_unlocked_items: true,
                    })
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
              })

              const { is_owner } = await sui_get_policies_profit()

              context.dispatch('action/sui_data_update', { admin: !!is_owner })

              await update_user_data({
                update_locked_characters: true,
                update_unlocked_characters: true,
                update_balance: true,
                update_locked_items: true,
                update_unlocked_items: true,
                update_items_for_sale: true,
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
              })
            }
          }

          return selected_address
        },
      )
    },
  }
}
