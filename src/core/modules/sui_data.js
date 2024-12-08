import { EventEmitter, on, once } from 'events'
import assert from 'assert'
import { setInterval } from 'timers/promises'

import { aiter } from 'iterator-helper'

import { i18n } from '../../i18n.js'
import { context, disconnect_ws } from '../game/game.js'
import {
  pretty_print_mists,
  sdk,
  sui_get_admin_caps,
  sui_get_characters,
  sui_get_finished_crafts,
  sui_get_items,
  sui_get_my_listings,
  sui_get_sui_balance,
  sui_get_supported_tokens,
} from '../sui/client.js'
import { abortable, state_iterator } from '../utils/iterator.js'
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

export const SUI_EMITTER = new EventEmitter()

/** @type {Type.Module} */
export default function () {
  return {
    // @ts-ignore - it's fine to add a character in the unlocked items
    reduce(state, { type, payload }) {
      if (type === 'action/sui_data_update') {
        if (payload.characters) {
          // some fields might be often updated by the server, so we don't want to override them with on chain data
          payload.characters.forEach(character => {
            const existing_character = state.sui.characters.find(
              ({ id }) => id === character.id,
            )

            if (existing_character?.health)
              character.health = existing_character.health
          })

          // @ts-ignore
          payload.items = [
            ...payload?.items,
            ...payload.characters.map(character => ({
              ...character,
              image_url: `https://assets.aresrpg.world/classe/${character.classe}_${character.sex}.jpg`,
            })),
          ]
        }

        return {
          ...state,
          sui: {
            ...state.sui,
            ...payload,
          },
        }
      }
      if (type === 'action/character_update') {
        const character = state.sui.characters.find(
          ({ id }) => id === payload.id,
        )
        if (character)
          return {
            ...state,
            sui: {
              ...state.sui,
              characters: state.sui.characters
                .filter(({ id }) => id !== payload.id)
                .concat({
                  ...character,
                  ...payload,
                }),
            },
          }
      }
      if (type === 'action/sui_add_item') {
        return {
          ...state,
          sui: {
            ...state.sui,
            items: [...state.sui.items, payload],
          },
        }
      }
      if (type === 'action/sui_remove_item') {
        return {
          ...state,
          sui: {
            ...state.sui,
            items: state.sui.items.filter(item => item.id !== payload),
            characters: state.sui.characters.filter(
              character => character.id !== payload,
            ),
          },
        }
      }
      if (type === 'action/sui_update_item') {
        return {
          ...state,
          sui: {
            ...state.sui,
            items: state.sui.items.map(item =>
              item.id === payload.id ? payload : item,
            ),
          },
        }
      }
      if (type === 'action/sui_add_item_for_sale') {
        const item = state.sui.items.find(item => item.id === payload.id)

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
      if (type === 'action/sui_remove_item_for_sale') {
        const item = state.sui.items_for_sale.find(
          item => item.id === payload.id,
        )

        delete item.list_price

        if (payload.keep) {
          if (item.is_aresrpg_character) {
            // @ts-ignore
            state.sui.characters.push(item)
          }

          state.sui.items.push(item)
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
      if (type === 'action/sui_create_character') {
        return {
          ...state,
          sui: {
            ...state.sui,
            characters: [...state.sui.characters, payload],
          },
        }
      }
      if (type === 'action/sui_delete_character') {
        return {
          ...state,
          sui: {
            ...state.sui,
            characters: state.sui.characters.filter(
              character => character.id !== payload,
            ),
            items: state.sui.items.filter(item => item.id !== payload),
          },
        }
      }

      if (type === 'action/sui_split_item') {
        const { item, new_item } = payload
        const original_item = state.sui.items.find(
          o_item => o_item.id === item?.id,
        )

        let items = [...state.sui.items]

        // Case 1: We know the local item AND item exists AND new_item exists
        // Action: Update original item amount and add new item
        if (original_item && item && new_item) {
          items = items.map(i =>
            i.id === original_item.id ? { ...i, amount: item.amount } : i,
          )
          items.push(new_item)
        }

        // Case 2: We know the local item AND item exists AND no new_item
        // Action: Just update original item amount
        else if (original_item && item) {
          items = items.map(i =>
            i.id === original_item.id ? { ...i, amount: item.amount } : i,
          )
        }

        // Case 3: We don't know the local item AND we have a new_item
        // Action: Add the new item to our list
        else if (!original_item && new_item) {
          items.push(new_item)
        }

        return {
          ...state,
          sui: {
            ...state.sui,
            items,
          },
        }
      }
      if (type === 'action/sui_merge_item') {
        const { item_id, target_item_id, final_amount } = payload
        const target_item = state.sui.items.find(
          item => item.id === target_item_id,
        )

        target_item.amount = final_amount

        return {
          ...state,
          sui: {
            ...state.sui,
            items: state.sui.items.filter(({ id }) => id !== item_id),
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
        const { slot, item, character_id } = payload

        const character = state.sui.characters.find(
          character => character.id === character_id,
        )
        assert(character, 'Character not found')

        character[slot] = item

        return {
          ...state,
          sui: {
            ...state.sui,
            items: state.sui.items.filter(i => i.id !== item.id),
          },
        }
      }
      if (type === 'action/sui_unequip_item') {
        const { character_id, slot } = payload

        const character = state.sui.characters.find(
          character => character.id === character_id,
        )
        const item = character[slot]

        if (!character) return state

        character[slot] = null

        return {
          ...state,
          sui: {
            ...state.sui,
            items: [...state.sui.items, item],
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
    async observe({ signal, events }) {
      let controller = new AbortController()

      const { t } = i18n.global

      let tx = null
      let await_connection_success_toast = null

      const event_matcher = {
        character: {
          create(character) {
            assert(character, 'Character not found')
            context.dispatch('action/sui_create_character', character)
          },
          delete(character_id) {
            context.dispatch('action/sui_delete_character', character_id)
          },
          delist({ sender, character_id }) {
            if (sender === context.get_state().sui.selected_address)
              context.dispatch('action/sui_remove_item_for_sale', {
                id: character_id,
                keep: true,
              })
            SUI_EMITTER.emit('ItemDelistedEvent', { id: character_id })
          },
          equip_item({ slot, item, id, self }) {
            const payload = { slot, item, character_id: id }
            if (self) {
              if (payload.item)
                context.dispatch('action/sui_equip_item', payload)
              else context.dispatch('action/sui_unequip_item', payload)
            } else SUI_EMITTER.emit('ItemEquipEvent', payload)
          },
          list({ sender, character, price }) {
            if (+price === 0) return

            if (sender === context.get_state().sui.selected_address) {
              context.dispatch('action/sui_add_item_for_sale', {
                id: character.id,
                list_price: price,
              })

              context.dispatch('action/sui_remove_item', character.id)
            }
            SUI_EMITTER.emit('ItemListedEvent', { character, price })
          },
          update(character) {
            context.dispatch('action/character_update', character)
          },
          purchase({ character, price, seller, sender }) {
            if (+price === 0) return
            const state = context.get_state()
            // If I'm the seller
            if (seller === state.sui.selected_address) {
              const my_listing = state.sui.items_for_sale.find(
                listing => listing.id === character.id,
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
                id: character.id,
                keep: false,
              })

              SUI_EMITTER.emit('ItemSoldEvent', my_listing)
            }

            // If I'm the buyer
            if (sender === state.sui.selected_address) {
              const my_listing = context
                .get_state()
                .sui.items_for_sale.find(listing => listing.id === character.id)

              // If I didn't list the item (making sure i'm not buying my own item)
              if (!my_listing) {
                context.dispatch('action/sui_add_character', character)
              }
            }
            SUI_EMITTER.emit('ItemPurchasedEvent', { character, price, seller })
          },
        },
        vaporeon: {
          mint(item) {
            SUI_EMITTER.emit('VaporeonMintEvent', {
              item,
              shiny: item.shiny,
            })
            context.dispatch('action/sui_add_item', item)
          },
        },
        item: {
          create(item) {
            context.dispatch('action/sui_add_item', item)
            SUI_EMITTER.emit('ItemRevealedEvent', item)
          },
          delete(item_id) {
            context.dispatch('action/sui_remove_item', item_id)
          },
          update(item) {
            context.dispatch('action/sui_update_item', item)
          },
          merge({ target_item, item_id }) {
            context.dispatch('action/sui_merge_item', {
              target_item_id: target_item.id,
              item_id,
              final_amount: target_item.amount,
            })
            SUI_EMITTER.emit('ItemMergeEvent', event)
          },
          split({ new_item, item }) {
            context.dispatch('action/sui_split_item', {
              item,
              new_item,
            })
          },
          list({ item, price }) {
            if (+price === 0) return

            if (item.owner === context.get_state().sui.selected_address) {
              context.dispatch('action/sui_add_item_for_sale', {
                id: item.id,
                list_price: price,
              })

              context.dispatch('action/sui_remove_item', item.id)
            }
            SUI_EMITTER.emit('ItemListedEvent', { item, price })
          },
          delist(item) {
            if (item.owner === context.get_state().sui.selected_address)
              context.dispatch('action/sui_remove_item_for_sale', {
                id: item.id,
                keep: true,
              })
            SUI_EMITTER.emit('ItemDelistedEvent', item)
          },
          purchase({ item, price, seller }) {
            if (+price === 0) return
            const state = context.get_state()
            // If I'm the seller
            if (seller === state.sui.selected_address) {
              const my_listing = state.sui.items_for_sale.find(
                listing => listing.id === item.id,
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
                id: item.id,
                keep: false,
              })

              SUI_EMITTER.emit('ItemSoldEvent', my_listing)
            }

            // If I'm the buyer
            if (item.owner === state.sui.selected_address) {
              const my_listing = context
                .get_state()
                .sui.items_for_sale.find(listing => listing.id === item.id)

              // If I didn't list the item (making sure i'm not buying my own item)
              if (!my_listing) {
                context.dispatch('action/sui_add_item', {
                  ...item,
                  is_kiosk_personal: true,
                })
              }
            }

            SUI_EMITTER.emit('ItemPurchasedEvent', { item, price, seller })
          },
        },
        recipe: {
          create(recipe) {
            SUI_EMITTER.emit('RecipeCreateEvent', recipe)
          },
          delete(recipe_id) {
            SUI_EMITTER.emit('RecipeDeleteEvent', recipe_id)
          },
        },
        craft: {
          finish(craft) {
            context.dispatch('action/add_finished_craft', craft)
          },
        },
        admin: {
          // when an admin cap appears in a checkpoint (might be new)
          update(cap) {
            context.dispatch('action/sui_data_update', {
              admin_caps: context.get_state().sui.admin_caps.concat(cap),
            })
          },
          delete(id) {
            context.dispatch('action/sui_data_update', {
              admin_caps: context
                .get_state()
                .sui.admin_caps.filter(cap => cap.id !== id),
            })
          },
        },
      }

      context.events.on('packet/suiEvent', ({ event, data }) => {
        const [header, action] = event.split(':')
        event_matcher[header]?.[action]?.(JSON.parse(data))
      })

      aiter(abortable(setInterval(10000, null, { signal }))).forEach(
        async () => {
          if (context.get_state().sui.selected_address)
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
        },
      )

      async function connect_and_fetch(selected_address) {
        if (selected_address) {
          await context.connect_ws()

          await_connection_success_toast?.remove()
          await_connection_success_toast = toast.tx(t('SUI_WAITING_SIGNATURE'))

          const [result] = await Promise.race([
            // @ts-ignore
            once(events, 'packet/connectionAccepted'),
            // @ts-ignore
            once(events, 'SIGNATURE_NOT_VERIFIED'),
          ])

          if (!result?.address) {
            await_connection_success_toast?.remove()
            return selected_address
          }

          if (result.address !== selected_address) {
            await_connection_success_toast.update(
              'error',
              t('SUI_SIGNATURE_ADDRESS_MISMATCH'),
            )
            return selected_address
          }

          await_connection_success_toast.update(
            'success',
            t('SUI_SIGNATURE_SUCCESS'),
          )

          if (tx) tx.remove()

          tx = toast.tx(t('SUI_FETCHING_DATA'))

          context.dispatch(
            'action/sui_data_update',
            Object.assign(
              {},
              ...(await Promise.all([
                sui_get_admin_caps().then(result => ({
                  admin_caps: result,
                })),
                sui_get_characters().then(characters => {
                  return {
                    characters,
                  }
                }),
                sui_get_sui_balance().then(result => ({
                  balance: result,
                })),
                sui_get_items().then(items => {
                  return { items }
                }),
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

          tx.update('success', t('SUI_DATA_FETCHED'))
        } else {
          if (tx) tx.update('error', t('APP_LOGIN_AGAIN'))
          controller.abort()
          controller = new AbortController()

          events.emit('USER_LOGOUT')

          context.dispatch('action/sui_data_update', {
            characters: [DEFAULT_SUI_CHARACTER()],
            items: [],
            items_for_sale: [],
            balance: 0n,
            admin_caps: [],
          })
        }

        return selected_address
      }

      events.on('RECONNECT_TO_SERVER', () =>
        connect_and_fetch(context.get_state().sui.selected_address).catch(
          error => console.error(error),
        ),
      )

      state_iterator().reduce(
        async (last_address, { sui: { selected_address } }) => {
          const address_changed = last_address !== selected_address

          if (address_changed) {
            disconnect_ws('ADDRESS_CHANGED')
            return await connect_and_fetch(selected_address)
          }

          return selected_address
        },
      )
    },
  }
}
