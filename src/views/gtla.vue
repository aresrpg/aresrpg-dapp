<i18n>
  fr:
    link: J'etait la
  en:
    link: I was here
</i18n>

<script setup>
import { onMounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import fetch_api from '../fetch_api.js';

const { t } = useI18n();

const router = useRouter();
const player = reactive({
  discord: '',
  gtla: {
    uuid: null,
    pseudo: null,
    rank: null,
    banned: null,
    ban_reason: null,
    ban_time: null,
    ban_date: null,
    muted: null,
    mute_time: null,
    mute_date: null,
    ghost: null,
  },
});

onMounted(() => {
  fetch_api('/api/gtla_proof', {
    body: { uuid: router.currentRoute.value.params.uuid },
  }).then(result => Object.assign(player, result));
});
</script>

<template lang="pug">
.gtla
  img(src="../assets/v1db.png")
  .container(v-if="player.gtla.uuid")
    div
      .name discord
      .num {{ player.discord }}
    div
      .name uuid
      .num {{ player.gtla.uuid }}
    div
      .name username
      .num {{ player.gtla.pseudo }}
    div
      .name rank
      .num {{ player.gtla.rank }}
    div
      .name banned
      .num {{ player.gtla.banned }}
    div
      .name muted
      .num {{ player.gtla.muted }}
  .container(v-else) Not found
</template>

<style lang="stylus" scoped>
.gtla
  display flex
  justify-content center
  align-items center
  flex-flow column nowrap
  width 100vw
  height 100vh
  img
    filter drop-shadow(1px 2px 3px blackw)
  .container
    width max-content
    color white
    >div
      display grid
      grid-template-columns 150px 1fr
      border-bottom 1px solid #eee
      padding .5em
      .name
        font-weight 100
        color #eee
        text-transform uppercase
      .num
        color #E67E22
        font-weight 900
        font-family 'Itim', cursive
</style>
