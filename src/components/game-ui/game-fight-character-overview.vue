<template lang="pug">
.slot-container(:class="{ in_fight }")
  img(:src="fight_character_overview.avatar" alt="stats")
  div 
    .name {{ fight_character_overview.name }}
    .stats 
      div {{ fight_character_overview.health }}
      img(src="../../assets/statistics/health.png")
    //- div {{ fight_character_overview }}
</template>

<script setup>
import { ref, onMounted, inject, computed } from 'vue';

import stats from '../../assets/ui/stats.png';
import spells from '../../assets/ui/spells.png';
import inventory from '../../assets/ui/inventory.png';

const in_fight = inject('in_fight');

const fight_character_overview = inject('fight_character_overview');

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
console.log("fight_character_overview", fight_character_overview.value)
</script>

<style lang="stylus" scoped>
.slot-container
  display flex
  gap 10px
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
  grid-gap 5px
  padding .25em
  opacity .3
  &.in_fight
    opacity 1
  > img
    max-width 160px
    max-height 160px
    min-height 150px
    z-index 0
    margin-top -5px
    margin-left -10px
  > div
    width 100%
  div
    color white
    .name
      font-size 1.2em
      font-weight bold
    .stats 
      display flex
      align-items center
      gap 10px
      img 
        height 16px
</style>
