<i18n>
  fr:
    unique_1: Il y a
    unique_2: joueurs enregistrés
  en:
    unique_1: There are
    unique_2: registered players
</i18n>

<script setup>
import { inject } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const server_info = inject('server-info');
</script>

<template lang="pug">
.container
  .banner
  .content
    .name {{ t('unique_1') }} #[b {{ server_info.registrations ?? 0 }}] {{ t('unique_2') }}
    .quests
</template>

<style lang="stylus" scoped>
.container
  display flex
  flex-flow column nowrap
  width 300px
  border 1px solid #ECF0F1
  border-radius 12px
  overflow hidden
  position relative
  box-shadow 1px 2px 3px black
  color #ECF0F1
  .banner
    background url('../assets/ice_dragon.gif') center / cover
    width 100%
    height 100px
    border-bottom 1px solid #ECF0F1
  .content
    display flex
    flex-flow column nowrap
    padding .5em
    .name
      text-transforum uppercase
      font-size .8em
      display flex
      align-items baseline
      b
        color #F39C12
        padding 0 .25em
        font-size 1.1em
</style>
