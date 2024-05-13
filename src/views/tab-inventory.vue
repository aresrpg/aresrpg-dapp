<i18n>
  en:
    locked_items: 🥐 Inbox
    locked_items_desc: You have new items to claim!
    unlocked_items: Inventory
    unlocked_items_desc: Items you own
  fr:
    locked_items: 🥐 Boîte aux lettres
    locked_items_desc: Vous avez des objets à récupérer !
    unlocked_items: Inventaire
    unlocked_items_desc: Objets que vous possédez
</i18n>

<script setup>
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { ref, onMounted, onUnmounted, inject } from 'vue';

import { context } from '../core/game/game.js';
import sectionContainer from '../components/misc/section-container.vue';
import itemInbox from '../components/cards/item-inbox.vue';
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
const extension_items = inject('extension_items');

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
const inventory = [];
</script>

<template lang="pug">
sectionContainer
  sectionHeader(v-if="extension_items.length" :title="t('locked_items')" :desc="t('locked_items_desc')" color="#FDD835")
    itemInbox(:items="extension_items")
  sectionHeader(:title="t('unlocked_items')" color="#00C853")
</template>

<style lang="stylus" scoped></style>
