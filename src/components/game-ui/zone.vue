<template lang="pug">
.zone__container
  .zone Plaine des Caffres
  .position 🗺️ {{ position?.x }}, {{ position?.y }}, {{ position?.z }} ( {{ chunk_position.x }}, {{ chunk_position.z }} )
  .players {{ t('APP_ZONE_PLAYERS') }}: {{ server_info.online_players }} / {{ server_info.max_players }}
  .version version {{ pkg.version }}
</template>

<script setup>
import { onMounted, onUnmounted, reactive, inject, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { to_chunk_position } from '@aresrpg/aresrpg-sdk/chunk';

import pkg from '../../../package.json';
import { context, current_three_character } from '../../core/game/game.js';

const position = reactive({ x: 0, y: 0, z: 0 });
const server_info = inject('server_info');
const { t } = useI18n();
const chunk_position = computed(() => to_chunk_position(position));

function update_position(state) {
  const pos = current_three_character(state)?.position;
  if (pos) {
    const x = Math.round(pos.x);
    const y = Math.round(pos.y);
    const z = Math.round(pos.z);
    if (position.x !== x) position.x = x;
    if (position.y !== y) position.y = y;
    if (position.z !== z) position.z = z;
  }
}

onMounted(() => {
  context.events.on('STATE_UPDATED', update_position);
  update_position();
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
  .players
    margin-top .5em
    font-size .8em
    color #EEEEEE
  .version
    font-size .8em
    color #EEEEEE
</style>
