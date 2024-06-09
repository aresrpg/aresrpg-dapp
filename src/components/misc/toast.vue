<template lang="pug">
div.notification-loader
  .spin
    LoadingSpinner(:status="status")
  .left
    .title {{ title }}
    .text {{ text }}
</template>

<script setup>
import { defineProps } from 'vue';

import LoadingSpinner from './control-spinner.vue';

const props = defineProps(['status', 'text', 'title']);
</script>

<style lang="stylus" scoped>
.notification-loader
  display flex
  flex-flow row nowrap
  justify-content space-evenly
  align-items center
  transition all .3s ease-in-out
  padding .25em .5em
  .spin
    width 50px
    height @width
    display flex
    justify-content center
    align-items center
  .left
    display flex
    flex-flow column nowrap
    .title
      font-size .7em
      font-weight bold
      text-transform uppercase
    .text
      font-size .8em
      opacity .7
</style>
