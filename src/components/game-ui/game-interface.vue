<template lang="pug">
.ui
  .top
    .no-characters
    zoneVue
    characterSelectVue
    wsConnectBtnVue
  //- .top_right
  .bottom_panel
    .chat
    .infos
    .inventory
    .map
</template>

<script setup>
import { onMounted, onUnmounted, ref, reactive } from 'vue';

import characterSelectVue from './character-select.vue';
import wsConnectBtnVue from './ws-connect-btn.vue';
import zoneVue from './zone.vue';
</script>

<style lang="stylus" scoped>
.ui
  >*
    position absolute
  .top
    width 100vw
    height 70px
    left 0
    top 0
    text-shadow 1px 2px 3px black
    display flex
    flex-flow row nowrap
    justify-content center
    align-items center
    .server
      font-size .8em
      color #EEEEEE
  .bottom_panel
    background #212121
    opacity .7
    width 100vw
    height 150px
    bottom 0
    display grid
    display: grid;
    grid-template-columns: 1fr minmax(100px, 200px) 1fr minmax(100px, 200px)
    grid-template-areas "chat infos inventory map"

    .chat
      grid-area chat
      border 3px solid #F39C12
    .infos
      grid-area infos
      border 3px solid #3498DB
    .inventory
      grid-area inventory
      border 3px solid #9B59B6
    .map
      grid-area map
      border 3px solid #F1C40F

  .escape_menu
    position absolute
    background rgba(#212121, .5)
    top 50%
    left 50%
    transform translate(-50%, -50%)
    backdrop-filter blur(12px)
    padding 2em
    padding-bottom 1em
    border-radius 6px
    overflow hidden
    >*
      width 300px
      padding 1em .5em
      display flex
      margin-bottom 1em
    .keys
      opacity .6
</style>
