<template lang="pug">
.zone__container
  .zone Plaine des Caffres
  .position {{ position }}
  .version version {{ pkg.version }}
</template>

<script setup>
import { on } from 'events';

import { computed, inject, onMounted, onUnmounted, reactive } from 'vue';
import { to_chunk_position } from '@aresrpg/aresrpg-protocol';
import { aiter } from 'iterator-helper';

import pkg from '../../../package.json';
import { abortable } from '../../core/utils/iterator.js';
import { events } from '../../core/game/game.js';

const position = reactive({ x: 0, y: 0, z: 0 });
const controller = new AbortController();

onMounted(() => {
  aiter(
    abortable(on(events, 'STATE_UPDATED', { signal: controller.signal })),
  ).forEach(([state]) => {
    if (state.player) {
      const { player } = state;
      const x = Math.round(player.position.x);
      const y = Math.round(player.position.y);
      const z = Math.round(player.position.z);
      if (position.x !== x) position.x = x;
      if (position.y !== y) position.y = y;
      if (position.z !== z) position.z = z;
    }
  });
});

onUnmounted(() => {
  controller.abort();
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
