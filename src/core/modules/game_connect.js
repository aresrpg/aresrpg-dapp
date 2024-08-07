import { sui_sign_payload } from '../sui/client.js'
import { ares_client, context } from '../game/game.js'
import { i18n } from '../../i18n.js'

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
        global: { t },
      } = i18n

      events.on('packet/signatureRequest', async ({ payload }) => {
        const message = `${t('WALLET_SIGN_MESSAGE')}\n\n::${payload}`
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
