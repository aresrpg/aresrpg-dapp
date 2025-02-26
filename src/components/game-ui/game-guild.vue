<template lang="pug">
    .game-guild
      .guild
        .header
          span.name Guilde 'Test'
        .container
          div.bar_search
            div 
              div Niveau 1
              div.exp
                div Expérience
                div.progress
                  div.progress-bar(:style="{ width: '1%' }")
            div.right
              div LOGO
          div.tabs
            //- div tabs
            Tabs(:spaced="true" :nobg="true" :noborder="true" :tabs="{Membres: {}, Personnalisation: {}, Percepteurs: {}}")
              template(#tab="{ tab, active }")
                div.tab {{ tab }}
              template( #content="{ data }")
                div.table-container
                  table
                    thead
                      tr
                        th(style="width: 45%;") Nom
                        th(style="width: 15%;") Rang
                        th(style="width: 10%;") Niv.
                        th(style="width: 10%;") % XP
                        th(style="width: 15%;") XP gagnée
                    tbody
                      tr
                        td
                          div.player
                            div.avatar
                            div.username Stony
                        td Meneur
                        td 1
                        td 90%
                        td 0
    </template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import Tabs from './tabs.vue';

const { t } = useI18n();

const stop_propagation = event => { event.stopPropagation(); };
</script>

<style lang="stylus" scoped>
        .exp
          display flex
          gap 30px
          justify-content center
          align-items center
          > div:nth-child(1)
            font-weight bold
        .progress
          width 180px
          height 14px
          background #50493c
          border-radius 6px
          padding-top 1px
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
    *
      .table-container
        margin-top -17px
        margin-left -4px
        background-color #beb999 !important
        padding 10px 10px
        /* margin-top -17px
        margin-left -4px */
        width 100%
        height 100%
        table
          border-collapse collapse
          width 100%
          /* box-shadow #514a3c 0px 1px 4px 2px */
          th, td
            border-right 2px solid #918d77cc // This color is custom
            border-bottom 0
            background-color #b5ac8d
            padding 2px 8px
            /* text-align center */

          // Retirer la bordure gauche pour la première cellule de chaque ligne
          // th:first-child, td:first-child, th
            // border-left none

          // Retirer la bordure droite pour la dernière cellule de chaque ligne
          th:last-child, td:last-child, th
            border-right none
          th
            background-color #514a3c
            color #fff
    .search_button
      display flex
      justify-content center
      align-items center
    .search_input
      margin 4px 0px
      background-color #aaa788
      padding 4px 8px
      color #514a3c
      border 0px
    .bar_search
      /* background-color #beb999 */
      display flex
      width 85%
      margin 10px 0px
      border-radius 0px 12px 12px 0px
      .right
        display flex
    .tab_content
      margin-top -17px
      margin-left -4px
      width 100%
      background-color #beb999 !important
    .tabs 
      /* background-color #beb999 */
      width 100%
      height 380px
    .tab
        margin-right 8px
        font-size 16px
        background-color #514a3c
        padding 2px 16px
        color white
    .game-guild
      display flex
      height 100%
      width 80%
      max-width 750px
      max-height 545px
      overflow-y auto
      padding-right 10px
      color #514a3c
      pointer-events none !important
      user-select none !important
      overflow-y auto
      .guild
        pointer-events: all;
        width 750px
        border 3px solid #ffffff
        border-radius 12px
        display flex
        flex-flow column nowrap
        justify-content stretch
        overflow hidden
        min-height 545px
        // max-height 545px
        .header
          position relative
          display flex
          justify-content center
          padding-top .5em
          /* padding-bottom 10px */
          background #514a3ccc
          .name
            font-size 1.2em
            font-weight bold
            color #ffffff
            text-shadow 1px 2px 3px black
            margin-left 12px
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
              background-color #514a3ccc
              border solid 2px #cccccc
        .container
          background #beb998cc
          height 100%
          > div
            display flex
            flex-flow row nowrap
            justify-content space-between
            align-items center
            padding 2px 0.5rem 2px 0.5rem
    </style>