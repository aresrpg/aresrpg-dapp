<i18n>
  fr:
    mobile: Ton écran est trop petit pour accéder à l'app
  en:
    mobile: Use this app on desktop only
</i18n>

<script setup>
import { onMounted, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import a_nav from '../components/nav.vue';
import discord_info from '../components/user.info.vue';
import server_info from '../components/server.info.vue';
import inventory from '../components/inventory.vue';
import loading from '../components/loading.vue';
import useBreakpoints from 'vue-next-breakpoints';

const resync = inject('resync');
const user = inject('user');
const is_loading = inject('loading');
const { t } = useI18n();
const breakpoints = useBreakpoints({
  mobile: 1000,
});

onMounted(() => {
  resync.value++;
});
</script>

<template lang="pug">
loading(v-if="is_loading")
.app(v-else)
  a_nav
  .mobile(v-if="breakpoints.mobile.matches")
    img(src="../assets/moai.png")
    span {{  t('mobile') }}
  .content(v-else)
    .infos
      server_info
      discord_info(v-if="user.discord")
    inventory.inventory
</template>

<style lang="stylus" scoped>
.app
  display flex
  flex-flow column nowrap
  height 100vh
  .mobile
    display flex
    justify-content center
    align-items center
    height 100%
    color #eee
    flex-flow column nowrap
    span
      font-size .8em
    img
      width 200px
      filter drop-shadow(1px 2px 3px black)
  .content
    display flex
    width 100%
    height 100%
    padding 2em
    flex-flow row nowrap
    .infos
      display flex
      flex-flow column nowrap
      >:nth-child(2)
        margin-top 1em
</style>
