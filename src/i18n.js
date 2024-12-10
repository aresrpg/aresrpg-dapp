import { createI18n } from 'vue-i18n'

// @ts-ignore
import en from './assets/translations/en.yaml'
// @ts-ignore
import fr from './assets/translations/fr.yaml'
// @ts-ignore
import jp from './assets/translations/jp.yaml'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  allowComposition: true, // you need to specify that!
  messages: {
    fr,
    en,
    jp,
  },
})

export const translate = i18n.global.t
