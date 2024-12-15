<template lang="pug">
.health-container(:class="{ in_fight }")
  img.open_stats(src="../../assets/ui/stats.png" @click="emits('open_stats')")
  img.open_spells(src="../../assets/ui/spells.png" @click="emits('open_spells')")
  img.open_inventory(src="../../assets/ui/inventory.png" @click="emits('open_inventory')")
  .health(:class="{ in_fight }" @click="show_health_percent = !show_health_percent")
    .health-bar(:style="{ maxHeight: `${percent_health}%`}")
      img.sit(v-if="!in_fight" src="../../assets/ui/sit.png" @click.stop="sit_action")
    .health-value-percent(v-if="show_health_percent") {{ percent_health }}%
    .health-value(v-else)
      .health-top {{ health }}
      .sep
      .health-bottom {{ max_health }}
  .pa(:class="{ in_fight }")
    img(src="/src/assets/statistics/action.png")
    .value {{ pa }}
  .pm(:class="{ in_fight }")
    img(src="/src/assets/statistics/movement.png")
    .value {{ pm }}
</template>

<script setup>
import { ref, onMounted, computed, inject } from 'vue';
import { get_max_health } from '@aresrpg/aresrpg-sdk/stats';

import { context, current_three_character } from '../../core/game/game.js';

const selected_character = inject('selected_character');
const inventory_counter = inject('inventory_counter');
const show_health_percent = ref(false);

const pa = computed(() => selected_character.value?.action || -1);
const pm = computed(() => selected_character.value?.movement || -1);

const in_fight = inject('in_fight');

const emits = defineEmits(['open_stats', 'open_spells', 'open_inventory']);
const health = computed(() => selected_character.value?.health || 0);
const max_health = computed(() => {
  // a update to this variables means the equipment changed
  // so the max health might have been affected
  if (inventory_counter.value) {
    // nothing to do here, we just need to trigger the computed
  }

  return health.value ? get_max_health(selected_character.value) : 0;
});
const percent_health = computed(() => {
  return Math.round((100 * health.value) / max_health.value);
});

function sit_action() {
  const character = current_three_character();
  if (character.action === 'SIT') {
    context.dispatch('action/character_action', {
      action: 'IDLE',
      id: character.id,
    });
  } else {
    context.dispatch('action/character_action', {
      action: 'SIT',
      id: character.id,
    });
  }
}
</script>

<style lang="stylus" scoped>
.health-container
  display grid
  height 160px
  grid "stats spells inventory" 1fr "health health pa" max-content "health health pm" max-content / 1fr 1fr 1fr
  border-radius 12px
  margin-left 0
  place-items center
  place-self start center
  overflow hidden
  margin-top auto
  user-select none
  >img
    filter drop-shadow(1px 2px 3px black)
    width 50px
    object-fit contain
    place-self center
    cursor pointer

  .open_stats
    grid-area stats
  .open_spells
    grid-area spells
  .open_inventory
    grid-area inventory
  .health
    cursor pointer
    border 1px solid black
    background rgba(#212121, .6)
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
      img.sit
        position absolute
        bottom 5px
        left 5px
        width 20px
        transform rotate(-10deg)
        filter drop-shadow(1px 2px 3px black)

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
    border 1px solid black
    background rgba(#212121, .6)
    display flex
    flex-flow row nowrap
    align-items center
    border-radius 12px
    margin .25em
    margin-right 0
    width 60px
    height 40px
    padding .1em
    opacity .3
    img
      width 30px
      height @width
      object-fit contain
      padding .1em
    &.in_fight
      opacity 1
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
