<template lang="pug">
    .game-stats
      .stats
        //- .button-close Fermer
        .header
          span.name Résultat du combat - Nombre de tours : 1
        .container
          .section
            .title Gagnants
            div.table-container
              table
                thead
                  tr
                    th(style="width: 15%;") Nom
                    th(style="width: 5%;") Niv.
                    th(style="width: 20%;") XP gagnée
                    th(style="width: 10%;") SUI
                    th(style="width: auto;") Objets gagnés
                tbody
                  tr
                    td
                      div.player
                        div.avatar
                        div.username Stony
                    td 1
                    td
                      div.xp-bar
                        div.progress(style="width: 75%;") 75
                    td 0
                    td
                      div.item-icon
          .section
            .title Perdants
            div.table-container
              table
                thead
                  tr
                    th(style="width: 15%;") Nom
                    th(style="width: 5%;") Niv.
                    th(style="width: 20%;") XP gagnée
                    th(style="width: 10%;") SUI
                    th(style="width: auto;") Objets gagnés
                tbody
                  tr
                    td
                      div.player
                        div.avatar
                        div.username Sceat
                    td 30
                    td
                      div.xp-bar
                        div.progress(style="width: 0%;")
                    td 0
                    td
          .buttons
            vs-button.accept(icon color="#ff6100")
              div Fermer
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

const result_fight = ref([
  {
    avatar: "https://assets.aresrpg.world/classe/senshi_male.jpg",
    health: 100,
    isCurrent: false,
    myself: true,
    name: 'Stony'
    },
    {
    avatar: "https://assets.aresrpg.world/classe/senshi_male.jpg",
    health: 100,
    isCurrent: false,
    myself: true,
    name: 'Stony'
    },
]
</script>

<style lang="stylus" scoped>

.game-stats
  position relative
  display flex
  // width 80%
  // max-width 900px
  // overflow-y auto
  padding-right 10px
  color var(--primary)
  pointer-events none !important
  user-select none !important
  // overflow-y auto
  .button-close
    position absolute
    background-color #ff6100
    color #fff
    border-radius 0px 0px 12px 12px
    border solid 3px #fff
    bottom -34px
    right 80px
    padding 2px 24px
    cursor pointer
  .stats
    pointer-events: all;
    width 950px
    border 3px solid var(--primary)
    border-radius 12px
    overflow hidden
    overflow-y auto
    .header
      position relative
      padding .2em .75rem
      background var(--primary)
      .name
        font-size 1.1em
        font-weight bold
        color #ffffff
    .container
      background var(--secondary)
      // height 100%
      padding-bottom .5rem
      > div
        padding .2rem .75rem
      .buttons
        display flex
        justify-content right
        > *
          margin-top .5rem
      .section:not(:first-child)
        padding-top 0.6rem
      .section
        // padding .2rem .75rem
        .title
          font-size 1.2em
          font-weight bold
          color var(--primary)
          padding .2em 0em
      .table-container
        table
          border-collapse collapse
          width 100%
          box-shadow var(--primary) 0px 1px 4px 2px
          th, td
            border-right 2px solid #918d77cc // This color is custom
            border-bottom 0
            background-color var(--secondary)
            padding 2px 8px
            text-align center

          th:last-child, td:last-child, th
            border-right none
          th
            background-color var(--primary)
            color #fff
        .player
          display flex
          align-items center
          .avatar
            width 32px
            height 32px
            background-image url('https://assets.aresrpg.world/classe/senshi_male.jpg')
            background-size cover
            // border-radius 50%
            margin-right 0.3rem
          .username
            // font-weight bold // myself ?
            color var(--primary)

        .xp-bar
          position relative
          height 16px
          width 100%
          background-color #4c3d2b
          border-radius 8px
          overflow hidden

          .progress
            height 12px
            min-width: 10px;
            margin-left: 2px;
            margin-top: 2px;
            background-color #ff6100
            border-radius 10px
            color #fff
            font-size 12px
            text-align center
            line-height 16px
            display flex
            justify-content center
            align-items center

      .item-icon
        width 24px
        height 24px
        background-image url('https://api-testnet.suifrens.sui.io/suifrens/0x0b6af83681935f795953d634718bcb3d16b7bf5c155eb20400ecb85cdd5086a1/svg')
        background-size contain
        background-repeat no-repeat
        margin-right 0.3rem
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
</style>
