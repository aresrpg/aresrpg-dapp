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
        i18n-t(keypath="chain_not_supported") #[b.sui-network {{ network }}]
  slot(v-else)
</template>

<script setup>
import { onUnmounted, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { context } from '../../core/game/game.js';
import { is_chain_supported } from '../../core/utils/sui/is_chain_supported.js';

const { t } = useI18n();
const props = defineProps(['allow_offline']);

const network = ref('mainnet');
const network_supported = ref(false);
const current_wallet = ref(null);

function update_network({ sui, sui: { selected_wallet_name, wallets } }) {
  const selected_wallet = wallets[selected_wallet_name];
  const is_network_supported = is_chain_supported(sui);

  // @ts-ignore
  if (selected_wallet?.name !== current_wallet.value?.name)
    current_wallet.value = selected_wallet;

  if (network_supported.value !== is_network_supported)
    network_supported.value = is_network_supported;

  if (selected_wallet) {
    const [, chain] = selected_wallet.chain.split(':');
    if (chain !== network.value) network.value = chain;
  }
}

onMounted(() => {
  context.events.on('STATE_UPDATED', update_network);
  update_network(context.get_state());
});

onUnmounted(() => {
  context.events.off('STATE_UPDATED', update_network);
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
