<i18n>
  en:
    shop: 🥐 Market
  fr:
    shop: 🥐 Hôtel des Ventes
</i18n>

<script setup>
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { inject } from 'vue';

import sectionContainer from '../components/misc/section-container.vue';
import sectionHeader from '../components/misc/section-header.vue';

// import corbac from '../assets/corbac.png';
// import siluri from '../assets/siluri.png';
// import krinan from '../assets/krinan.png';
// import betakey from '../assets/key.png';
// import scroll from '../assets/title.png';
// import talokan_feu from '../assets/talokan_feu.png';
// import zot from '../assets/zot.png';

const { t } = useI18n();
const router = useRouter();

const owned_items = inject('owned_items');

const REGISTRY = {
  // 'Familier Krinan Le Fourvoyeur': {
  //   name: 'Krinan',
  //   src: krinan,
  //   type: 'Familier',
  //   desc: `Ce familier, si vous le nourrissez, augmentera vos dommages fixes`,
  // },
  // 'Familier Siluri': {
  //   name: 'Siluri',
  //   src: siluri,
  //   type: 'Familier',
  //   desc: `Ce familier, si vous le nourrissez, augmentera vos caractéristiques d'esprit`,
  // },
  // 'Familier Corbac': {
  //   name: 'Corbac',
  //   src: corbac,
  //   type: 'Familier',
  //   desc: `Ce familier, si vous le nourrissez, augmentera votre portée`,
  // },
  // 'Clé Beta': {
  //   name: 'Clé Beta',
  //   src: betakey,
  //   type: 'Item',
  //   desc: `Cette clé mystérieuse vous permet surement l'accès aux versions de test d'AresRPG`,
  // },
  // 'Titre Porteur de la Sagesse Ancestrale': {
  //   name: 'Porteur de la Sagesse Ancestrale',
  //   src: scroll,
  //   type: 'Titre',
  //   desc: 'Cet ornement devrait imposer le respect parmi la plèbe',
  // },
  // [`Titre Survivant de l'ancien monde`]: {
  //   name: `Survivant de l'ancien monde`,
  //   src: scroll,
  //   type: 'Titre',
  //   desc: 'Cet ornement devrait imposer le respect parmi la plèbe',
  // },
  // 'Familier Talokan Feu': {
  //   name: 'Talokan Feu',
  //   src: talokan_feu,
  //   type: 'Familier',
  //   desc: `Ce familier, si vous le nourrissez, augmentera vos caractéristiques d'intelligence`,
  // },
  // 'Familier Zot': {
  //   name: 'Zot',
  //   src: zot,
  //   type: 'Familier',
  //   desc: `Ce familier, si vous le nourrissez, augmentera votre puissance`,
  // },
};

// const inventory = computed(() => {
//   return (
//     user.app?.inventory?.map(({ name, issuer, amount }) => ({
//       ...REGISTRY[name],
//       amount,
//       issuer,
//     })) ?? []
//   );
// });
</script>

<template lang="pug">
sectionContainer
  sectionHeader(:title="t('shop')" color="#00C853")
</template>

<style lang="stylus" scoped></style>
