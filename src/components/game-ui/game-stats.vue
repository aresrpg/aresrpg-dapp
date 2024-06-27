<i18n>
en:
  stats: Stats
  strength: Strength
  agility: Agility
  intelligence: Intelligence
  vitality: Vitality
  chance: Chance
  health_points: Health
  soul_points: Soul
  ap: AP
  mp: MP
  points_to_distribute: Points to distribute
  level: Level
  experience: Experience
  increase: +
fr:
  stats: Caractéristiques
  strength: Force
  agility: Agilité
  intelligence: Intelligence
  vitality: Vitalité
  chance: Chance
  health_points: Vie
  soul_points: Âme
  ap: PA
  mp: PM
  points_to_distribute: Points à distribuer
  level: Niveau
  experience: Expérience
  increase: +
</i18n>

<template lang="pug">
.game-stats
  .header {{ t('stats') }}
  .player-info
    .avatar
      img(src="https://assets.aresrpg.world/classe/iop_female.jpg" alt="Character Image")
    .details
      .name {{ name }}
      .classe-level
        .classe {{ classe }}, {{ t('level') }}: {{ level }}
  .bars
    .experience-bar
      .label {{ t('experience') }}
      .bar
        .fill(:style="{ width: `${percent_experience}%`, backgroundColor: 'blue' }")
        .ticks
          .tick(v-for="n in 5" :key="n" :style="{ left: `${n * 17.5}%` }")
    .health-bar
      .label {{ t('health_points') }}
      .bar
        .fill(:style="{ width: `${percent_health}%` }")
        .ticks
          .tick(v-for="n in 4" :key="n" :style="{ left: `${n * 20}%` }")
    .soul-bar
      .label {{ t('soul_points') }}
      .bar
        .fill(:style="{ width: `${percent_soul}%`, backgroundColor: 'red' }")
        .ticks
          .tick(v-for="n in 4" :key="n" :style="{ left: `${n * 20}%` }")
  .content
    .stat
      .label {{ t('ap') }}
      .value {{ pa }}
    .stat
      .label {{ t('mp') }}
      .value {{ pm }}
    .stat
      .testlab
        img(src="../../assets/statistics/vitality.png")
        .label {{ t('vitality') }}
      .value
        .test {{ stats.vitality }}
        .increase-button
          button(@click="increaseStat('vitality')") {{ t('increase') }}
    .stat
      .testlab
        img(src="../../assets/statistics/agility.png")
        .label {{ t('agility') }}
      .value
        .test {{ stats.agility }}
        .increase-button
          button(@click="increaseStat('agility')") {{ t('increase') }}
    .stat
      .testlab
        img(src="../../assets/statistics/strength.png")
        .label {{ t('strength') }}
      .value
          .test {{ stats.strength }}
          .increase-button
            button(@click="increaseStat('strength')") {{ t('increase') }}
    .stat
      .testlab
        img(src="../../assets/statistics/intelligence.png")
        .label {{ t('intelligence') }}
      .value
        .test {{ stats.intelligence }}
        .increase-button
          button(@click="increaseStat('intelligence')") {{ t('increase') }}
    .stat
      .testlab
        img(src="../../assets/statistics/chance.png")
        .label {{ t('chance') }}
      .value
        .test {{ stats.chance }}
        .increase-button
          button(@click="increaseStat('chance')") {{ t('increase') }}
  .points-to-distribute
    .label {{ t('points_to_distribute') }}
    .value {{ available_points }}
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { get_max_health } from '@aresrpg/aresrpg-sdk/stats';

import {
  context,
  current_locked_character,
  current_three_character,
} from '../../core/game/game.js';

import { levels, level_progression } from '../../core/utils/game/experience.js';

const percent_experience = ref(0);

const stats = ref([]);

const name = ref('N/A');
const level = ref('N/A');
const classe = ref('N/A');
const characterImage = ref('https://assets.aresrpg.world/classe/iop_female.jpg');

const health = ref(0);
const max_health = ref(0);
const soul_points = ref(0);
const max_soul_points = ref(0);
const available_points = ref(0);

const pa = ref(12);
const pm = ref(6);

const percent_health = computed(() => {
  return Math.round((100 * health.value) / max_health.value);
});

function update_stats(state) {
  const character = current_locked_character(state);
  if (!character?._type) return;

  if (character.name !== name.value) name.value = character.name;

  const _level = level_progression(character.experience)

  if (_level.experience_of_level !== level.value) level.value = _level.experience_of_level;
  
  if (percent_experience.value !== _level.experience_percent) percent_experience.value = _level.experience_percent

  if (character.available_points !== available_points.value) available_points.value = character.available_points;

  if (character.classe !== classe.value) classe.value = character.classe

  if (character.soul_points !== soul_points.value) soul_points.value = character.soul_points;
  if (character.max_soul_points !== max_soul_points.value) max_soul_points.value = 100;
  if (character.stats !== stats.value) stats.value = {
    'vitality': character.vitality,
    'agility': character.agility,
    'strength': character.strength,
    'intelligence': character.intelligence,
    'chance': character.chance
    }

  const supposed_max_health = get_max_health(character);

  if (character.health !== health.value) health.value = character.health;

  if (supposed_max_health !== max_health.value)
    max_health.value = supposed_max_health;

  if(character.experience !== percent_experience.value) percent_experience.value = character.experience;

  if (isNaN(max_health.value)) max_health.value = 30;

  if (character.image) {
    characterImage.value = character.image;
  }
}

onMounted(() => {
  context.events.on('STATE_UPDATED', update_stats);
  update_stats(undefined);
});

onUnmounted(() => {
  context.events.off('STATE_UPDATED', update_stats);
});

const increaseStat = (stat) => {
  console.log(`Augmenter ${stat}`);
};

const { t } = useI18n(); 
</script>

<style lang="stylus" scoped>
.game-stats
  display flex
  flex-direction column
  align-items center
  padding 1em
  border 5px double #212121
  border-radius 12px
  width 300px
  background linear-gradient(to bottom, #212121, rgba(#455A64, .3) 50%)
  .header
    font-size 1.5em
  .player-info
    display flex
    align-items center
    margin-bottom 1em
    .avatar
      margin-right 1em
      img
        width 75px
        height 75px
        border-radius 50%
    .details
      display flex
      flex-direction column
      align-items center
      .name
        font-size 1.5em
        font-weight bold
      .classe-level
        display flex
        flex-direction column
        align-items center
        .classe, .level
          font-size 1em
  .bars
    display flex
    flex-direction column
    align-items center
    width 100%
    margin-bottom 0.5em
    .experience-bar, .health-bar, .soul-bar
      display flex
      flex-direction row
      justify-content space-between
      width 100%
      overflow hidden
      margin-bottom 0.5em
      .label
        width 125px
        font-size 0.8em
      .bar
        border-radius 13px
        width 100%
        margin 0.2em
        background #777
        position relative
        .ticks
          position absolute
          top 0
          left 0
          width 100%
          height 100%
          .tick
            position absolute
            top 0
            bottom 0
            width 2px
            background #fff
            opacity 0.7
        .fill
          border-radius 10px
          height 100%
          background #4caf50
  .content
    display flex
    flex-direction column
    width 100%
    .stat
      display flex
      justify-content space-between
      align-items center
      padding-bottom .5em
      .testlab
        font-size 1em
        vertical-align center
        display flex
        img
          height 25px
          width 25px
      .label
        margin-left 0.2em
        font-size 0.8em
        font-weight bold
        align-content center
      .value
        font-size 1em
        vertical-align center
        display flex
        .test
          align-content center
        .increase-button
          button
            font-size 0.8em
            margin-left 0.5em
            padding 0.2em 0.5em
            background #4caf50
            color white
            border none
            border-radius 5px
            cursor pointer
  .points-to-distribute
    display flex
    justify-content space-between
    padding .5em 0
    margin-top 1em
    .label
      font-weight bold
    .value
      margin-left 1em
      color green
</style>


