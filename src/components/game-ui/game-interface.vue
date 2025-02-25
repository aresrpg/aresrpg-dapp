<template lang="pug">
.ui
  .top
    .no-characters
    zoneVue
    characterSelectVue
  .middle
    gameInventory(v-if="inventory_opened")
    gameCharacteristic(v-if="stats_opened")
    gameSpell(v-if="spells_opened")
    gamePopupLevelup(v-if="levelup_dialog" v-model:isOpen="levelup_dialog" :details="levelup_details")
    gameFightTimeline
  .bottom_panel
    gameChat
    gameHealth(
      @open_inventory="open_inventory"
      @open_stats="open_stats"
      @open_spells="open_spells"
    )
    gameFightCharacterOverview(v-if="fight_character_overview && in_fight") 
    gameSpellbar(v-else)
</template>

<script setup>
import { inject, onMounted, onUnmounted, ref } from 'vue';

import characterSelectVue from './character-select.vue';
import zoneVue from './zone.vue';
import gameChat from './game-chat.vue';
import gameHealth from './game-health.vue';
import gameSpellbar from './game-spellbar.vue';
import gameFightCharacterOverview from './game-fight-character-overview.vue';
import gameInventory from './game-inventory.vue';
import gameCharacteristic from './game-characteristic.vue';
import gameSpell from './game-spells.vue';
import gamePopupLevelup from './game-popup-levelup.vue';
import gameFightTimeline from './game-fight-timeline.vue'
import { context } from '../../core/game/game';

const in_fight = inject('in_fight')
const fight_character_overview = inject('fight_character_overview')
const stats_opened = ref(false);
const spells_opened = ref(false);
const inventory_opened = ref(false);
const levelup_dialog = ref(false);
const levelup_details = ref({});

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

function open_popup_levelup(details) {
  levelup_details.value = details;
  levelup_dialog.value = true;
}

onMounted(() => {
  context.events.on('LEVEL_UP', open_popup_levelup);
});

onUnmounted(() => {
  context.events.off('LEVEL_UP', open_popup_levelup);
});
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
