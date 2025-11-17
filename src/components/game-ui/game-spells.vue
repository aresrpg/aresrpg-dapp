<template lang="pug">
.game-spells
  .spellDetails(v-if="selected_class_data.spells?.[focus_spell]" :key="focus_spell")
    SpellCard(:spell="selected_class_data.spells[focus_spell]")
  .spells
    .header
      span.name {{ t('APP_CHARACTER_SPELL_TITLE') }}
    .container
      .spellCounter
        .div {{ t('APP_CHARACTER_SPELL_CAPITAL') }}
        .count 0
      .spellsHeaders
        .div {{ t('APP_CHARACTER_SPELL_LABEL_NAME') }}
        .div {{ t('APP_CHARACTER_SPELL_LEVEL') }}
      .list(
        v-for="(spell, key, index) in selected_class_data.spells"
        :key="key"
        :class="{ darkline: index % 2 === 0 }"
      )
        .spell(@click="() => focus_spell = spell.name.toLowerCase().replaceAll(' ', '_')")
          .icon
            img(:src="spell_icons[spell.icon]")
          .info
            .line
              .name {{ spell.name }}
              .level {{ t('APP_CHARACTER_SPELL_LEVEL') }} {{ spell.level }}
            .line
              .details {{ get_spell_by_level(spell, 0).cost }} PA | {{get_spell_by_level(spell, 0).range[0] }} - {{ get_spell_by_level(spell, 0).range[1] }} PO
              .cost {{ t('APP_CHARACTER_SPELL_NEXT_COST') }} : 1
      .right
        vs-button.cancel(icon color="#E74C3C" v-if="has_pending_allocated_spells" @click="cancel_pending_allocated_spells")
          RadixIconsCross2
        vs-button.accept(icon color="#2ECC71" v-if="has_pending_allocated_spells" @click="open_spells_dialog")
          FluentCheckmark12Regular
  /// spells dialog
  vs-dialog(v-model="spells_dialog" :loading="accept_loading")
    template(#header) {{ t('APP_CHARACTER_SPELL_USE_DIALOG_TITLE') }}
    i18n-t(keypath="APP_CHARACTER_SPELL_DESC")
      b.allocated_spells {{ pending_allocated_spells_count }}
    template(#footer)
      .dialog-footer
        vs-button(type="transparent" color="#E74C3C" @click="spells_dialog = false") {{ t('APP_CHARACTER_SPELL_CANCEL') }}
        vs-button(type="transparent" color="#2ECC71" @click="commit_spells") {{ t('APP_CHARACTER_SPELL_CONFIRM') }}
</template>

<script setup>
import { ref, inject, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { spell_icons } from './spell_icons.js'
import Spells from '@aresrpg/aresrpg-sdk/spells'
import SpellCard from './spell_card.vue'

import { characters_references } from '../../core/utils/game/spells.js'

import { context, current_sui_character } from '../../core/game/game.js'
import { decrease_loading, increase_loading } from '../../core/utils/loading.js'

// @ts-ignore
import RadixIconsCross2 from '~icons/radix-icons/cross-2'
// @ts-ignore
import FluentCheckmark12Regular from '~icons/fluent/checkmark-12-regular'

const selected_character = inject('selected_character')
const character = current_sui_character(context.get_state())

const selected_class_data = computed(() => {
  const character_ref = characters_references.find(
    (character) => character.type === selected_character.value._type
  )

  return {
    selected_character,
    ...character_ref,
    ...character,
    spells: Spells[selected_character.value.classe],
  }
})

const { t } = useI18n()

const focus_spell = ref(null)

const accept_loading = ref(false)

const pa = ref(-1)
const pm = ref(-1)
const allocated_spells = reactive({})

const spells_dialog = ref(false)

function get_spell_by_level(spell, level) {
  return spell.levels?.[level] || {}
}

function add_pending_allocated_spell(spell, amount) {
  allocated_spells[spell] = allocated_spells[spell] + amount || amount
}

function cancel_pending_allocated_spells() {
  Object.assign(allocated_spells, {})
}

const has_pending_allocated_spells = computed(() =>
  Object.values(allocated_spells).some(Boolean)
)

function get_pending_allocated_spell(spell) {
  return allocated_spells[spell] ?? 0
}

const pending_allocated_spells_count = computed(() =>
  Object.values(allocated_spells).reduce((acc, value) => acc + value, 0)
)

const can_upgrade = computed(() => {
  const { available_spell_points } = selected_character.value

  return available_spell_points - pending_allocated_spells_count.value > 0
})

function open_spells_dialog() {
  spells_dialog.value = true
}

async function commit_spells() {
  spells_dialog.value = false
  accept_loading.value = true
  increase_loading()

  try {
    // await sui_add_spells({
    //   character_id: selected_character.id,
    //   spells: allocated_spells,
    // });
  } catch (error) {
    console.error(error)
  } finally {
    decrease_loading()
    accept_loading.value = false
  }

  Object.assign(allocated_spells, {})
}
</script>

<style lang="stylus" scoped>

.game-spells
  display flex
  height 100%
  width 80%
  max-width 850px
  max-height 545px
  overflow-y auto
  padding-right 10px
  color var(--primary)
  pointer-events none !important
  user-select none !important
  overflow-y auto
  .spellDetails
    pointer-events all
    // background #edebdc
    background var(--primary)
    color white
    width 400px
    border var(--ui-border)
    border-radius 12px
    padding .5rem
  .spells
    pointer-events all
    width 400px
    border var(--ui-border)
    border-radius 12px
    display flex
    flex-flow column nowrap
    justify-content stretch
    overflow hidden
    min-height 545px
    // max-height 545px
    margin-left auto
    .header
      position relative
      display flex
      justify-content center
      padding .5rem
      background var(--primary)
      .name
        font-size 1.2em
        font-weight bold
        color #ffffff
        text-shadow 1px 2px 3px black
        width 100%
    .container
      background var(--secondary)
      height 100%
      > div
        display flex
        flex-flow row nowrap
        justify-content space-between
        align-items center
        padding 2px 0.5rem 2px 0.5rem
      .darkline
        background var(--tertiary);
      .spellCounter
        margin 0.2rem 0
        .count
          font-weight bold
      .spellsHeaders
        display flex
        justify-content space-between
        padding 0.2rem
        background var(--quaternary)
        color #fff
        font-weight bold
        .div
          flex 1
          text-align center
      .list
        // font-weight bold
        font-size .8em
        .spell
          display flex
          flex 1
          cursor pointer
          // align-items center
          // text-transform capitalize
          .info
            flex 1
            // display flex
            .line
              display flex
              justify-content space-between
              width 100%
              .name
                font-size 0.9rem
                line-height 22px
                font-weight bold
                color var(--primary)
              .level
                justify-content right
                align-items right
          .icon
            img
              width 42px
              height @width
              margin-right 6px
      .right
        display flex
        justify-content right
        .upgrade
            height 18px
            width 18px
            background #ff6100
            border-radius 3px
            margin-left 10px
            cursor pointer
            position relative
            &::before
              content '+'
              color #fff
              font-size 1.2em
              line-height 1.2em
              text-align center
              display block
              font-weight 100
              margin-top -3px
              margin-left -1px
            &.disabled
              background #ccc
              cursor not-allowed
.dialog-footer
  display flex
  justify-content flex-end
</style>
