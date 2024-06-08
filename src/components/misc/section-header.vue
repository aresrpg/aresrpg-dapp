<template lang="pug">
section.section-header
  .title {{ props.title }}
  vs-alert.desc(:color="props.color || '#2196F3'" v-if="props.desc") {{ props.desc }}
  .content(:class="{ rows }")
    slot
</template>

<script setup>
const props = defineProps(['title', 'desc', 'color', 'rows']);
</script>

<style lang="stylus" scoped>
section.section-header
  width 100%
  border-top 1px solid white
  display flex
  flex-flow column nowrap
  max-width 1400px
  .content
    display flex
    flex-flow column nowrap
    padding 1em 0
    justify-content space-evenly
    &.rows
      flex-flow row wrap
  >.title
    color #eee
    font-size .9em
    margin-bottom .5em
    margin-top .5em
    text-transform uppercase
    font-weight 900
  >.desc
    font-size .9em
    margin-bottom .5em
    position relative
    color #eee
</style>
