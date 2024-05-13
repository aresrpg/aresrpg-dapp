<template lang="pug">
.inventory-container
  vs-tooltip(v-for="item in items" :key="item.id")
    .content
      .amount(v-if="item.amount > 1") {{ item.amount }}
      img(:src="`/item/${item.item_type}.jpg`" @click="emits('open_item_description', item)")
    template(#content)
      span {{ item.name }}
</template>

<script setup>
const props = defineProps(['items']);
const emits = defineEmits(['open_item_description']);
</script>

<style lang="stylus" scoped>
.inventory-container
  min-height 300px
  display grid
  grid-gap .5em
  grid-template-columns repeat(auto-fill, 40px)
  grid-auto-rows 40px
  .content
    position relative
    .amount
      pointer-events none
      position absolute
      font-size .8em
      z-index 1
      top -2px
      left 0
      background rgba(black, .5)
      padding 0 4px
      display flex
      align-items center
      justify-content center
    img
      width 40px
      height @width
      object-fit contain
      border-radius 5px
      overflow hidden
      filter drop-shadow(1px 2px 3px black)
      cursor pointer
</style>
