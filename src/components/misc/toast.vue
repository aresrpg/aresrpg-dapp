<template lang="pug">
div.notification-loader
  .spin
    LoadingSpinner(:status="status")
  .left
    .title {{ title }}
    .text {{ text }}
  .right(v-if="button")
    vs-button(@click="button_action" type="gradient" size="small" color="#2196F3") {{ button_text }}
</template>

<script setup>
import { VsButton } from 'vuesax-alpha';

import LoadingSpinner from './control-spinner.vue';

const props = defineProps({
  status: String,
  text: String,
  title: String,
  button: {
    type: Boolean,
    default: false,
  },
  button_action: {
    type: Function,
    default: () => {},
  },
  button_text: {
    type: String,
    default: 'Button Text',
  },
});
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
    padding-right .5em
    .title
      font-size .7em
      font-weight bold
      text-transform uppercase
    .text
      font-size .8em
      opacity .7
  .right
    display flex
    justify-content center
    align-items center
</style>
