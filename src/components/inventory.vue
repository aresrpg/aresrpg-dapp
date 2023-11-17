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
import { useI18n } from 'vue-i18n';

import corbac from '../assets/corbac.png';
import siluri from '../assets/siluri.png';
import krinan from '../assets/krinan.png';
import betakey from '../assets/key.png';
import scroll from '../assets/title.png';
import talokan_feu from '../assets/talokan_feu.png';
import zot from '../assets/zot.png';

import card from './card.vue';

const { t } = useI18n();

const REGISTRY = {
  'Familier Krinan Le Fourvoyeur': {
    name: 'Krinan',
    src: krinan,
    type: 'Familier',
    desc: `Ce familier, si vous le nourrissez, augmentera vos dommages fixes`,
  },
  'Familier Siluri': {
    name: 'Siluri',
    src: siluri,
    type: 'Familier',
    desc: `Ce familier, si vous le nourrissez, augmentera vos caractéristiques d'esprit`,
  },
  'Familier Corbac': {
    name: 'Corbac',
    src: corbac,
    type: 'Familier',
    desc: `Ce familier, si vous le nourrissez, augmentera votre portée`,
  },
  'Clé Beta': {
    name: 'Clé Beta',
    src: betakey,
    type: 'Item',
    desc: `Cette clé mystérieuse vous permet surement l'accès aux versions de test d'AresRPG`,
  },
  'Titre Porteur de la Sagesse Ancestrale': {
    name: 'Porteur de la Sagesse Ancestrale',
    src: scroll,
    type: 'Titre',
    desc: 'Cet ornement devrait imposer le respect parmi la plèbe',
  },
  [`Titre Survivant de l'ancien monde`]: {
    name: `Survivant de l'ancien monde`,
    src: scroll,
    type: 'Titre',
    desc: 'Cet ornement devrait imposer le respect parmi la plèbe',
  },
  'Familier Talokan Feu': {
    name: 'Talokan Feu',
    src: talokan_feu,
    type: 'Familier',
    desc: `Ce familier, si vous le nourrissez, augmentera vos caractéristiques d'intelligence`,
  },
  'Familier Zot': {
    name: 'Zot',
    src: zot,
    type: 'Familier',
    desc: `Ce familier, si vous le nourrissez, augmentera votre puissance`,
  },
};

const user = inject('user');
const open_crew3 = () => {
  window.open('https://aresrpg.crew3.xyz', '_blank');
};
const inventory = computed(() => {
  return (
    user.inventory?.map(({ name, issuer, amount }) => ({
      ...REGISTRY[name],
      amount,
      issuer,
    })) ?? []
  );
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
      .item(v-else v-for="item of inventory" :key="item.name")
        img(:src="item.src")
        .info
          .name {{ item.name }}
          .quantity x{{ item.amount }}
          .tag {{ item.type }}
          .issuer via #[b {{  item.issuer }}]
        .desc {{ item.desc }}
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
        margin .25em
        border 1px solid #eee
        display flex
        flex-flow column nowrap
        >img
          width 100%
          height 200px
          object-fit cover

        .desc
          color white
          font-size .6em
          padding .5em
          opacity .7
          text-align center
        .info
          display flex
          position absolute
          top 0
          left 0
          right 0
          padding .25em .5em
          background rgba(#212121, .5)
          backdrop-filter blur(5px)
          flex-flow column nowrap
          margin .2em
          border-radius 10px
          display grid
          grid "name amount" 1fr "type issuer" max-content / 1fr max-content
          .name
            grid-area name
            width 100%
            text-transform uppercase
            font-size .9em
            font-weight 900
            text-shadow 1px 2px 3px #212121
          .quantity
            grid-area amount
            font-size .9em
            justify-self end

          .tag
            grid-area type
            width max-content
            color #BDC3C7
            font-size .7em
            font-family 'Itim', cursive
          .issuer
            grid-area issuer
            color #BDC3C7
            font-size .7em
            font-family 'Itim', cursive
            b
              font-weight 100
              color #A5D6A7
</style>
