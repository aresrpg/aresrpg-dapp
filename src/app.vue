<template lang="pug">
router-view
</template>

<script setup>
import { onMounted, provide, watch, ref, reactive, onUnmounted } from 'vue';
import { VsLoadingFn } from 'vuesax-alpha';
import { useRouter } from 'vue-router';
import { aiter, iter } from 'iterator-helper';

import { initialize_wallets, wallet_emitter } from './core/sui/wallet';
import { get_alias, set_network, use_client } from './core/sui/client';

const name = 'app';
const router = useRouter();

const loading = ref(0);
const wallets = ref([]);
const selected_wallet = ref(null);
const selected_account = ref(null);
const sidebar_reduced = ref(false);
const resync = ref(0);

const selected_character = ref(null);
const user = reactive({
  has_shared_storage: false,
  locked_characters: null,
  unlocked_characters: null,
  balance_sui: null,
  // is the user connected to the websocket
  online: false,

  inventory: [],
});

const last_selected_address = localStorage.getItem('last_selected_address');

let loading_instance = null;
let resyncing_interval = null;

provide('wallets', wallets);
provide('selected_wallet', selected_wallet);
provide('selected_account', selected_account);
provide('loading', loading);
provide('sidebar_reduced', sidebar_reduced);
provide('user', user);
provide('selected_character', selected_character);

const client = use_client(selected_wallet, selected_account);

// ========================================
// watch the selected wallet and select the first account if none is selected
// ========================================
watch(selected_wallet, () => {
  const wallet = selected_wallet.value;
  if (!wallet) return;
  if (selected_account.value) return;
  selected_account.value =
    wallet.accounts.find(({ address }) => address === last_selected_address) ||
    wallet.accounts[0];
});

async function update_sui_balance() {
  try {
    const balance = await client.get_sui_balance();
    user.balance_sui = balance.toFixed(3);
  } catch (error) {
    console.error('Error while getting the Sui balance', error);
  }
}

async function update_user_data() {
  try {
    const { storage_cap_id } = await client.get_storage_id();

    user.unlocked_characters = await client.get_unlocked_user_characters();
    if (storage_cap_id) {
      const locked_characters =
        await client.get_locked_characters(storage_cap_id);
      user.locked_characters = locked_characters;

      if (!selected_character.value && locked_characters.length)
        [selected_character.value] = locked_characters;
    }
  } catch (error) {
    console.error('Error while updating the user data', error);
  }
}

// ========================================
// watch the selected account and populate the user object with blockchain data
// ========================================
watch(
  selected_account,
  async () => {
    if (!selected_account.value) return;
    loading.value++; // prevent interraction when switching accounts

    user.unlocked_characters = null;
    user.locked_characters = null;

    // we want a non blocking subscription call
    // it's currently unstable on Sui
    client
      .on_update()
      .then(emitter => {
        emitter.on('update', async event => {
          await update_sui_balance();
          await update_user_data();
        });
      })
      .catch(error => {
        console.error('Unable to subscribe to the Sui node', error);
      });

    await Promise.all([update_sui_balance(), update_user_data()]);
    loading.value--;
  },
  { immediate: true },
);

watch(resync, () => {
  if (!selected_account.value) return;

  console.log('resyncing');
  update_sui_balance();
  update_user_data();
});

// ========================================
// show the login animation if the loading ref is bigger than 0
// ========================================
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

onUnmounted(() => {
  loading_instance?.close();
  clearInterval(resyncing_interval);
});

onMounted(async () => {
  resyncing_interval = setInterval(() => resync.value++, 10000);

  // ======= Handle Wallet Events =======
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

.vs-sidebar.is-reduce
  .vs-sidebar-item__text
    margin-left 0 !important

.vs-switch__text.is-on
  align-items normal

.v-dropdown-container
  background none !important

.btn
  font-size .9em
  i
    margin-right .5em

.ares_btn
  background rgba(#212121, .3)
  backdrop-filter blur(12px)
  padding 1em 2em
  border-radius 3px
  text-transform uppercase
  font-weight 900
  cursor pointer
  border 1px solid rgba(black .4)
  font-size .9em
  text-shadow 0 0 3px black
  color #eee
  display flex
  justify-content center
  box-shadow 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)
  transition all 0.3s cubic-bezier(.25,.8,.25,1)
  &:hover
    box-shadow 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)
  &.disabled
    opacity .5
    cursor default
    pointer-events none

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

.material-1
  box-shadow 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)
  transition all 0.3s cubic-bezier(.25,.8,.25,1)

.material-1:hover
  box-shadow 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)

.material-2
  box-shadow 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)


.material-3
  box-shadow 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)


.material-4
  box-shadow 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)


.material-5
  box-shadow 0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)
</style>
