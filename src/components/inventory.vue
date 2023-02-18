<i18n>
  fr:
    empty: Ton inventaire est vide, gagne des items sur Crew3 !
    please_connect: Connecte toi pour voir ton inventaire
  en:
    empty: Your inventory is empty, get some items on Crew3 !
    please_connect: Login to see your inventory
</i18n>

<script setup>
import { inject, computed } from 'vue';
import corbac from '../assets/corbac.png';
import siluri from '../assets/siluri.png';
import krinan from '../assets/krinan.png';
import betakey from '../assets/key.png';
import scroll from '../assets/title.png';
import { useI18n } from 'vue-i18n';
import card from './card.vue';

const { t } = useI18n();

const REGISTRY = {
  ['Familier Krinan Le Fourvoyeur']: {
    name: 'Krinan',
    src: krinan,
    type: 'Familier',
  },
  ['Familier Siluri']: {
    name: 'Siluri',
    src: siluri,
    type: 'Familier',
  },
  ['Familier Corbac']: {
    name: 'Corbac',
    src: corbac,
    type: 'Familier',
  },
  ['Clé Beta']: {
    name: 'Clé Beta',
    src: betakey,
    type: 'Item',
  },
  ['Titre Porteur de la Sagesse Ancestrale']: {
    name: 'Porteur de la Sagesse Ancestrale',
    src: scroll,
    type: 'Titre',
  },
  [`Titre Survivant de l'ancien monde`]: {
    name: `Survivant de l'ancien monde`,
    src: scroll,
    type: 'Titre',
  },
};

const user = inject('user');
const open_crew3 = () => {
  window.open('https://aresrpg.crew3.xyz', '_blank');
};
const inventory = computed(() => {
  if (user?.crew3?.id) {
    const {
      crew3: {
        quests: { items },
      },
    } = user;
    return items
      .map(({ name, amount }) => ({
        ...REGISTRY[name],
        amount,
      }))
      .filter(({ name }) => !!name);
  }
  return [];
});
</script>

<template lang="pug">
.container
  .content( :class="{ empty: !inventory.length }")
    span(v-if="!user?.uuid") {{ t('please_connect') }}
    .items(v-else)
      card(
        v-if="!inventory.length"
        :clickable="true"
        @click="open_crew3"
        background="#E74C3C"
      )
        template(#content)
          img.logo(src="../assets/crew3.svg")
          .name {{ t('empty') }}
      .item(v-else v-for="item of inventory" :key="item.name" :style="{ background: `url(${item.src}) center / cover` }")
        .info
          .name {{ item.name }}
          .quantity x {{ item.amount }}
          .tag {{ item.type }}
</template>

<style lang="stylus" scoped>
.container
  display flex
  flex-flow column nowrap
  width 100%
  margin-left 2em
  border 1px solid #ECF0F1
  border-radius 12px
  overflow hidden
  position relative
  box-shadow 1px 2px 3px black
  color #ECF0F1
  .content
    display flex
    width 100%
    height 100%
    color #eee
    flex-flow column nowrap
    &.empty
      justify-content center
      align-items center
    .items
      padding .25em
      display flex
      flex-flow row wrap
      justify-content start
      >span
        font-size .7em
        margin-top .5em
        font-style italic
      .name
        margin-right .5em
        font-weight 100
        font-size .7em
      img.logo
        margin .5em
        width 32px
        border-radius 50px
        border 1px solid #ECF0F1
      .item
        position relative
        overflow hidden
        border-radius 12px
        width 200px
        height @width
        margin .25em
        border 1px solid black
        .info
          display flex
          flex-flow column nowrap
          position absolute
          bottom 0
          left 0
          right 0
          margin .25em
          border-radius 10px
          background rgba(black, .5)
          backdrop-filter blur(5px)
          padding .5em 1em
          .name
            text-transform uppercase
            font-size .9em
            font-weight 900
            text-shadow 1px 2px 3px #212121
          .quantity
            position absolute
            font-size .9em
            top 50%
            transform translateY(-50%)
            right 10px
          .tag
            width max-content
            color #BDC3C7
            font-size .7em
            font-family 'Itim', cursive
</style>
