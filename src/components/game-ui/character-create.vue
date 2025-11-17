<script setup>
import { inject, ref, watch, computed, provide, reactive } from 'vue'
import Spells from '@aresrpg/aresrpg-sdk/spells'
import { useI18n } from 'vue-i18n'

import {
  sui_create_character,
  sui_is_character_name_taken,
} from '../../core/sui/client.js'
import toast from '../../toast.js'
import { characters_references } from '../../core/utils/game/spells.js'
import { character_colors } from '../../core/utils/character_colors.js'

import characterCanvasDisplay from './character-canvas-display.vue'
import SpellDisplay from './menu_spell_display.vue'

const name_error = ref('')
const selected_class_type = ref('SENSHI_MALE')
const create_button_disabled = ref(false)

const new_character_name = ref('')

const new_character_dialog = inject('new_character_dialog')

const emits = defineEmits(['cancel'])
const { t } = useI18n()

const create_character_colors = reactive(character_colors)

provide('create_character_colors', create_character_colors)

const classe_type = computed(() => {
  const base = selected_class_type.value.split('_')[0].toLocaleLowerCase()
  if (selected_class_type.value.includes('FEMALE')) return `${base}_female`
  return base
})

const color1 = computed({
  get: () => create_character_colors[classe_type.value][0],
  set: (value) => (create_character_colors[classe_type.value][0] = value),
})

const color2 = computed({
  get: () => create_character_colors[classe_type.value][1],
  set: (value) => (create_character_colors[classe_type.value][1] = value),
})

const color3 = computed({
  get: () => create_character_colors[classe_type.value][2],
  set: (value) => (create_character_colors[classe_type.value][2] = value),
})

function get_character_skin({ classe, female }) {
  if (classe === 'SENSHI')
    return female
      ? 'https://assets.aresrpg.world/classe/senshi_female.jpg'
      : 'https://assets.aresrpg.world/classe/senshi_male.jpg'
  if (classe === 'yajin')
    return female
      ? 'https://assets.aresrpg.world/classe/yajin_female.jpg'
      : 'https://assets.aresrpg.world/classe/yajin_male.jpg'
}

const selected_class_data = computed(() => {
  const character = characters_references.find(
    (character) => character.type === selected_class_type.value
  )

  if (!character?.class) throw new Error('Invalid character type')

  return {
    ...character,
    spells: Spells[character.class],
  }
})

const name_too_long = computed(
  () => new_character_name.value.trim().length > 20
)
const name_invalid = computed(
  () => !new_character_name.value.trim().match(/^[a-zA-Z0-9-_]+$/)
)
const name_white_space = computed(
  () => !new_character_name.value.match(/^[a-zA-Z0-9-_]+$/)
)

function on_server_error({ code }) {
  switch (code) {
    case 'CREATE_CHARACTER_NAME_TAKEN':
      name_error.value = 'This name is already taken'
      break
    default:
      break
  }
}

watch(new_character_dialog, (value) => {
  if (!value) {
    new_character_name.value = ''
    name_error.value = ''
  }
})

watch(new_character_name, (value) => {
  if (value.length > 2 && name_too_long.value) {
    name_error.value = t('APP_CHARACTER_NAME_TOO_LONG')
  } else if (value.length > 2 && name_invalid.value) {
    name_error.value = t('APP_CHARACTER_NAME_INVALID')
  } else if (value.length > 2 && name_white_space.value) {
    name_error.value = t('APP_CHARACTER_NAME_WHITE_SPACE')
  } else if (value) name_error.value = ''
})

async function create_character() {
  create_button_disabled.value = true
  const female = selected_class_type.value.includes('FEMALE')
  const classe = selected_class_type.value.includes('SENSHI')
    ? 'senshi'
    : 'yajin'

  if (await sui_is_character_name_taken(new_character_name.value)) {
    name_error.value = t('APP_CHARACTER_NAME_TAKEN')
    create_button_disabled.value = false
    return
  }

  const tx = toast.tx(t('APP_CHARACTER_CREATE_TX'), new_character_name.value)

  try {
    cancel()
    const [color_1, color_2, color_3] =
      create_character_colors[`${classe}${female ? '_female' : ''}`]
    console.log('colors are', color_1, color_2, color_3)
    await sui_create_character({
      name: new_character_name.value,
      type: classe,
      male: !female,
      color_1,
      color_2,
      color_3,
    })
    tx.update('success', t('APP_CHARACTER_CREATE_OK'))

    new_character_name.value = ''
  } catch (error) {
    if (error) tx.update('error', t('APP_CHARACTER_CREATE_ERROR'))
    else tx.remove()
  }
  create_button_disabled.value = false
}

const is_character_name_valid = computed(
  () =>
    new_character_name.value.length > 3 &&
    new_character_name.value.length <= 20 &&
    new_character_name.value.match(/^[a-zA-Z0-9-_]+$/)
)

function cancel() {
  emits('cancel')
}
</script>

<template lang="pug">
vs-dialog(v-model="new_character_dialog" full-screen)
  .create_character
    .class_name {{ selected_class_data.name }}
    .slider
      .character(
        v-for="character in characters_references"
        :style="{ background: `url(${character.image}) center / cover` }"
        @click="() => selected_class_type = character.type"
        :class="{ selected: selected_class_type === character.type, disabled: character.disabled }"
      )
    .desc {{ selected_class_data.desc }}
    .perso
      characterCanvasDisplay(:type="selected_class_type")
    .right
      .spells
        SpellDisplay(:spells="selected_class_data.spells")
      .colors
        .color
          label(for="color1")
          input(type="color" id="color1" v-model="color1")
        .color
          label(for="color2")
          input(type="color" id="color2" v-model="color2")
        .color
          label(for="color3")
          input(type="color" id="color3" v-model="color3")
    vs-input.name(block placeholder="Enter your name" v-model="new_character_name" @keyup.enter="create_character")
      template(#message-danger v-if="name_error") {{ name_error }}
    vs-button.cancel(type="transparent" size="xl" color="#E74C3C" @click="cancel") {{ t('APP_CHARACTER_CANCEL_BUTTON') }}
    vs-button.create(
      type="transparent"
      size="xl"
      color="#2ECC71"
      @click="create_character"
      :disabled="!is_character_name_valid || create_button_disabled"
    ) {{ t('APP_CHARACTER_CREATE_BUTTON') }}
</template>

<style lang="stylus" scoped>
.create_character
  backdrop-filter blur(50px)
  display grid
  height calc(100vh - 80px)
  background rgba(#212121, .5)
  border-radius 12px
  overflow hidden
  place-items center center
  grid "title title title" 50px "slider slider slider" 4fr "desc perso spells" 4fr "cancel name create" 1fr / 1fr 1fr 1fr
  >*
    color #eeeeee
  .class_name
    grid-area title
    font-size 1.5em
    text-align center
    font-weight 900
    text-shadow 1px 2px 3px black
    text-transform uppercase
    place-self end center
  .slider
    grid-area slider
    place-self stretch
    margin 1em
    display flex
    flex-flow row nowrap
    justify-content center
    padding 0 5%
    .character
      border-bottom 3px solid black
      width 150px // adjust if necessary to fill the container width
      max-height 500px
      cursor pointer
      opacity .5
      position relative // For pseudo-element positioning
      // Adjust the clip-path to cover the gap; tweak the percentages as necessary
      clip-path polygon(40% 0, 100% 0, 65% 100%, 5% 100%)
      margin-left -60px
      filter drop-shadow(3px 1px 1px black)
      &::after
        content ''
        position absolute
        top 0
        right 0
        width 36%
        height 100%
        background white
        z-index 10
        clip-path polygon(90% 0, 100% 0, 65% 100%, 5% 100%)
      &:hover
        filter brightness(1.2)
      &.selected
        opacity 1
        // filter drop-shadow(1px 2px 3px black)
      &.disabled
        filter grayscale(100%)
        opacity .2
        cursor default
      &:first-child
        margin-left 0
        border-top-left-radius 6px
        border-bottom-left-radius 6px
        clip-path polygon(0 0, 100% 0, 65% 100%, 0 100%)
      &:last-child
        border-top-right-radius 6px
        border-bottom-right-radius 6px
        clip-path polygon(40% 0, 100% 0, 100% 100%, 5% 100%)
        &::after
          display none

  .desc
    grid-area desc
    margin 1em 3em
    padding 1em
    place-self stretch
    background rgba(0,0,0,0.5)
    border 1px solid #8b7355 // A border color that fits the game's aesthetic
    box-shadow 0 4px 8px rgba(0, 0, 0, 0.1) // Soft shadow for depth
    color #E0E0E0 // Light text for readability
    font-size 1.2em
    line-height 1.5
    overflow-y auto // Allows scrolling if the content is too long
    border-radius 6px // Slight rounding of corners

  .perso
    grid-area perso
    place-self stretch
    margin 1em
  .right
    grid-area spells
    place-self stretch
    margin 1em 3em
    .spells
      background rgba(0,0,0,0.2)
      border 1px solid #8b7355 // A border color that fits the game's aesthetic
      border-radius 6px // Slight rounding of corners
    .colors
      display flex
      flex-flow row wrap
      justify-content space-around
      margin 1em
      .color
        display flex
        flex-direction column
        align-items center
        margin 1em
        input[type="color"]
          width 50px
          height 50px
          border 1px solid #8b7355
          border-radius 5px
          cursor pointer
          &::-webkit-color-swatch-wrapper
            padding 0
          &::-webkit-color-swatch
            border none
            border-radius 5px

  .name
    grid-area name
    height 50px
    width 100%
    border-radius 6px
    margin 1em 2em
    padding 0 1em
    color #212121
    font-size 1.5em
    text-align center
  .cancel
    grid-area cancel
  .create
    grid-area create
</style>
