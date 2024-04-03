import { sui_sign_payload } from '../sui/client.js'
import { ares_client, context } from '../game/game.js'

/** @type {Type.Module} */
export default function () {
  return {
    reduce(state, { type, payload }) {
      if (type === 'action/set_online')
        return {
          ...state,
          online: payload,
        }

      return state
    },
    async observe({ events }) {
      const {
        i18n: {
          global: { t },
        },
      } = await import('../../main.js')

      events.on('packet/signatureRequest', async ({ payload }) => {
        const message = `${t('sign_message')}\n\n::${payload}`
        try {
          await sui_sign_payload(message)
          context.dispatch('action/set_online', true)
        } catch (error) {
          console.error('Failed to sign message:', error)
          context.dispatch('action/set_online', true)
          context.dispatch('action/set_online', false)
          ares_client.end('User rejection')
        }
      })
    },
  }
}
