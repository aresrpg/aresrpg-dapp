<template lang="pug">
.health-container
  .health(@click="show_health_percent = !show_health_percent")
    .health-bar(:style="{ maxHeight: `${percent_health}%`}")
    .health-value-percent(v-if="show_health_percent") {{ percent_health }}%
    .health-value(v-else)
      .health-top {{ health }}
      .sep
      .health-bottom {{ max_health }}
  .pa
    img(src="/src/assets/statistics/action.png")
    .value {{ pa }}
  .pm
    img(src="/src/assets/statistics/movement.png")
    .value {{ pm }}
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { get_max_health } from '@aresrpg/aresrpg-sdk/stats';

import { context, current_character } from '../../core/game/game.js';

const show_health_percent = ref(false);
const health = ref(30);
const max_health = ref(30);
const pa = ref(12);
const pm = ref(6);

const percent_health = computed(() => {
  return Math.round((100 * health.value) / max_health.value);
});

function update_health(state) {
  const character = current_character(state);
  health.value = character.health;
  max_health.value = get_max_health(character);

  if (isNaN(max_health.value)) {
    max_health.value = 35;
  }
}

onMounted(() => {
  context.events.on('STATE_UPDATED', update_health);
  update_health(undefined);
});

onUnmounted(() => {
  context.events.off('STATE_UPDATED', update_health);
});
</script>

<style lang="stylus" scoped>
.health-container
  display grid
  height 150px
  grid "health ." 1fr "health pa" max-content "health pm" max-content / 120px max-content
  border-radius 12px
  margin .5em
  place-items center
  overflow hidden
  margin-top auto
  >*
    border 1px solid black
    background rgba(#212121, .6)
    img
      width 30px
      height @width
      object-fit contain
      padding .1em
  .health
    grid-area health
    width 100%
    height 100%
    display flex
    justify-content center
    align-items center
    border-radius 12px
    position relative
    overflow hidden
    .health-bar
      background linear-gradient(to top, #B71C1C, #cb2d3e, #ef473a)
      width 100%
      height 100%
      position absolute
      bottom 0
      left 0
      transition all .3s
    .health-value-percent
      z-index 1
    .health-value
      z-index 1
      display flex
      flex-flow column nowrap
      text-align center
      .sep
        border-top 1px solid #eee
        width 100%
  .pa, .pm
    display flex
    flex-flow row nowrap
    align-items center
    border-radius 12px
    margin .25em
    width 60px
    height 40px
    padding .1em
    .value
      margin-left auto
      margin-right .25em
      font-size .9em
      font-weight bold
      text-shadow 1px 1px 2px black
  .pa
    grid-area pa
  .pm
    grid-area pm
</style>
