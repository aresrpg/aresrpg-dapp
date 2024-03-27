<template lang="pug">
sectionContainer
</template>

<script setup>
import sectionContainer from '../components/misc/section-container.vue';
</script>

<style lang="stylus" scoped>
.vs-switch
  display flex
  align-items center
  span
    padding-right .25em

.bx-message-square-check
  font-size 2em
  color #2ECC71
  filter drop-shadow(1px 2px 3px #2ECC71)

.bx-no-entry
  font-size 2em
  color #E74C3C
  filter drop-shadow(1px 2px 3px #E74C3C)

.disabled
  opacity .5

.section-item
  display flex
  flex-flow row nowrap
  align-items center
  margin-bottom .5em
  img
    width 30px
    height @width
    object-fit contain
    margin-right .5em
    filter drop-shadow(1px 2px 3px black)
  .title
    padding-right 1em
    width 150px
    font-size .875em
</style>
