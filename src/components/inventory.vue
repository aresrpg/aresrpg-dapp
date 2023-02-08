<script setup></script>

<template lang="pug">
.container
  .content
    .items Start doing quests to collect items..
</template>

<style lang="stylus" scoped>
.container
  display flex
  flex-flow column nowrap
  width 100%
  margin-left 2em
  border 1px solid #ECF0F1
  border-radius 12px
  overflow hidden
  position relative
  box-shadow 1px 2px 3px black
  color #ECF0F1
  .content
    display flex
    height 100%
    color #eee
    flex-flow column nowrap
    padding .5em
    justify-content center
    align-items center
</style>
