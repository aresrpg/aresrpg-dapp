<template lang="pug">
.game-stats
  .stats
    .header
      span.name Informations
    .container
      .text
        p Tu passes niveau 2
        p Tu gagnes 5 points pour faire évoluer tes caractéristiques et 1 point pour tes sorts.
        .button Ok
</template>

<script setup>
import { ref, inject, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  context,
  current_sui_character,
} from '../../core/game/game.js';

// @ts-ignore
import RadixIconsCross2 from '~icons/radix-icons/cross-2';
// @ts-ignore
import FluentCheckmark12Regular from '~icons/fluent/checkmark-12-regular';

const selected_character = inject('selected_character');
const character = current_sui_character(context.get_state());

const { t } = useI18n();

</script>

<style lang="stylus" scoped>

.game-stats
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
  .stats
    pointer-events: all;
    width 500px
    border 3px solid #514a3ccc
    border-radius 12px
    overflow hidden
    .header
      position relative
      padding .2em .3em
      background #514a3ccc
      .name
        font-size 1.2em
        font-weight bold
        color #ffffff
    .container
      background #beb998cc
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
          border solid 2px #514a3ccc
          min-width 120px
          padding 2px 24px
          cursor pointer
        
</style>
