<i18n>
  en:
    chain_not_supported: The Sui {0} is not supported at the moment, please switch to another network
    please_connect: Welcome on AresRPG, please login to get started
  fr:
    chain_not_supported: Vous utilisez le {0} Sui, qui n'est actuellement pas pris en charge, veuillez changer de network
    please_connect: Bienvenue sur AresRPG, veuillez vous connecter pour commencer
</i18n>

<template lang="pug">
.container
  span(v-if="!current_wallet && !props.allow_offline") {{ t('please_connect') }}
  span(v-else-if="!network_supported && !props.allow_offline")
    .content
        i18n-t(keypath="chain_not_supported") #[b.sui-network {{ current_network }}]
  slot(v-else)
</template>

<script setup>
import { inject } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps(['allow_offline']);

const current_wallet = inject('current_wallet');
const network_supported = inject('network_supported');
const current_network = inject('current_network');
</script>

<style lang="stylus" scoped>

b.sui-network
  max-width 80%
  margin 0 .3em
  font-weight 900
  text-transform uppercase
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
