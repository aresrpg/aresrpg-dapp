<i18n>
en:
  faucet: Claim some testnet {0}
  claiming: Claiming 10 test tokens
  claimed: Successfully claimed test tokens
  failed_to_claim: Failed to claim test tokens
fr:
  faucet: Réclamer des testnet {0}
  claiming: Recuperation de 10 tokens de test
  claimed: Tokens de test récupérés avec succès
  failed_to_claim: Échec de la récupération des tokens de test
</i18n>

<template lang="pug">
.faucet-card
  vs-button.wth(:disabled="!allow_claim" type="gradient" size="small" color="#4A148C" @click="claim") {{ t('faucet') }} #[b ${{ token.name }}]
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { sui_faucet_mint } from '../../core/sui/client.js';
import toast from '../../toast.js';

const { t } = useI18n();
const props = defineProps(['token']);

const background_image = computed(() => {
  return `url(${props.token?.image_url})` || '';
});

const allow_claim = ref(true);

async function claim() {
  const tx = toast.tx(t('claiming'), `$${props.token.name}`);
  try {
    allow_claim.value = false;
    const result = await sui_faucet_mint(props.token.name.toLowerCase());
    if (result === 'WAIT_A_MINUTE') tx.remove();
    else tx.update('success', t('claimed'));
  } catch (error) {
    console.error(error);
    tx.update('error', t('failed_to_claim'));
  }

  allow_claim.value = true;
}
</script>

<style lang="stylus" scoped>
.faucet-card
  width 250px
  height 150px
  display flex
  justify-content center
  align-items end
  background v-bind(background_image) center / contain
  background-repeat: no-repeat;
  filter drop-shadow(1px 2px 3px black)
  padding .5em
  border-radius 12px
  b
    padding-left .25em
    font-weight bold
</style>
