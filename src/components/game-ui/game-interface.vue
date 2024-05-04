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
    gameHealth
    gameSpellbar
</template>

<script setup>
import characterSelectVue from './character-select.vue';
import wsConnectBtnVue from './ws-connect-btn.vue';
import zoneVue from './zone.vue';
import gameChat from './game-chat.vue';
import gameHealth from './game-health.vue';
import gameSpellbar from './game-spellbar.vue';
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
    pointer-events none
    > *
      pointer-events all
    .server
      font-size .8em
      color #EEEEEE
  .bottom_panel
    width calc(100vw - 50px)
    right 0
    bottom 0
    pointer-events none
    display grid
    grid "chat health slots" 1fr / 1fr max-content 1fr
    place-items end center
    grid-gap .5em
    padding .5em
    > *
      pointer-events all
</style>
