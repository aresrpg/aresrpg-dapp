<script setup>
import { useI18n } from 'vue-i18n';
import { ref } from 'vue';

import france from '../assets/france.png';
import usa from '../assets/usa.png';
import card from './card.vue';

const langs = [
  { locale: 'fr', flag: france },
  { locale: 'en', flag: usa },
];
const i18n = useI18n();
const selected = ref(langs.find(lang => i18n.locale.value === lang.locale));
const select = ({ locale }) => {
  i18n.locale.value = locale;
  selected.value = langs.find(lang => locale === lang.locale);
};
</script>

<template lang="pug">
card(
  :clickable="true"
  :dropdown="true"
)
  template(#content)
    img.flag(:src="selected.flag")
  template(#dropdown)
    img.select(v-for="lang in langs.filter(l => l.locale !== selected.locale)" :key="lang.locale" :src="lang.flag" @click="() => select(lang)")
</template>

<style lang="stylus" scoped>
img
  border-radius 5px
  border 1px solid #eee
  margin-left .5em
  margin-right .25em
  width 30px
  height 30px
  object-fit cover
.select
  cursor pointer
  &:hover
    background rgba(lighten(#212121, 10%), .4)
</style>
