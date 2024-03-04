<template lang="pug">
router-view
</template>

<script setup>
import { onMounted, provide, watch, ref, computed, nextTick } from 'vue';
import { VsLoadingFn } from 'vuesax-alpha';
import { useRouter } from 'vue-router';
import { iter } from 'iterator-helper';

import { initialize_wallets, wallet_emitter } from './core/sui/wallet';
import { get_alias, set_network } from './core/sui/client';

const name = 'app';
const router = useRouter();

const loading = ref(0);
const wallets = ref([]);
const selected_wallet = ref(null);
const selected_account = ref(null);

const last_selected_address = localStorage.getItem('last_selected_address');

// watch the selected wallet and select the first account if none is selected
watch(selected_wallet, () => {
  const wallet = selected_wallet.value;
  if (!wallet) return;
  if (selected_account.value) return;
  selected_account.value =
    wallet.accounts.find(({ address }) => address === last_selected_address) ||
    wallet.accounts[0];
});

let loading_instance = null;

router.beforeEach(to => {
  if (selected_wallet.value) return true;
  if (to.name !== 'profiles' && to.path !== '/') return { name: 'profiles' };
});

onMounted(async () => {
  wallet_emitter.on('wallet', async wallet => {
    try {
      // find the wallet by its name inside the wallets ref and replace it
      let index = wallets.value.findIndex(w => w.name === wallet.name);
      if (index === -1) {
        wallets.value.push(wallet);
        index = wallets.value.length - 1;
      }

      set_network(wallet.chain);

      await iter(wallet.accounts)
        .toAsyncIterator()
        .forEach(async account => {
          account.alias = await get_alias(account.address);
        });

      wallets.value[index] = wallet;

      if (selected_wallet.value?.name === wallet.name) {
        selected_wallet.value = { ...wallet };
        selected_account.value = wallet.accounts.find(
          ({ address }) =>
            address === selected_account.value?.address ||
            address === last_selected_address,
        );
      }
    } catch (error) {
      console.error('Unable to handle the wallet event', error);
    }
  });

  wallet_emitter.on('switch_wallet', name => {
    if (!name) {
      selected_wallet.value = null;
      selected_account.value = null;
      localStorage.removeItem('last_selected_address');
      localStorage.removeItem('last_selected_wallet');
      return;
    }

    const wallet = wallets.value.find(w => w.name === name);
    if (!wallet) return;
    selected_wallet.value = wallet;
    localStorage.setItem('last_selected_wallet', wallet.name);
  });

  await initialize_wallets(localStorage.getItem('last_selected_wallet'));
});

watch(loading, value => {
  if (value === 1) {
    loading_instance?.close();
    loading_instance = VsLoadingFn({
      type: 'square',
      color: '#42A5F5',
      background: '#212121',
    });
  } else if (!value) {
    loading_instance.close();
  }
});

provide('resync', ref(0));
provide('wallets', wallets);
provide('selected_wallet', selected_wallet);
provide('selected_account', selected_account);
provide('loading', loading);
</script>

<style lang="stylus">
sc-reset()
    margin 0
    padding 0
    box-sizing border-box

sc-disableScollBar()
    ::-webkit-scrollbar
        display: none;

.vs-sidebar-item__icon
  background none

.vs-switch__text.is-on
  align-items normal

.v-dropdown-container
  background none !important

.btn
  font-size .9em
  i
    margin-right .5em

:root
  font-size 18px
  background #212121

[class^=vs]
  font-family 'Rubik', sans-serif !important

*
  sc-reset()
  sc-disableScollBar()
  font-family 'Rubik', sans-serif
  outline none
  scroll-behavior smooth
  &::-webkit-scrollbar-track
    box-shadow inset 0 0 6px rgba(0, 0, 0, .3)
    background-color #555
  &::-webkit-scrollbar
    width 12px
    background-color #F5F5F5
  &::-webkit-scrollbar-thumb
    box-shadow inset 0 0 6px rgba(0, 0, 0, .3)
    background-color #252525
  a
    :active
      color #e1c79b
      fill #e1c79b
</style>
