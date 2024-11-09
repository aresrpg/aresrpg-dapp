<template lang="pug">
div.notification-loader
  .spin
    GameIconsCrocSword(v-if="icon === 'sword'")
    LoadingSpinner(:status="status" v-else)
  .left
    .title {{ title }}
    .text {{ text }}
    a.tx-link(
      v-if="props.digest"
      :href="`https://suiscan.xyz/${NETWORK}/tx/${props.digest}`"
      target="_blank"
      rel="noopener noreferrer"
    ) {{ props.digest }}
  .right(v-if="button")
    vs-button(@click="button_action" type="gradient" size="small" color="#43A047") {{ button_text }}
</template>

<script setup>
import { VsButton } from 'vuesax-alpha';

import { NETWORK } from '../../env.js';

import LoadingSpinner from './control-spinner.vue';

import GameIconsCrocSword from '~icons/game-icons/croc-sword';

const props = defineProps({
  status: String,
  text: String,
  icon: String,
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
  digest: {
    type: String,
    default: '',
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
    .tx-link
      font-size .7em
      color #ddd
      text-decoration underline
      opacity .7
      &:hover
        color #2980B9
  .right
    display flex
    justify-content center
    align-items center
</style>
