<template lang="pug">
div.loader(:class="status")
  div.spinner(v-if="status === 'loading'")
  component(v-else :is="status_icon" class="icon")
</template>

<script setup>
import { computed } from 'vue';

import TokenSui from '~icons/token/sui';
import GameIconsDeathStar from '~icons/game-icons/death-star';

const props = defineProps(['status']);

const status_icon = computed(() => {
  switch (props.status) {
    case 'success':
      return TokenSui;
    case 'error':
      return GameIconsDeathStar;
    default:
      return null;
  }
});
</script>

<style lang="stylus">
@keyframes l3
  0%
    inset: 0 35px 0 0
  50%
    inset: 0 0 0 0
  100%
    inset: 0 0 0 35px

.loader
  width: 65px
  height: 30px
  position: relative
  transition: opacity 0.5s ease-in-out

.spinner
  &:before
    content: ""
    position: absolute
    border-radius: 50px
    box-shadow: 0 0 0 3px inset #fff
    animation: l3 0.75s infinite alternate

.icon
  position: absolute
  top: 50%
  left: 50%
  transform: translate(-50%, -50%)
  opacity: 0
  transition: opacity 1s ease-in-out
  &.success
    color: rgb(92, 184, 92)
    font-size: 30px
    opacity: 1
  &.error
    color: rgb(217, 83, 79)
    font-size: 30px
    opacity: 1
</style>
