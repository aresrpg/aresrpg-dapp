<template lang="pug">
.game-stats
  .stats
    .stats-bg
    .header
      // @todo use image_url
      img(:src="`https://assets.aresrpg.world/classe/${selected_character.classe}_${selected_character.sex}.jpg`")
      span.name {{ selected_character.name }}
    .container
      .level {{ t('APP_CHARACTER_STAT_LEVEL') }} {{ level }}
      .energy.darkline
        .label {{ t('APP_CHARACTER_STAT_ENERGY') }}
        .progress
          div.progress-bar(:style="{ width: (selected_character.soul / 100) * 100 + '%' }")
      .experience
        .label {{ t('APP_CHARACTER_STAT_EXP') }}
        .progress
          // @todo calculate experience
          div.progress-bar(:style="{ width: level_percent + '%' }")
      .line.life.darkline
        .label
          img(src="../../assets/statistics/health.png")
          span {{ t('APP_CHARACTER_STAT_LIFE_POINT') }}
        div {{ selected_character.health }} / {{ supposed_max_health }}
      .line.PA
        .label
          img(src="../../assets/statistics/action.png")
          span {{ t('APP_CHARACTER_STAT_PA') }}
        div {{ pa }}
      .line.PM.darkline
        .label
          img(src="../../assets/statistics/movement.png")
          span {{ t('APP_CHARACTER_STAT_PM') }}
        div {{ pm }}
      .section {{ t('APP_CHARACTER_STAT_CHARACTERISTICS') }}
      .line.characteristic(
        v-for="(stat, key, index) in STATS"
        :key="key"
        :class="{ darkline: index % 2 === 0 }"
      )
        .label
          img(:src="stat.url")
          span {{ stat.label }}
        .leftStats
          div {{ calculate_stat_value(key) }}
          .upgrade(
            v-if="can_upgrade"
            @click="() => add_pending_allocated_stat(key, 1)"
          )
      .section.light
        div {{ t('APP_CHARACTER_STAT_CAPITAL') }}
        span {{  selected_character.available_points - pending_allocated_stats_count }}
          //- .btn(v-if="has_pending_allocated_stats" @click="cancel_pending_allocated_stats")
          //-   RadixIconsCross2
          //-   span Annuler
          //- .btn(v-if="has_pending_allocated_stats" @click="open_stats_dialog")
          //-   FluentCheckmark12Regular
          //-   span Valider
      .right
        vs-button.cancel(icon color="#E74C3C" v-if="has_pending_allocated_stats" @click="cancel_pending_allocated_stats")
          RadixIconsCross2
        vs-button.accept(icon color="#2ECC71" v-if="has_pending_allocated_stats" @click="open_stats_dialog")
          FluentCheckmark12Regular
  /// stats dialog
  vs-dialog(v-model="stats_dialog" :loading="accept_loading")
    template(#header) {{ t('APP_CHARACTER_STAT_USE_DIALOG_TITLE') }}
    i18n-t(keypath="APP_CHARACTER_STAT_DESC")
      b.allocated_stats {{ pending_allocated_stats_count }}
    template(#footer)
      .dialog-footer
        vs-button(type="transparent" color="#E74C3C" @click="stats_dialog = false") {{ t('APP_CHARACTER_STAT_CANCEL') }}
        vs-button(type="transparent" color="#2ECC71" @click="commit_stats") {{ t('APP_CHARACTER_STAT_CONFIRM') }}
</template>

<script setup>
import { ref, inject, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { get_max_health, get_total_stat } from '@aresrpg/aresrpg-sdk/stats'

import { sui_add_stats } from '../../core/sui/client.js'
import { context, current_sui_character } from '../../core/game/game.js'
import { decrease_loading, increase_loading } from '../../core/utils/loading.js'
import vitality_image from '../../assets/statistics/vitality.png'
import wisdom_image from '../../assets/statistics/wisdom.png'
import strength_image from '../../assets/statistics/strength.png'
import intelligence_image from '../../assets/statistics/intelligence.png'
import chance_image from '../../assets/statistics/chance.png'
import agility_image from '../../assets/statistics/agility.png'
// @ts-ignore
import {
  experience_to_level,
  level_progression,
} from '../../core/utils/game/experience.js'

// @ts-ignore
import RadixIconsCross2 from '~icons/radix-icons/cross-2'
// @ts-ignore
import FluentCheckmark12Regular from '~icons/fluent/checkmark-12-regular'

const selected_character = inject('selected_character')
const character = current_sui_character(context.get_state())
const supposed_max_health = character?._type ? get_max_health(character) : -1

const level = computed(() =>
  selected_character.value?.experience
    ? experience_to_level(selected_character.value?.experience)
    : 0
)

const level_percent = computed(() => {
  if (!selected_character.value) return 0
  const { experience_percent } = level_progression(
    selected_character.value.experience
  )
  return experience_percent
})

const { t } = useI18n()

const accept_loading = ref(false)

const STATS = {
  vitality: {
    label: t('APP_ITEM_VITALITY'),
    url: vitality_image,
  },
  wisdom: {
    label: t('APP_ITEM_WISDOM'),
    url: wisdom_image,
  },
  strength: {
    label: t('APP_ITEM_STRENGTH'),
    url: strength_image,
  },
  intelligence: {
    label: t('APP_ITEM_INTELLIGENCE'),
    url: intelligence_image,
  },
  chance: {
    label: t('APP_ITEM_CHANCE'),
    url: chance_image,
  },
  agility: {
    label: t('APP_ITEM_AGILITY'),
    url: agility_image,
  },
}
const default_stats = Object.keys(STATS).reduce(
  (acc, stat) => ({ ...acc, [stat]: 0 }),
  {}
)

const pa = ref(-1)
const pm = ref(-1)
const allocated_stats = reactive({ ...default_stats })

const stats_dialog = ref(false)

function add_pending_allocated_stat(stat, amount) {
  allocated_stats[stat] = allocated_stats[stat] + amount || amount
}

function cancel_pending_allocated_stats() {
  Object.assign(allocated_stats, { ...default_stats })
}

const has_pending_allocated_stats = computed(() =>
  Object.values(allocated_stats).some(Boolean)
)

function get_pending_allocated_stat(stat) {
  return allocated_stats[stat] ?? 0
}

const pending_allocated_stats_count = computed(() =>
  Object.values(allocated_stats).reduce((acc, value) => acc + value, 0)
)

const calculate_stat_value = (stat_key) => {
  const base_value = selected_character.value[stat_key]
  const pending_value = get_pending_allocated_stat(stat_key)
  const stat_amount = base_value + pending_value
  const equipment_stat = get_total_stat(character, stat_key) - base_value

  return `${stat_amount} ${equipment_stat > 0 ? '(+' + equipment_stat + ')' : ''}`
}

const can_upgrade = computed(() => {
  const { available_points } = selected_character.value

  return available_points - pending_allocated_stats_count.value > 0
})

function open_stats_dialog() {
  stats_dialog.value = true
}

async function commit_stats() {
  stats_dialog.value = false
  accept_loading.value = true
  increase_loading()

  try {
    await sui_add_stats({
      character_id: selected_character.id,
      stats: allocated_stats,
    })
  } catch (error) {
    console.error(error)
  } finally {
    decrease_loading()
    accept_loading.value = false
  }

  Object.assign(allocated_stats, { ...default_stats })
}
</script>

<style lang="stylus" scoped>

.game-stats
  display flex
  height 100%
  width 80%
  max-width 900px
  max-height 545px
  overflow-y auto
  padding-right 10px
  color var(--primary)
  pointer-events none !important
  user-select none !important
  overflow-y auto
  .stats
    pointer-events: all;
    width 350px
    border var(--ui-border)
    border-radius 12px
    display flex
    flex-flow column nowrap
    justify-content stretch
    overflow hidden
    min-height 545px
    // max-height 545px
    position relative
    z-index 1
    .stats-bg
      position absolute
      z-index -1
      right 0
      left 0
      top 0
      bottom 0
      background #969696
    .header
      position relative
      display flex
      justify-content center
      padding-top .5em
      padding-bottom 10px
      background var(--primary)
      // background var(--primary)
      .name
        font-size 1.2em
        font-weight bold
        color #ffffff
        text-shadow 1px 2px 3px black
        margin-left 100px
        width 100%
      img
        position absolute
        left 0
        width 80px
        border-radius 6px
        margin 0 8px 0 8px
        height @width
        cursor pointer
        &.selected
          background-color var(--primary)
          border solid 2px #cccccc
    .container
      background var(--secondary)
      height 100%
      > div
        display flex
        flex-flow row nowrap
        justify-content space-between
        align-items center
        padding 2px 0.5rem 2px 0.5rem
        .progress
          width 180px
          height 14px
          background var(--quaternary)
          border-radius 6px
          .progress-bar
            max-width 98%
            min-width 10px
            margin-left 2px
            margin-top 2px
            margin-bottom 3px
            height 9px
            background #ff6100
            border-radius 6px
            transition width .5s
      .level
        font-weight bold
        margin-left 100px
        margin-top 0.5em
        margin-bottom 10px
        padding 0

      .energy
        font-weight bold
        margin-top 6px
      .experience
        font-weight bold
      .darkline
        background var(--tertiary);
      .line
        font-weight bold
        .label
          display flex
          align-items center
          text-transform capitalize
          img
            width 18px
            height 100%
            margin-right 6px
      .right
        display flex
        justify-content right
      .section
        font-weight bold
        background var(--quaternary)
        color #fff
        display flex
        justify-content space-between
        > div
          display flex
          align-items center
          .btn
              height 18px
              font-size 0.8em
              background #ff6100
              border-radius 3px
              margin-left 10px
              cursor pointer
              display flex
              padding-right 5px
              align-items center
      .section.light
        background var(--quaternary)
        color #fff
      .characteristic
        font-weight bold
        .label
          img
            width 18px
            margin-right 6px
        .leftStats
          display flex
          align-items center
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
b.allocated_stats
  color #ff6100
.dialog-footer
  display flex
  justify-content flex-end
</style>
