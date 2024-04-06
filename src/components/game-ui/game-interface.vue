<template lang="pug">
.ui
  .top
    .no-characters
    zoneVue
    characterSelectVue
    wsConnectBtnVue
  //- .top_right
  .bottom_panel
    gameChat
    .infos
    .inventory
    .map
</template>

<script setup>
import characterSelectVue from './character-select.vue';
import wsConnectBtnVue from './ws-connect-btn.vue';
import zoneVue from './zone.vue';
import gameChat from './game-chat.vue';
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
    width calc(100vw - 50px)
    right 0
    bottom 0
    display grid
</style>
