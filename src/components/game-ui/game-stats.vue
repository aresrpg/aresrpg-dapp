<i18n>
en:
  stats: Stats
  strength: Strength
  agility: Agility
  intelligence: Intelligence
  vitality: Vitality
  chance: Chance
  health_points: Health points (HP)
  soul_points: Soul points (SP)
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
  health_points: Points de vie (PV)
  soul_points: Etat de fantôme (SP)
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
        .fill(style={ width: `${percent_experience}%`, backgroundColor: 'blue' })
    .health-bar
      .label {{ t('health_points') }}
      .bar
        .fill(style={ width: `${percent_health}%` })
    .soul-bar
      .label {{ t('soul_points') }}
      .bar
        .fill(style={ width: `${percent_soul}%`, backgroundColor: 'red' })
  .content
    .stat
      .label {{ t('ap') }}
      .value {{ 'N/A' }}
    .stat
      .label {{ t('mp') }}
      .value {{ 'N/A' }}
    .stat
      .label {{ t('vitality') }}
      .value {{ stats.vitality }}
      .increase-button
        button(@click="increaseStat('vitality')") {{ t('increase') }}
    .stat
      .label {{ t('agility') }}
      .value
        .test {{ stats.agility }}
        .increase-button
        button(@click="increaseStat('agility')") {{ t('increase') }}
    .stat
      .label {{ t('strength') }}
      .value {{ stats.strength }}
      .increase-button
        button(@click="increaseStat('strength')") {{ t('increase') }}
    .stat
      .label {{ t('intelligence') }}
      .value {{ stats.intelligence }}
      .increase-button
        button(@click="increaseStat('intelligence')") {{ t('increase') }}
    .stat
      .label {{ t('chance') }}
      .value {{ stats.chance }}
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
const characterImage = ref('path/to/default/image.png'); // Chemin par défaut de l'image

const health = ref(0);
const max_health = ref(0);
const soul_points = ref(0);
const max_soul_points = ref(0);
const available_points = ref(0);

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

  // Mettre à jour l'image du personnage si disponible
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

// const pa = ref(12);
// const pm = ref(6);

// const percent_health = computed(() => {
//   return Math.round((100 * health.value) / (max_health.value || 1));
// });

// console.log(percent_health);

const increaseStat = (stat) => {
  // Logique pour augmenter la statistique
  console.log(`Augmenter ${stat}`);
};

const { t } = useI18n(); // Assure-toi que useI18n est utilisé correctement
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
        color green
      .classe-level
        display flex
        flex-direction column
        align-items center
        .classe, .level
          font-size 1.2em
  .bars
    display flex
    flex-direction column
    align-items center
    width 100%
    margin-bottom 1em
    .experience-bar, .health-bar, .soul-bar
      width 100%
      border-radius 5px
      overflow hidden
      .label
        font-size 1em
        margin-bottom 0.5em
      .bar
        width 100%
        height 10px
        background #777
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
      padding .5em 0
      .label
        font-weight bold
      .value
        font-size 1.2em
      .increase-button
        button
          margin-left 1em
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
      font-size 1.2em
</style>
