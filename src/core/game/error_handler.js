import { i18n } from '../../i18n.js'
import toast from '../../toast.js'

import { ws_status } from './game.js'

// @ts-ignore
import FluentEmojiSkull from '~icons/fluent-emoji/skull'

const { t } = i18n.global

export async function handle_server_error(reason) {
  if (!reason) {
    toast.error(
      t('NO_REASON'),
      'Can the dev do something?',
      "<i class='bx bx-error-circle'/>",
    )
    return
  }

  switch (reason) {
    case 'USER_DISCONNECTED':
      return
    case 'ALREADY_ONLINE':
      toast.error(t('ALREADY_ONLINE'), 'Oh no!', "<i class='bx bx-key'/>")
      break
    case 'EARLY_ACCESS_KEY_REQUIRED':
      toast.error(
        t('EARLY_ACCESS_KEY_REQUIRED'),
        'Oh no!',
        "<i class='bx bx-key'/>",
      )
      break
    case 'MAX_PLAYERS':
      toast.info(t('MAX_PLAYERS'), 'Suuuuu', "<i class='bx bxs-hot'/>")
      break
    case 'SIGNATURE_TIMEOUT':
      console.log('ws_status', ws_status.value)
      if (ws_status.value === 'CLOSED')
        toast.error(
          t('SIGNATURE_TIMEOUT'),
          'Aaaaaaaah 🫠',
          "<i class='bx bxs-timer'/>",
        )
      break
    case 'INVALID_SIGNATURE':
      toast.error(t('INVALID_SIGNATURE'))
      break
    case 'CHARACTER_INVALID':
      toast.error(t('MOVE_FIRST'))
      break
    case 'CHARACTER_UNLOCKED':
      toast.error(t('CHARACTER_UNLOCKED'), '...', FluentEmojiSkull)
      break
    case 'INVALID_CONTRACT':
      toast.error(t('INVALID_CONTRACT'))
      break
    case 'MAX_CHARACTERS_PER_PLAYER':
      toast.error(t('MAX_CHARACTERS_PER_PLAYER'))
      break
    default:
      toast.error(reason)
  }
}
