<template lang="pug">
.zone__container
  .zone Plaine des Caffres
  .position {{ position }}
  .chunk_position {{ chunk_position }}
  .version version {{ pkg.version }}
</template>

<script setup>
import { computed, inject } from 'vue';
import { to_chunk_position } from '@aresrpg/aresrpg-protocol';

import pkg from '../../../package.json';

const state = inject('state');

const position = computed(() => {
  if (!state.value.player?.position) return [0, 0, 0];
  const { x, y, z } = state.value.player.position;
  return [Math.round(x), Math.round(y), Math.round(z)];
});

const chunk_position = computed(() => {
  const [x, , z] = position.value;
  const { x: cx, z: cz } = to_chunk_position({ x, z });
  return [cx, cz];
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
  .position, .chunk_position
    font-size 1em
    color #EEEEEE
  .version
    margin-top 1em
    font-size .8em
    color #EEEEEE
</style>
