<i18n>
  fr:
    inv: Inventaire
    settings: Paramètres
    world: Monde
    characters: Personnages
    terrain-editor: Editeur de terrain
  en:
    inv: Inventory
    settings: Settings
    lang: Choose a language
    world: World
    characters: Characters
    terrain-editor: Terrain Editor
</i18n>

<template lang="pug">
.hidden
  vs-sidebar(
    v-model="active_sidebar"
    :reduce="sidebar_reduced"
    open
  )
    template(#logo)
      img.logo(v-if="!sidebar_reduced" src="../../assets/logo.png" @click="router.push('/')")
      .logo(v-else)
    vs-sidebar-item(id="characters" @click="router.push('/characters')") {{ t('characters') }}
      template(#icon)
        i.bx.bxs-user-account
    vs-sidebar-item(id="world" @click="router.push('/world')") {{ t('world') }}
      template(#icon)
        i.bx.bx-world
    vs-sidebar-item(id="inventory" @click="router.push('/inventory')") {{ t('inv') }}
      template(#icon)
        i.bx.bx-wallet
    vs-sidebar-item(id="settings" @click="router.push('/settings')") {{ t('settings') }}
      template(#icon)
        i.bx.bx-cog
    vs-sidebar-item(id="discord" @click="open_discord") Discord
      template(#icon)
        i.bx.bxl-discord-alt
    vs-sidebar-item(id="twitter" @click="open_twitter") Twitter
      template(#icon)
        i.bx.bxl-twitter
    template(#footer v-if="!sidebar_reduced")
      .footer
        .version v{{ pkg.version }}
        serverInfo
        .lang(@click="lang_dialog = true") {{ t('lang') }}
</template>

<script setup>
import { inject, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

import pkg from '../../../package.json';
import serverInfo from '../cards/server-info.vue';

const lang_dialog = inject('lang_dialog');
const { t } = useI18n();

const router = useRouter();
const route = useRoute();
const active_sidebar = ref('world');

const sidebar_reduced = inject('sidebar_reduced');

watch(
  route,
  () => {
    // @ts-ignore
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

.logo
  max-width 100%
  padding 1em
  min-height 200px
  object-fit cover
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
  .version
    font-size .8em
    margin-bottom .25em

  .lang
    font-size .8em
    margin-top .5em
    text-decoration underline
    cursor pointer
</style>
