import { translate } from '../../i18n.js'
import toast from '../../toast.js'
import { context } from '../game/game.js'

/** @type {Type.Module} */
export default function () {
  return {
    observe() {
      context.events.on('packet/failure', ({ message }) => {
        switch (message) {
          case 'ITEM_NOT_FOUND':
          case 'ITEM_NOT_HANDLED':
          case 'INTERNAL_ERROR':
          case 'CHARACTERS_LIMIT':
          case 'INVALID_TRANSACTION_TYPE':
          default:
            toast.error(translate('PLAYER_UNHANDLED_ERROR'), message)
        }
      })
    },
  }
}
