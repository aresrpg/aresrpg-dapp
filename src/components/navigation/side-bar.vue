<i18n>
  fr:
    inv: Inventaire
    settings: Paramètres
    world: Monde
    profiles: Profils
    terrain-editor: Editeur de terrain
  en:
    inv: Inventory
    settings: Settings
    lang: Choose a language
    world: World
    profiles: Profiles
    terrain-editor: Terrain Editor
</i18n>

<template lang="pug">
vs-sidebar(open v-model="active_sidebar")
  template(#logo)
    img.logo(src="../../assets/logo.png" @click="router.push('/')")
  vs-sidebar-item(id="profiles" @click="router.push('/profiles')" :disabled="!selected_wallet") {{ t('profiles') }}
    template(#icon)
      i.bx.bxs-user-account
  vs-sidebar-item(id="world" @click="router.push('/world')" :disabled="!selected_wallet") {{ t('world') }}
    template(#icon)
      i.bx.bx-world
  vs-sidebar-item(id="inventory" @click="router.push('/inventory')" :disabled="!selected_wallet") {{ t('inv') }}
    template(#icon)
      i.bx.bx-wallet
  vs-sidebar-item(id="settings" @click="router.push('/settings')" :disabled="!selected_wallet") {{ t('settings') }}
    template(#icon)
      i.bx.bx-cog
  vs-sidebar-item(v-if="VITE_ENABLE_TERRAIN_EDITOR" id="terrain-editor" @click="router.push('/terrain-editor')" :disabled="!selected_wallet") {{ t('terrain-editor') }}
    template(#icon)
      i.bx.bx-paint-roll
  vs-sidebar-item(id="discord" @click="open_discord") Discord
    template(#icon)
      i.bx.bxl-discord-alt
  vs-sidebar-item(id="twitter" @click="open_twitter") Twitter
    template(#icon)
      i.bx.bxl-twitter
  template(#footer)
    .footer
      serverInfo
      .lang(@click="lang_dialog = true") {{ t('lang') }}
</template>

<script setup>
import { inject, computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

import { VITE_ENABLE_TERRAIN_EDITOR } from '../../env';
import serverInfo from '../cards/server-info.vue';

const selected_wallet = inject('selected_wallet');
const lang_dialog = inject('lang_dialog');
const { t } = useI18n();

const router = useRouter();
const route = useRoute();
const active_sidebar = ref('world');

watch(
  route,
  () => {
    active_sidebar.value = route.name;
  },
  { immediate: true },
);

const open_discord = () => {
  window.open('https://discord.gg/aresrpg', '_blank');
};

const open_twitter = () => {
  window.open('https://twitter.com/aresrpg', '_blank');
};
</script>

<style lang="stylus" scoped>

img.logo
  max-width 100%
  padding 1em
  max-height 100%
  cursor pointer
  filter drop-shadow(1px 2px 3px black)

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
</style>
