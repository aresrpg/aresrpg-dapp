<template lang="pug">
.container
  .left-pane
    .head {{ t('APP_WALLET_CONNECT') }}
    .wallet(v-for="wallet in registered_wallets" :key="wallet.name" @click="() => connect_to_wallet(wallet)")
      img(:src="wallet.icon" :alt="wallet.name")
      span {{ wallet.name }}
  .right-pane
    .head {{ t('APP_WALLET_WHAT') }}
    .content
      .section(v-if="no_wallet")
        .title.uhoh Uh Oh !
        .desc {{ t('APP_WALLET_NO_WALLET') }} #[a(href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil" target="_blank") Sui Wallet]
      .section(v-if="!no_wallet")
        .title {{ t('APP_WALLET_SECTION1_TITLE') }}
        .desc {{ t('APP_WALLET_SECTION1_DESC') }}
      .section(v-if="!no_wallet")
        .title {{ t('APP_WALLET_SECTION2_TITLE') }}
        .desc {{ t('APP_WALLET_SECTION2_DESC') }}
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { ref, onMounted, onUnmounted, computed } from 'vue';

import toast from '../../toast';
import { context } from '../../core/game/game.js';

const { t } = useI18n();
const emits = defineEmits(['connection_done']);

const registered_wallets = ref([]);

const no_wallet = computed(() => {
  const [first_wallet, second_wallet] = registered_wallets.value;
  if (second_wallet) return false;
  return first_wallet?.name === 'Stashed';
});

function update_wallets({ sui: { wallets } }) {
  const wallets_names = Object.keys(wallets);

  if (wallets_names.join() !== registered_wallets.value.join())
    registered_wallets.value = Object.values(wallets);
}

onMounted(async () => {
  context.events.on('STATE_UPDATED', update_wallets);
  update_wallets(context.get_state());
});

onUnmounted(() => {
  context.events.off('STATE_UPDATED', update_wallets);
});

async function connect_to_wallet(wallet) {
  try {
    await wallet.connect();
  } catch (error) {
    console.error(error);
    toast.error(t('APP_WALLET_CONNECT_REFUSED'), 'Hey !');
  } finally {
    emits('connection_done');
  }
}
</script>

<style lang="stylus" scoped>
.uhoh
  color red

.head
  font-size 1.3em
  font-weight 900
  margin-bottom 1em

.container
  display flex
  flex-flow row nowrap
  min-height 400px
  .left-pane
    display flex
    flex-flow column nowrap
    min-width max-content
    padding 1em
    .wallet
      display flex
      align-items center
      font-size 1.1em
      padding .5em
      transition 100ms
      border-radius 10px
      img
        width 30px
        border-radius 10px
        height @width
        object-fit cover
        margin-right .5em
      &:hover
        cursor pointer
        background rgba(white, .2)
  .right-pane
    display flex
    flex-flow column nowrap
    align-items center
    padding 1em
    background #282828
    .content
      display flex
      flex-flow column nowrap
      padding 3em
      .section
        margin-bottom 2em
        .title
          font-size 1.1em
          margin-bottom .5em
        .desc
          font-size .9em
          padding-left .5em
          opacity .8
          a
            color white
            text-decoration underline
            font-weight 900
</style>
