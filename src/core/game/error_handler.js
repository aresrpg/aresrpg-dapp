import toast from '../../toast.js'

import { context } from './game.js'

export const error_translations = {
  en: {
    ALREADY_ONLINE:
      'It seems you are already connected to the server, please wait a few seconds and try again',
    EARLY_ACCESS_KEY_REQUIRED:
      'You need an early access key to play on AresRPG',
    MAX_PLAYERS: `Sorry sir, the server is full and we don't yet have the capacity to handle that much players, please try again later`,
    SIGNATURE_TIMEOUT: 'Please sign the message faster!',
    INVALID_SIGNATURE: 'Invalid signature',
    NO_REASON: 'The server appears to be down, please try again later',
  },
  fr: {
    ALREADY_ONLINE:
      'Il semblerait que vous soyez déjà connecté au serveur, veuillez patienter quelques secondes et réessayer',
    EARLY_ACCESS_KEY_REQUIRED:
      "Vous avez besoin d'une clé beta pour jouer sur AresRPG",
    MAX_PLAYERS: `Désolé Sir, le serveur est plein et nous n'avons pas encore la capacité de gérer autant de joueurs, veuillez réessayer plus tard`,
    SIGNATURE_TIMEOUT: 'Veuillez signer le message plus rapidement!',
    INVALID_SIGNATURE: 'Signature invalide',
    NO_REASON:
      'Le serveur semble être hors ligne, veuillez réessayer plus tard',
  },
}

let t = null

export async function handle_server_error(reason) {
  if (!t) {
    const { i18n } = await import('../../main.js')
    // eslint-disable-next-line prefer-destructuring
    t = i18n.global.t
  }

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
      if (context.get_state().online)
        toast.error(
          t('SIGNATURE_TIMEOUT'),
          'Aaaaaaaah 🫠',
          "<i class='bx bxs-timer'/>",
        )
      break
    case 'INVALID_SIGNATURE':
      toast.error(t('INVALID_SIGNATURE'))
      break
    default:
      toast.error(reason)
  }
}
