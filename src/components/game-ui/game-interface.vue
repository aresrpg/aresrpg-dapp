<template lang="pug">
.ui
  .top
    .no-characters
    zoneVue
    characterSelectVue
  .middle
    gameInventory(v-if="inventory_opened")
    gameCharacteristic(v-if="stats_opened")
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
import { inject, ref } from 'vue';

import characterSelectVue from './character-select.vue';
import zoneVue from './zone.vue';
import gameChat from './game-chat.vue';
import gameHealth from './game-health.vue';
import gameSpellbar from './game-spellbar.vue';
import gameInventory from './game-inventory.vue';
import gameCharacteristic from './game-characteristic.vue';
import { get_board_state, update_started } from '../../core/modules/game_terrain';
import { context, current_sui_character } from '../../core/game/game.js';
import { ENTITIES } from '../../core/game/entities.js';

const selected_character = inject('selected_character');

const stats_opened = ref(false);
const spells_opened = ref(false);
const inventory_opened = ref(false);

async function open_inventory() {
  if (stats_opened.value) stats_opened.value = false;
  if (spells_opened.value) spells_opened.value = false;
  inventory_opened.value = !inventory_opened.value;
  const boardState = get_board_state();
  console.log('boardState', boardState);

  // random between 0 & 5
  const randIndex = Math.floor(Math.random() * 5);

  const coord = boardState.sorted_start_pos.first[randIndex].pos;
  const coord2 = boardState.sorted_start_pos.second[randIndex].pos;

  const state = context.get_state();

  const player = current_sui_character(context.get_state());
  console.log('state', state, player, coord);

  // teleport player the coords
  context.dispatch('packet/characterPosition', {
    id: player.id,
    position: {
      x: coord.x + 0.5,
      y: player.position.y,
      z: coord.y + 0.5,
    },
  });
  const spawn_position = {
    x: coord2.x + 0.5,
    y: boardState.pos.y+1, //player.position.y,
    z: coord2.y + 0.5,
  };

  const spawned_mob = await ENTITIES['chafer']({
    id: 'test1',
    name: `test`,
  });
  // spawned_mob.position = spawn_position;
  spawned_mob.move(spawn_position);
  
  // const spawned_mob2 = await ENTITIES['afegg']({
  //   id: 'test',
  //   name: `test`,
  //   // scale_factor: 5,
  // });
  // spawned_mob.position = spawn_position;
  // spawned_mob2.move(player.position);
  // selected_character.value = boardState.characters[0];
}

function open_stats() {
  if (inventory_opened.value) inventory_opened.value = false;
  if (spells_opened.value) spells_opened.value = false;
  stats_opened.value = !stats_opened.value;
  update_started();
}

let notIso = true
function open_spells() {
  if (inventory_opened.value) inventory_opened.value = false;
  if (stats_opened.value) stats_opened.value = false;
  spells_opened.value = !spells_opened.value;
  if (notIso) {
    notIso = false;
    context.switch_to_isometric();
  } else{
    notIso = true;
    context.switch_to_perspective();
  }
  console.log('notIso', notIso);
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
