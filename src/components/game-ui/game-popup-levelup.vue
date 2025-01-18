<template lang="pug">
  .game-popup
    .popup
      .header
        span.name {{ t('APP_CHARACTER_LEVELUP_TITLE') }}
      .container
        .text
          p {{ t('APP_CHARACTER_LEVELUP_INFO', { level: props.details.level}) }}
          p {{ t('APP_CHARACTER_LEVELUP_DESC', { points: props.details.levels_taken * 5, spellPoints: props.details.levels_taken }) }}
          .button(@click="() => closeModal()") {{ t('APP_CHARACTER_LEVELUP_CLOSE') }}
  </template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps(['isOpen', 'details']);
const emit = defineEmits(['update:isOpen']);

function closeModal() {
  emit('update:isOpen', false);
}
</script>

<style lang="stylus" scoped>
.game-popup
  position absolute
  z-index 1
  display flex
  align-items center
  justify-content center
  width 80%
  max-width 900px
  overflow-y auto
  padding-right 10px
  color #514a3c
  pointer-events none !important
  user-select none !important
  overflow-y auto
  .popup
    pointer-events all
    width 500px
    border 3px solid #514a3c
    border-radius 12px
    overflow hidden
    .header
      position relative
      padding .2em .3em
      background #514a3c
      .name
        font-size 1.2em
        font-weight bold
        color #ffffff
    .container
      background #beb998
      height 100%
      .text
        display flex
        flex-flow wrap
        justify-content space-between
        align-items center
        justify-content center
        padding 1rem
        p
          font-size 1.1em
          margin 0
          padding 0
          text-align center
          padding-bottom .75rem
        .button
          display flex
          align-items center
          justify-content center
          background-color #ff6100
          color #fff
          border-radius 16px
          border solid 2px #514a3c
          min-width 120px
          padding 2px 24px
          cursor pointer
</style>
