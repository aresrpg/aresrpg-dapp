<template lang="pug">
.description-container(v-if="item")
  .header
    .name {{ item.name }}
    .set(v-if="item.item_set !== 'none'") ({{ t('APP_ITEM_SET') }} {{ item.item_set }})
    .lvl Lvl. {{ item.level || experience_to_level(item.experience) }}
  .content
    .left-content
      img.icon(:src="item?.image_url")
      .category {{ t(`APP_ITEM_${item.item_category.toUpperCase()}` || 'not found') }}
      a.id(v-if="item.id" @click="() => open_explorer(item.id)") {{ short_id(item.id) }}
      .bottom(v-if="item.critical_chance") cc: {{ item.critical_chance }} / {{ item.critical_outcomes }}
    .right-content
      .scroll-container
        .eff {{ t('APP_ITEM_EFFECTS') }}:
        .damage(
          v-if="item.damages?.length"
          v-for="damage in item.damages"
          :key="damage.id"
          :class="damage.element"
        )
          .dmg(:class="damage.element") {{ damage.from }} {{ t('APP_ITEM_TO') }} {{ damage.to }} {{ t(`APP_ITEM_${damage.damage_type.toUpperCase()}`) }} {{ t(`APP_ITEM_${damage.element.toUpperCase()}`) }}
        .sepa
        div(
          v-if="stats.length"
          v-for="stat in stats"
          :key="stat.name"
        )
          img(:src="stat.icon")
          .value +{{ stat.value }} {{ t(`APP_ITEM_${stat.name.toUpperCase()}`) }}
        .sepa(v-if="item.last_feed")
        .stomach(v-if="item.feed_level != null") #[b {{ item.food_name }}] {{ t('APP_ITEM_STOMACH') }}: {{ item.feed_level }} / {{ item.max_feed_level }}
        .last-feed(v-if="item.last_feed") {{ t('APP_ITEM_LAST_FEED') }}: {{ item.last_feed }}

</template>

<!-- export type SuiToken = {
  item_category: string
  item_set: string
  item_type: string
  amount: bigint
  decimal: number
  image_url: string
  ids: string[]
  is_token: true
} -->

<script setup>
import { computed, inject, watch } from 'vue';
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
import { experience_to_level } from '../../core/utils/game/experience.js';

const { t } = useI18n();

const short_id = id => `${id.slice(0, 3)}..${id.slice(-3)}`;

const open_explorer = id => {
  window.open(`https://suiscan.xyz/${NETWORK}/object/${id}`, '_blank');
};

const item = inject('selected_item');

const stats = computed(() => {
  return [
    { name: 'action', value: item.value.action, icon: action_icon },
    { name: 'movement', value: item.value.movement, icon: movement_icon },
    { name: 'range', value: item.value.range, icon: range_icon },
    { name: 'vitality', value: item.value.vitality, icon: vitality_icon },
    { name: 'wisdom', value: item.value.wisdom, icon: wisdom_icon },
    { name: 'strength', value: item.value.strength, icon: strength_icon },
    {
      name: 'intelligence',
      value: item.value.intelligence,
      icon: intelligence_icon,
    },
    { name: 'chance', value: item.value.chance, icon: chance_icon },
    { name: 'agility', value: item.value.agility, icon: agility_icon },
    { name: 'critical', value: item.value.critical, icon: critical_icon },
    { name: 'raw_damage', value: item.value.raw_damage, icon: raw_damage_icon },
    {
      name: 'earth_resistance',
      value: item.value.earth_resistance,
      icon: strength_icon,
    },
    {
      name: 'fire_resistance',
      value: item.value.fire_resistance,
      icon: intelligence_icon,
    },
    {
      name: 'water_resistance',
      value: item.value.water_resistance,
      icon: chance_icon,
    },
    {
      name: 'air_resistance',
      value: item.value.air_resistance,
      icon: agility_icon,
    },
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
    height calc(100% - 22px)
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
      .category
        font-size .8em
        opacity .7
        font-style italic
        margin-top auto
        border-top 1px solid rgba(white, .3)
        border-top-right-radius 12px
      a.id
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
      // font-size 2rem
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
        .stomach, .last-feed
          font-size .8em
          opacity .7
          font-style italic
          >b
            margin-right .25em
            color #64B5F6
</style>
