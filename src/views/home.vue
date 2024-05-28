<i18n>
fr:
  mobile: Ton écran est trop petit pour accéder à l'app
  lang: Choisir une langue
en:
  mobile: Use this app on desktop only
  lang: Choose a language
</i18n>

<script setup>
import { onMounted, inject, ref, provide } from 'vue';
import { useI18n } from 'vue-i18n';
import useBreakpoints from 'vue-next-breakpoints';

import TopBar from '../components/navigation/top-bar.vue';
import bubbles from '../components/misc/floating-bubbles.vue';
import SideBar from '../components/navigation/side-bar.vue';
import serverInfo from '../components/cards/server-info.vue';
import { i18n } from '../i18n.js';

const { t, locale } = useI18n();

const breakpoints = useBreakpoints({
  mobile: 1000,
});

const lang = ref('');
const sidebar_reduced = inject('sidebar_reduced');
const lang_dialog = ref(false);
const show_topbar = ref(true);

provide('show_topbar', show_topbar);

const langs = {
  fr: 'Français',
  en: 'English',
};

provide('lang_dialog', lang_dialog);

const selected = ref(langs[i18n.global.locale.value]);
const select = lang => {
  // @ts-ignore
  i18n.global.locale.value = Object.keys(langs).find(
    key => langs[key] === lang,
  );
  lang_dialog.value = false;

  localStorage.setItem('lang', i18n.global.locale.value);
};

onMounted(() => {
  // set lang from localstorage
  if (localStorage.getItem('lang')) {
    // @ts-ignore
    i18n.global.locale.value = localStorage.getItem('lang');
  }

  selected.value = langs[i18n.global.locale.value];
});
</script>

<template lang="pug">
.app
  .blur
  vs-dialog(v-model="lang_dialog")
    template(#header)
      h3.title {{ t('lang') }}
    vs-row(justify="center")
      vs-select(v-model="selected" :items="Object.values(langs)" @change="select" color="warn")
        vs-option(v-for="lang in langs" :key="lang" :value="lang") {{ lang }}

  // nav containing the address
  TopBar(v-if="show_topbar")
  .mobile(v-if="breakpoints.mobile.matches")
    serverInfo.info
    img(src="../assets/mobile/moai.png")
    span {{  t('mobile') }}
  .content(v-else)
    // Side panel
    SideBar
    // Main content (sub view)
    .right(:class="{ 'no-top-bar': !show_topbar }")
      router-view.view(v-slot="{ Component }")
        keep-alive(include="tab-world")
          component(:is="Component")
      bubbles(v-if="!sidebar_reduced")
      svg(v-if="!sidebar_reduced" style="position:fixed; top:100vh")
        defs
          filter#blob
            feGaussianBlur(in="SourceGraphic" stdDeviation="10" result="blur")
            feColorMatrix(in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="blob")
</template>

<style lang="stylus" scoped>
.btn
  width 90%
  align-self center
span.play
  font-weight 900

h3.title
  text-transform uppercase
  font-size .8em
  font-weight 900

.app
  display flex
  flex-flow column nowrap
  height 100vh
  overflow hidden
  .blur
    position absolute
    width 100%
    height 100%
    background url('../assets/main-app-ice-background.jpg') center / cover
    background-color #181818
    background-blend-mode color-dodge
    filter blur(50px)
  .content
    width 100%
    height 100%
    display flex
    .right
      width calc(100vw - 260px)
      height calc(100vh - 90px)
      margin-left auto
      position relative
      &.no-top-bar
        height 100vh
      .not_logged
        width 100%
        display flex
        span
          font-size 3em
          color #eee
          font-weight 900
          text-transform uppercase
      .view
        overflow-y auto
        height 100%
  >.mobile
    display flex
    justify-content center
    align-items center
    height 100vh
    overflow hidden
    color #eee
    flex-flow column nowrap
    position relative
    span
      font-size .8em
      margin-top 1em
    img
      position absolute
      transform rotate(-20deg)
      bottom -50px
      right 0
      width 200px
      filter drop-shadow(1px 2px 3px black)
</style>
