<i18n>
  en:
    chain_not_supported: The Sui {0} is not supported at the moment, please switch to another network
  fr:
    chain_not_supported: Vous utilisez le {0} Sui, qui n'est actuellement pas pris en charge, veuillez changer de network
</i18n>

<template lang="pug">
.container
  span(v-if="!selected_wallet") {{ props.placeholder || '' }}
  span(v-else-if="!is_chain_supported")
    .content
        i18n-t(keypath="chain_not_supported") #[b.sui-network {{ network }}]
  slot(v-else)
</template>

<script setup>
import { computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  VITE_ARESRPG_PACKAGE_DEVNET_ORIGINAL,
  VITE_ARESRPG_PACKAGE_MAINNET,
  VITE_ARESRPG_PACKAGE_TESTNET,
} from '../../env';

const { t } = useI18n();
const selected_wallet = inject('selected_wallet');
const props = defineProps(['placeholder']);

const network = computed(() => {
  const current_chain = selected_wallet.value?.chain;
  if (!current_chain) return 'mainnet';
  return current_chain.split(':')[1];
});

const is_chain_supported = computed(() => {
  switch (selected_wallet.value?.chain) {
    case 'sui:mainnet':
      return !!VITE_ARESRPG_PACKAGE_MAINNET;
    case 'sui:testnet':
      return !!VITE_ARESRPG_PACKAGE_TESTNET;
    case 'sui:devnet':
      return !!VITE_ARESRPG_PACKAGE_DEVNET_ORIGINAL;
    default:
      return true;
  }
});
</script>

<style lang="stylus" scoped>

b.sui-network
  max-width 80%
  margin 0 .3em
  font-weight 900
  text-transform uppercase
  color #eee
.container
  display flex
  flex-flow column nowrap
  align-items center
  padding 3em
  height 100%
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
