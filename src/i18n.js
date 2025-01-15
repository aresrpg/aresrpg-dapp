import { createI18n } from 'vue-i18n'
import yaml from 'js-yaml'

// Load YAML files as text using ?raw suffix
import enYaml from './assets/translations/en.yaml?raw'
import frYaml from './assets/translations/fr.yaml?raw'
import jpYaml from './assets/translations/jp.yaml?raw'

// Parse YAML strings to objects
const en = yaml.load(enYaml)
const fr = yaml.load(frYaml)
const jp = yaml.load(jpYaml)

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  allowComposition: true,
  messages: {
    fr,
    en,
    jp,
  },
})

export const translate = i18n.global.t
