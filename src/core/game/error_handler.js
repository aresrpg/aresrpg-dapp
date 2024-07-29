import { i18n } from '../../i18n.js'
import toast from '../../toast.js'

import { ws_status } from './game.js'

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
    if (!server_down_toast)
      server_down_toast = toast.tx(t('WS_CONNECTING_TO_SERVER'))
    server_down_toast.update('loading', t('WS_CONNECTING_TO_SERVER'))
    return
  }

  switch (reason) {
    case 'USER_DISCONNECTED':
      return
    case 'ALREADY_ONLINE':
      toast.error(
        t('SERVER_ALREADY_ONLINE'),
        'Oh no!',
        "<i class='bx bx-key'/>",
      )
      break
    case 'EARLY_ACCESS_KEY_REQUIRED':
      toast.error(
        t('SERVER_EARLY_ACCESS_KEY_REQUIRED'),
        'Oh no!',
        "<i class='bx bx-key'/>",
      )
      break
    case 'MAX_PLAYERS':
      toast.info(t('SERVER_MAX_PLAYERS'), 'Suuuuu', "<i class='bx bxs-hot'/>")
      break
    case 'SIGNATURE_TIMEOUT':
      if (ws_status.value === 'CLOSED')
        toast.error(
          t('SERVER_SIGNATURE_TIMEOUT'),
          'Aaaaaaaah 🫠',
          "<i class='bx bxs-timer'/>",
        )
      break
    case 'INVALID_SIGNATURE':
      toast.error(t('SERVER_INVALID_SIGNATURE'))
      break
    case 'CHARACTER_INVALID':
      toast.error(t('SERVER_MOVE_FIRST'))
      break
    case 'CHARACTER_UNLOCKED':
      toast.error(t('SERVER_CHARACTER_UNLOCKED'), '...', FluentEmojiSkull)
      break
    case 'INVALID_CONTRACT':
      toast.error(t('SUI_INVALID_CONTRACT'))
      break
    case 'MAX_CHARACTERS_PER_PLAYER':
      toast.error(t('SERVER_MAX_CHARACTERS_PER_PLAYER'))
      break
    default:
      toast.error(reason)
  }
}
