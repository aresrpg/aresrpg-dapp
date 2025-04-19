import { translate } from '../../i18n.js'
import toast from '../../toast.js'
import { context } from '../game/game.js'

/** @type {Type.Module} */
export default function () {
  return {
    observe() {
      context.events.on('packet/failure', ({ message }) => {
        switch (message) {
          case 'MISSING_FOOD':
            return toast.error(translate('APP_ITEM_FEED_NO_FOOD'))
          case 'ITEM_NOT_FOUND':
            return toast.error(translate('APP_PLAYER_ITEM_NOT_FOUND'))
          case 'ITEM_NOT_HANDLED':
            return toast.error(translate('APP_PLAYER_ITEM_NOT_HANDLED'))
          case 'INTERNAL_ERROR':
            return toast.error(translate('APP_INTERNAL_ERROR'))
          case 'CHARACTERS_LIMIT':
            return toast.error(translate('APP_CHARACTERS_LIMIT'))
          case 'INVALID_TRANSACTION_TYPE':
            return toast.error(translate('APP_INVALID_TRANSACTION_TYPE'))
          default:
            toast.error(translate('PLAYER_UNHANDLED_ERROR'), message)
        }
      })
    },
  }
}
