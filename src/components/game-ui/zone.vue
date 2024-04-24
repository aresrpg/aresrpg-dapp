<i18n>
en:
  players: Players
fr:
  players: Joueurs
</i18n>

<template lang="pug">
.zone__container
  .zone Plaine des Caffres
  .position {{ position }}
  .terrain_procgen {{ terrain_procgen }}
  .biome_procgen {{ biome_procgen }}
  .players {{ t('players') }}: {{ server_info.online_players }} / {{ server_info.max_players }}
  .version version {{ pkg.version }}
</template>

<script setup>
import { onMounted, onUnmounted, reactive, inject } from 'vue';
import { useI18n } from 'vue-i18n';

import pkg from '../../../package.json';
import { context, current_character } from '../../core/game/game.js';

const position = reactive({ x: 0, y: 0, z: 0 });
const terrain_procgen = reactive({ c: 0, e: 0, pv: 0 });
const biome_procgen = reactive({ h: 0, t: 0 });
const server_info = inject('server_info');
const { t } = useI18n();

function update_position(state) {
  const player = current_character(state);
  if (player.position) {
    const x = Math.round(player.position.x);
    const y = Math.round(player.position.y);
    const z = Math.round(player.position.z);
    if (position.x !== x) position.x = x;
    if (position.y !== y) position.y = y;
    if (position.z !== z) position.z = z;
    if (context.world_gen) {
      //console.log(context.world_gen);
      const continentalness = context.world_gen.getContinentalness(
        player.position,
      );
      const erosion = context.world_gen.getErosion(player.position);
      terrain_procgen.c = Math.round(continentalness * 100) / 100;
      terrain_procgen.e = Math.round(erosion * 100) / 100;
      //const temperature = context.world_gen.getTemperature(player.position);
      //const humidity = context.world_gen.getHumidity(player.position);
      biome_procgen.h = 0//Math.round(humidity * 100) / 100;
      biome_procgen.t = 0//Math.round(temperature * 100) / 100;
    }
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
