<i18n>
en:
  set: Set
  to: to
  damage: damage(s)
  life_steal: life steal
  heal: heal
  earth: Earth
  fire: Fire
  water: Water
  air: Air
  vitality: vitality
  wisdom: wisdom
  strength: strength
  intelligence: intelligence
  chance: chance
  agility: agility
  critical: critical
  raw_damage: damages
  action: AP
  movement: MP
  range: range
  earth_resistance: Earth resistance
  fire_resistance: Fire resistance
  water_resistance: Water resistance
  air_resistance: Air resistance
  effects: Effects
fr:
  set: Panoplie
  to: à
  damage: dégât(s)
  life_steal: vol de vie
  heal: soin
  earth: Terre
  fire: Feu
  water: Eau
  air: Air
  vitality: vitalité
  wisdom: sagesse
  strength: force
  intelligence: intelligence
  chance: chance
  agility: agilité
  critical: coups critique
  raw_damage: dommages
  action: PA
  movement: PM
  range: portée
  earth_resistance: Résistance Terre
  fire_resistance: Résistance Feu
  water_resistance: Résistance Eau
  air_resistance: Résistance Air
  effects: Effets
</i18n>

<template lang="pug">
.description-container
  .header
    .name {{ item.name }}
    .set(v-if="item.item_set !== 'none'") ({{ t('set') }} {{ item.item_set }})
    .lvl Lvl. {{ item.level }}
  .content
    .left-content
      img.icon(:src="item?.image_url")
      a.id(@click="() => open_explorer(item.id)") {{ short_id(item.id) }}
      .bottom(v-if="item.critical_chance") cc: {{ item.critical_chance }} / {{ item.critical_outcomes }}
    .right-content
      .scroll-container
        .eff {{ t('effects') }}:
        .damage(
          v-if="item.damages?.length"
          v-for="damage in item.damages"
          :key="damage.id"
          :class="damage.element"
        )
          .dmg(:class="damage.element") {{ damage.from }} {{ t('to') }} {{ damage.to }} {{ t(damage.damage_type) }} {{ t(damage.element) }}
        .sepa
        div(
          v-if="stats.length"
          v-for="stat in stats"
          :key="stat.name"
        )
          img(:src="stat.icon")
          .value +{{ stat.value }} {{ t(stat.name) }}
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { NETWORK } from '../../env.js';
import action_icon from '../../assets/statistics/action.png';
import movement_icon from '../../assets/statistics/movement.png';
import range_icon from '../../assets/statistics/range.png';
import vitality_icon from '../../assets/statistics/vitality.png';
import wisdom_icon from '../../assets/statistics/wisdom.png';
import strength_icon from '../../assets/statistics/strength.png';
import intelligence_icon from '../../assets/statistics/intelligence.png';
import chance_icon from '../../assets/statistics/chance.png';
import agility_icon from '../../assets/statistics/agility.png';
import critical_icon from '../../assets/statistics/crit.png';
import raw_damage_icon from '../../assets/statistics/raw_damage.png';

const { t } = useI18n();
const props = defineProps(['item']);

const short_id = id => `${id.slice(0, 3)}..${id.slice(-3)}`;

const open_explorer = id => {
  window.open(`https://suiscan.xyz/${NETWORK}/object/${id}`, '_blank');
};

const stats = computed(() => {
  const { item } = props;
  return [
    { name: 'action', value: item.action, icon: action_icon },
    { name: 'movement', value: item.movement, icon: movement_icon },
    { name: 'range', value: item.range, icon: range_icon },
    { name: 'vitality', value: item.vitality, icon: vitality_icon },
    { name: 'wisdom', value: item.wisdom, icon: wisdom_icon },
    { name: 'strength', value: item.strength, icon: strength_icon },
    { name: 'intelligence', value: item.intelligence, icon: intelligence_icon },
    { name: 'chance', value: item.chance, icon: chance_icon },
    { name: 'agility', value: item.agility, icon: agility_icon },
    { name: 'critical', value: item.critical, icon: critical_icon },
    { name: 'raw_damage', value: item.raw_damage, icon: raw_damage_icon },
    {
      name: 'earth_resistance',
      value: item.earth_resistance,
      icon: strength_icon,
    },
    {
      name: 'fire_resistance',
      value: item.fire_resistance,
      icon: intelligence_icon,
    },
    {
      name: 'water_resistance',
      value: item.water_resistance,
      icon: chance_icon,
    },
    { name: 'air_resistance', value: item.air_resistance, icon: agility_icon },
  ].filter(stat => stat.value);
});
</script>

<style lang="stylus" scoped>
.description-container
  display flex
  flex-flow column
  overflow hidden
  position relative
  height 250px
  .header
    display flex
    flex-flow row nowrap
    font-size .9em
    align-items center
    .name
      font-weight 900
      opacity .9
      text-transform uppercase
    .set
      font-size .8em
      font-style italic
      margin 0 .5em
    .lvl
      margin-left auto
  .content
    display flex
    flex-flow row nowrap
    height 100%
    .left-content
      display flex
      flex-flow column nowrap
      margin-right 1em
      align-items space-between
      img.icon
        width 100px
        height 100px
        object-fit contain
        border-radius 5px
        overflow hidden
        filter drop-shadow(1px 2px 3px black)
        margin-bottom 1em
        margin-top .5em
      a.id
        margin-top auto
        font-size .8em
        text-decoration underline
        font-style italic
        cursor pointer
        opacity .7
      .bottom
        text-transform uppercase
        font-size .9em
    .right-content
      overflow hidden
      overflow-y scroll
      height calc(100% - .5em)
      width 100%
      margin-top .5em
      background rgba(#000, .3)
      border-radius 12px
      padding .5em
      .scroll-container
        display flex
        flex-flow column nowrap

        .eff
          font-size .7em
          margin-bottom .5em
          opacity .7

        .damage
          display flex
          flex-flow row nowrap
          .dmg
            font-style italic
            opacity .9
          &.earth
            color #8D6E63
          &.fire
            color #FF5722
          &.water
            color #2196F3
          &.air
            color #4CAF50

        .sepa
          height .5em
        div
          display flex
          flex-flow row nowrap
          align-items center
          img
            width 20px
            height 20px
            object-fit contain
            margin-right 5px
          .value
            opacity .9
</style>
