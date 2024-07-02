<template lang="pug">
.ui
  .top
    .no-characters
    zoneVue
    characterSelectVue
    wsConnectBtnVue
  .middle
    gameInventory(v-if="inventory_opened")
    gameStats(v-if="stats_opened")
  .bottom_panel
    gameChat
    gameHealth(
      @open_inventory="open_inventory"
      @open_stats="open_stats"
      @open_spells="open_spells"
    )
    gameSpellbar
</template>

<script setup>
import { ref } from 'vue';

import characterSelectVue from './character-select.vue';
import wsConnectBtnVue from './ws-connect-btn.vue';
import zoneVue from './zone.vue';
import gameChat from './game-chat.vue';
import gameHealth from './game-health.vue';
import gameSpellbar from './game-spellbar.vue';
import gameInventory from './game-inventory.vue';
import gameStats from './game-stats.vue';

const stats_opened = ref(false);
const spells_opened = ref(false);
const inventory_opened = ref(false);

function open_inventory() {
  if (stats_opened.value) stats_opened.value = false;
  if (spells_opened.value) spells_opened.value = false;
  inventory_opened.value = !inventory_opened.value;
}

function open_stats() {
  if (inventory_opened.value) inventory_opened.value = false;
  if (spells_opened.value) spells_opened.value = false;
  stats_opened.value = !stats_opened.value;
}

function open_spells() {
  if (inventory_opened.value) inventory_opened.value = false;
  if (stats_opened.value) stats_opened.value = false;
  spells_opened.value = !spells_opened.value;
}
</script>

<style lang="stylus" scoped>
.ui
  >*
    position absolute
  .top
    width 100vw
    height 70px
    left 0
    top 0
    text-shadow 1px 2px 3px black
    display flex
    flex-flow row nowrap
    justify-content center
    align-items center
    pointer-events none
    > *
      pointer-events all
    .server
      font-size .8em
      color #EEEEEE
    align-items center
  .middle
    pointer-events none
    width calc(100vw - 50px)
    right 0
    bottom 190px
    top 70px
    display flex
    justify-content center
    align-items center
    > *
      pointer-events all
  .bottom_panel
    width calc(100vw - 50px)
    right 0
    bottom 0
    pointer-events none
    display grid
    grid "chat health slots" 1fr / 1fr max-content 1fr
    place-items end center
    grid-gap .5em
    padding .5em
    > *
      pointer-events all
</style>
