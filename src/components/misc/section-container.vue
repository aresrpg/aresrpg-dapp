<i18n>
  en:
    please_connect: Welcome on AresRPG, please login to get started
  fr:
    please_connect: Bienvenue sur AresRPG, veuillez vous connecter pour commencer
</i18n>

<template lang="pug">
.container
  span(v-if="!current_wallet && !props.allow_offline") {{ t('please_connect') }}
  slot(v-else)
</template>

<script setup>
import { inject } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps(['allow_offline']);

const current_wallet = inject('current_wallet');
</script>

<style lang="stylus" scoped>
.content
  a
    color #eee
    text-decoration underline
    &:hover
      color #fff

b.sui-network
  max-width 80%
  text-transform capitalize
  color #eee
.container
  padding 3em
  >span
    display flex
    width 100%
    height 100%
    color #eee
    flex-flow column nowrap
    width 100%
    justify-content center
    align-items center
</style>
