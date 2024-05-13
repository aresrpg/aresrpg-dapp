<template lang="pug">
.slot-container(:class="{ in_fight }")
  .item(v-for="({ name, icon }, index) in items" :key="index")
    img(v-if="icon" :src="icon" :alt="name")
    .shadow
</template>

<script setup>
import { ref, onMounted, inject, computed } from 'vue';

import stats from '../../assets/ui/stats.png';
import spells from '../../assets/ui/spells.png';
import inventory from '../../assets/ui/inventory.png';

const in_fight = inject('in_fight');

const selected_character = inject('selected_character');
const items = computed(() => {
  const spells = selected_character.value?.spells ?? [];
  const value = [...spells];

  if (value.length < 20) {
    for (let i = value.length; i < 20; i++) {
      value.push({ name: 'empty', icon: '' });
    }
  }
  return value;
});
</script>

<style lang="stylus" scoped>
.slot-container
  display grid
  height 150px
  border-radius 12px
  margin-left 0
  overflow hidden
  margin-top auto
  border 1px solid black
  background rgba(#212121, .6)
  place-self start
  max-width 700px
  width 100%
  min-width 300px
  grid-template-columns repeat(10, 1fr)
  grid-template-rows repeat(2, 1fr)
  grid-gap 5px
  padding .25em
  justify-content center
  align-items center
  opacity .3
  &.in_fight
    opacity 1
  .item
    border-radius: 5px  // Optional: Adds slightly rounded corners
    display flex
    justify-content center
    align-items center
    cursor pointer
    width 100%
    height @width
    min-width 40px
    max-width 70px
    min-height @min-width
    max-height @max-width
    overflow hidden
    position relative
    img
      width 100%
      height 100%
      object-fit cover
      z-index 0
    .shadow
      position absolute
      width 100%
      height 100%
      top 0
      left 0
      box-shadow: inset 0 0 15px 0 black
</style>
