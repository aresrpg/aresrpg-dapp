import { context, disconnect_ws } from '../game/game.js'
import {
  sui_get_locked_characters,
  sui_get_locked_items,
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

        context.dispatch('action/sui_data_update', update)
      }

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

                emitter.on('update', () => {
                  update_user_data({
                    update_locked_characters: true,
                    update_unlocked_characters: true,
                    update_balance: true,
                    update_locked_items: true,
                    update_unlocked_items: true,
                  })
                })

                // emitter.on('update', update_user_data)
                emitter.on('ItemEquipEvent', event => {
                  if (event.sender_is_me)
                    update_user_data({
                      update_locked_characters: true,
                      update_unlocked_items: true,
                    })
                })

                emitter.on('ItemUnequipEvent', event => {
                  if (event.sender_is_me)
                    update_user_data({
                      update_locked_characters: true,
                      update_unlocked_items: true,
                    })
                })

                emitter.on('CharacterCreateEvent', event => {
                  if (event.sender_is_me)
                    update_user_data({
                      update_unlocked_characters: true,
                    })
                })

                emitter.on('CharacterSelectEvent', event => {
                  if (event.sender_is_me)
                    update_user_data({
                      update_locked_characters: true,
                      update_unlocked_characters: true,
                    })
                })

                emitter.on('CharacterUnselectEvent', event => {
                  if (event.sender_is_me)
                    update_user_data({
                      update_locked_characters: true,
                      update_unlocked_characters: true,
                    })
                })

                emitter.on('CharacterDeleteEvent', event => {
                  if (event.sender_is_me)
                    update_user_data({
                      update_unlocked_characters: true,
                    })
                })

                emitter.on('StatsResetEvent', event => {
                  if (event.sender_is_me)
                    update_user_data({
                      update_locked_characters: true,
                      update_unlocked_items: true,
                    })
                })

                emitter.on('ItemMintEvent', event => {
                  if (is_kiosk_mine(event.kiosk_id))
                    update_user_data({
                      update_locked_items: true,
                    })
                })

                emitter.on('ItemWithdrawEvent', event => {
                  if (event.sender_is_me)
                    update_user_data({
                      update_locked_items: true,
                      update_unlocked_items: true,
                    })
                })
              })
              await update_user_data({
                update_locked_characters: true,
                update_unlocked_characters: true,
                update_balance: true,
                update_locked_items: true,
                update_unlocked_items: true,
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
              })
            }
          }

          return selected_address
        },
      )
    },
  }
}
