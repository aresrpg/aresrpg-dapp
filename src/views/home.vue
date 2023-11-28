<i18n>
fr:
  mobile: Ton écran est trop petit pour accéder à l'app
  inv: Inventaire
  settings: Paramètres
  unique_1: Il y a
  unique_2: joueurs enregistrés
  lang: Choisissez une langue
  server: Serveur
  play: Jouer Maintenant
en:
  mobile: Use this app on desktop only
  inv: Inventory
  settings: Settings
  unique_1: There are
  unique_2: registered players
  lang: Choose a language
  server: Server
  play: Play Now
</i18n>

<script setup>
import { onMounted, inject, ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import useBreakpoints from 'vue-next-breakpoints';
import { useRouter } from 'vue-router';
import { VsNotification } from 'vuesax-alpha';

import { i18n } from '../main';
import a_nav from '../components/nav.vue';
import bubbles from '../components/bubbles.vue';
import user_info from '../components/user.info.vue';

const { t, locale, isGlobal } = useI18n();

const resync = inject('resync');
const user = inject('user');
const server_info = inject('server-info');
const breakpoints = useBreakpoints({
  mobile: 1000,
});

const router = useRouter();

const lang = ref('');

const open_discord = () => {
  window.open('https://discord.gg/aresrpg', '_blank');
};

const open_twitter = () => {
  window.open('https://twitter.com/aresrpg', '_blank');
};

const lang_dialog = ref(false);
const langs = {
  fr: 'Français',
  en: 'English',
};

const selected = ref(langs[i18n.global.locale.value]);
const select = lang => {
  i18n.global.locale.value = Object.keys(langs).find(
    key => langs[key] === lang,
  );
  lang_dialog.value = false;

  localStorage.setItem('lang', i18n.global.locale.value);
};

const active_sidebar = ref('inventory');

const route_name = computed(() => router.currentRoute.value.name);

watch(route_name, () => {
  active_sidebar.value = route_name.value;
});

function play_now() {
  window.open('https://play.aresrpg.world', '_blank');
}

onMounted(() => {
  resync.value++;

  // set lang from localstorage
  if (localStorage.getItem('lang'))
    i18n.global.locale.value = localStorage.getItem('lang');

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
  a_nav
  .mobile(v-if="breakpoints.mobile.matches")
    server_info.info
    img(src="../assets/moai.png")
    span {{  t('mobile') }}
  .content(v-else)
    vs-sidebar(open v-model="active_sidebar")
      vs-button.btn(v-if="user.uuid" type="gradient" color="#F39C12" @click="play_now")
        span.play {{ t('play') }}
      template(#logo)
        img.logo(src="../assets/text_logo.png")
      vs-sidebar-item(id="inventory" @click="router.push('/inventory')" :disabled="!user.uuid") {{ t('inv') }}
        template(#icon)
          i.bx.bx-wallet
      vs-sidebar-item(id="settings" @click="router.push('/settings')" :disabled="!user.uuid") {{ t('settings') }}
        template(#icon)
          i.bx.bx-cog
      vs-sidebar-item(id="discord" @click="open_discord") Discord
        template(#icon)
          i.bx.bxl-discord-alt
      vs-sidebar-item(id="twitter" @click="open_twitter") Twitter
        template(#icon)
          i.bx.bxl-twitter
      template(#footer)
        .footer
          vs-card
              template(#title)
                h3.title {{  t('server') }}
              template(#img)
                img(src="../assets/ice_dragon.gif")
              template(#text)
                span {{ t('unique_1') }} #[b {{ server_info.registrations ?? 0 }}] {{ t('unique_2') }}
          .lang(@click="lang_dialog = true") choose language
    .right
      router-view.view
      bubbles
      svg(style="position:fixed; top:100vh")
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

b
  font-weight 900
  color #F39C12

.vs-sidebar
  backdrop-filter blur(10px)
  background rgba(0, 0, 0, .5)

.vs-sidebar-item__icon
  background none

.vs-sidebar-item
  &.is-active
    color #fff !important
    &:after
      background #fff !important

.footer
  display flex
  flex-flow column nowrap
  align-items center
  .lang
    font-size .8em
    margin-top .5em
    text-decoration underline
    cursor pointer

.app
  display flex
  flex-flow column nowrap
  height 100vh
  overflow hidden
  .blur
    position absolute
    width 100%
    height 100%
    background url('../assets/bg.jpg') center / cover
    background-color #212121
    background-blend-mode color-dodge
    filter blur(50px)
  .content
    width 100%
    height 100%
    display flex
    img.logo
      max-width 100%
      padding 1em
      max-height 100%
    .right
      width calc(100vw - 260px)
      height calc(100vh - 90px)
      margin-left auto
      position relative
      .not_logged
        width 100%
        display flex
        span
          font-size 3em
          color #eee
          font-weight 900
          text-transform uppercase
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
