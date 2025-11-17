import { i18n } from '../../i18n.js'
import toast from '../../toast.js'

import { context, ws_status } from './game.js'

// @ts-ignore
import FluentEmojiSkull from '~icons/fluent-emoji/skull'

const { t } = i18n.global

let server_down_toast = null

export function notify_reconnected() {
  if (server_down_toast) {
    server_down_toast.update('success', t('WS_RECONNECTED'))
    server_down_toast = null
  }
}

export async function handle_server_error(reason) {
  if (!reason) {
    if (navigator.onLine) {
      // Show reconnect toast
      return false
    }
    if (!server_down_toast)
      server_down_toast = toast.tx(t('WS_CONNECTING_TO_SERVER'))
    server_down_toast.update('loading', t('WS_CONNECTING_TO_SERVER'))
    return true
  }

  switch (reason) {
    case 'User rejection':
      return false
    case 'ADDRESS_CHANGED':
    case 'USER_DISCONNECTED':
      return true
    case 'CONNECTION_NOT_APPROVED':
      console.error(
        'The app sent an indexer_request before the server approved the connection'
      )
      return false
    case 'ALREADY_ONLINE':
      toast.error(
        t('SERVER_ALREADY_ONLINE'),
        'Oh no!',
        "<i class='bx bx-key'/>"
      )
      return false
    case 'EARLY_ACCESS_KEY_REQUIRED':
      toast.error(
        t('SERVER_EARLY_ACCESS_KEY_REQUIRED'),
        'Oh no!',
        "<i class='bx bx-key'/>"
      )
      return false
    case 'MAX_PLAYERS':
      toast.info(t('SERVER_MAX_PLAYERS'), 'Suuuuu', "<i class='bx bxs-hot'/>")
      return false
    case 'SIGNATURE_TIMEOUT':
      if (ws_status.value === 'CLOSED')
        toast.error(
          t('SERVER_SIGNATURE_TIMEOUT'),
          'Aaaaaaaah 🫠',
          "<i class='bx bxs-timer'/>"
        )
      context.events.emit('SIGNATURE_NOT_VERIFIED')
      return false
    case 'INVALID_SIGNATURE':
      toast.error(t('SERVER_INVALID_SIGNATURE'))
      return false
    case 'CHARACTER_INVALID':
      toast.error(t('SERVER_MOVE_FIRST'))
      return true
    case 'CHARACTER_UNLOCKED':
      toast.error(t('SERVER_CHARACTER_UNLOCKED'), '...', FluentEmojiSkull)
      return false
    case 'CHARACTER_NOT_FOUND':
      toast.error(t('SERVER_CHARACTER_NOT_FOUND'))
      return false
    case 'INVALID_CONTRACT':
      toast.error(t('SUI_INVALID_CONTRACT'))
      return false
    case 'MAX_CHARACTERS_PER_PLAYER':
      toast.error(t('SERVER_MAX_CHARACTERS_PER_PLAYER'))
      return false
    default:
      toast.error(reason)
      return true
  }
}
