<script setup>
import { inject } from 'vue';

const server_info = inject('server-info');
</script>

<template lang="pug">
.container
  .banner
  .content
    .name Unique players: #[b {{ server_info.registrations ?? 0 }}]
    .quests
</template>

<style lang="stylus" scoped>
.container
  display flex
  flex-flow column nowrap
  width 300px
  border 1px solid #ECF0F1
  border-radius 12px
  overflow hidden
  position relative
  box-shadow 1px 2px 3px black
  color #ECF0F1
  .banner
    background url('../assets/ice_dragon.gif') center / cover
    width 100%
    height 100px
    border-bottom 1px solid #ECF0F1
  .content
    display flex
    flex-flow column nowrap
    padding .5em
    .name
      text-transforum uppercase
      font-size .8em
      display flex
      align-items baseline
      b
        color #F39C12
        padding-left .25em
        font-size 1.1em
</style>
