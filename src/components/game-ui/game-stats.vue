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
</i18n>

<template lang="pug">
.game-stats
  .header {{ t('stats') }}
  .player-info
    .avatar
      img(:src="characterImage" alt="Character Image")
    .details
      .name {{ name }}
      .classe-level
        .classe {{ classe }}, {{ t('level') }}: {{ level }}
  .bars
    .experience-bar
      .label {{ t('experience') }}
      .bar
        .fill(:style="{ width: `${percent_experience}%`, backgroundColor: '#32cdd9' }")
        .ticks
          .tick(v-for="n in 4" :key="n" :style="{ left: `${n * 20}%` }")
    .health-bar
      .label {{ t('health_points') }}
      .bar
        .fill(:style="{ width: `${percent_health}%`, backgroundColor: '#49b500' }")
        .ticks
          .tick(v-for="n in 4" :key="n" :style="{ left: `${n * 20}%` }")
    .soul-bar
      .label {{ t('soul_points') }}
      .bar
        .fill(:style="{ width: `${percent_soul}%`, backgroundColor: '#e11a38' }")
        .ticks
          .tick(v-for="n in 4" :key="n" :style="{ left: `${n * 20}%` }")
  .content
    .stat
      .label-grp
        img(src="../../assets/statistics/action.png")
        .label {{ t('ap') }}
      .value {{ pa }}
    .stat
      .label {{ t('mp') }}
      .value {{ pm }}
    .stat
      .label-grp
        img(src="../../assets/statistics/vitality.png")
        .label {{ t('vitality') }}
      .value-grp
        .value {{ stats.vitality }}
        .increase-button
          button(@click="increaseStat('vitality')") +
    .stat
      .label-grp
        img(src="../../assets/statistics/agility.png")
        .label {{ t('agility') }}
      .value-grp
        .value {{ stats.agility }}
        .increase-button
          button(@click="increaseStat('agility')") +
    .stat
      .label-grp
        img(src="../../assets/statistics/strength.png")
        .label {{ t('strength') }}
      .value-grp
          .value {{ stats.strength }}
          .increase-button
            button(@click="increaseStat('strength')") +
    .stat
      .label-grp
        img(src="../../assets/statistics/intelligence.png")
        .label {{ t('intelligence') }}
      .value-grp
        .value {{ stats.intelligence }}
        .increase-button
          button(@click="increaseStat('intelligence')") +
    .stat
      .label-grp
        img(src="../../assets/statistics/chance.png")
        .label {{ t('chance') }}
      .value-grp
        .value {{ stats.chance }}
        .increase-button
          button(@click="increaseStat('chance')") +
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



const stats = ref([]);

const name = ref('N/A');
const level = ref(0);
const classe = ref('N/A');
const characterImage = ref('https://assets.aresrpg.world/classe/iop_female.jpg');

const health = ref(0);
const max_health = ref(30);
const percent_health = ref(0)

const experience = ref(0);
const max_experience = ref(100);
const percent_experience = ref(0);

const soul_points = ref(0);
const max_soul_points = ref(100);
const percent_soul = ref(0)

const pa = ref(12);
const pm = ref(6);

const available_points = ref(0);

function update_stats() {
  const character = current_locked_character(undefined);
  if (!character?._type) return;

  if (character.name !== name.value) name.value = character.name;
  if (character.classe !== classe.value) classe.value = character.classe


  console.log(character)

  if (character.characterImage !== `https://assets.aresrpg.world/classe/${character.classe}_${character.sex}.jpg`) characterImage.value = `https://assets.aresrpg.world/classe/${character.classe}_${character.sex}.jpg`

  // SOUL POINTS
  const _max_soul_points = 100;

  if (character.soul_points !== soul_points.value) soul_points.value = character.soul_points;
  if (_max_soul_points !== max_soul_points.value) max_soul_points.value = _max_soul_points;
      percent_soul.value = (character.soul / _max_soul_points) * 100;

    console.log(character.soul_points, character.max_soul_points)

  // HEALTH
  const _max_health = get_max_health(character)

  if (character.health !== health.value) health.value = character.health;
  if (_max_health !== max_health.value) max_health.value = _max_health;
  percent_health.value = Math.round((character.health / _max_health ) * 100);

  // EXPERIENCE

  const _level = level_progression(character.experience)
  if (_level.experience_of_level !== level.value) level.value = _level.experience_of_level;
  
  if (character.experience !== experience.value) experience.value = character.experience;
  if (_level.experience_of_next_level !== max_experience.value) max_experience.value = _level.experience_of_next_level;
  percent_experience.value = (character.experience / _level.experience_of_next_level ) * 100;




  if (character.stats !== stats.value) stats.value = {
    'vitality': character.vitality,
    'agility': character.agility,
    'strength': character.strength,
    'intelligence': character.intelligence,
    'chance': character.chance
    }

    if (character.available_points !== available_points.value) available_points.value = character.available_points;
}

onMounted(() => {
  context.events.on('STATE_UPDATED', update_stats);
  update_stats();
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
        width 100%
        margin auto
        background #383737
        position relative
        height 10px
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
            background #383737
            opacity 0.7
        .fill
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
      padding-bottom .7em
      .label-grp
        font-size 1em
        vertical-align center
        display flex
        img
          height 25px
          width 25px
      .label
        margin-left 0.5em
        font-size 0.8em
        font-weight bold
        align-content center
      .value-grp
        font-size 1em
        vertical-align center
        display flex
        .value
          align-content center
          padding-inline 0.5em
        .increase-button
          button
            font-size 0.8em
            margin-left 0.5em
            padding 0.2em 0.5em
            background #49b500
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
      color #fff
</style>


