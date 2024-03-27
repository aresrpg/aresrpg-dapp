<template lang="pug">
.zone__container
  .zone Plaine des Caffres
  .position {{ position }}
  .version version {{ pkg.version }}
</template>

<script setup>
import { onMounted, onUnmounted, reactive } from 'vue';

import pkg from '../../../package.json';
import { context } from '../../core/game/game.js';

const position = reactive({ x: 0, y: 0, z: 0 });

function update_position({ player }) {
  if (player) {
    const x = Math.round(player.position.x);
    const y = Math.round(player.position.y);
    const z = Math.round(player.position.z);
    if (position.x !== x) position.x = x;
    if (position.y !== y) position.y = y;
    if (position.z !== z) position.z = z;
  }
}

onMounted(() => {
  context.events.on('STATE_UPDATED', update_position);
  update_position(context.get_state());
});

onUnmounted(() => {
  context.events.off('STATE_UPDATED', update_position);
});
</script>

<style lang="stylus" scoped>
.zone__container
  position absolute
  top 1em
  left 70px
  text-shadow 1px 2px 3px black
  .zone
    font-size 1.5em
    color #EEEEEE
  .position
    font-size 1em
    color #EEEEEE
  .version
    margin-top .5em
    font-size .8em
    color #EEEEEE
</style>
