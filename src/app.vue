<template lang="pug">
router-view
</template>

<script setup>
import { onUnmounted, onMounted, provide, ref, reactive } from 'vue';

import { context } from './core/game/game.js';
import { is_chain_supported } from './core/utils/sui/is_chain_supported.js';
// internal vuejs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const name = 'app';

const sidebar_reduced = ref(false);
const game_visible = ref(false);

const available_accounts = ref([]);
const current_wallet = ref(null);
const current_network = ref('mainnet');
const current_address = ref(null);
const current_account = ref(null);
const sui_balance = ref(null);
const network_supported = ref(false);
const online = ref(false);

const server_info = reactive({
  online_players: 0,
  max_players: 0,
  online_characters: 0,
});

provide('sidebar_reduced', sidebar_reduced);
provide('game_visible', game_visible);
provide('available_accounts', available_accounts);
provide('current_wallet', current_wallet);
provide('current_network', current_network);
provide('current_address', current_address);
provide('current_account', current_account);
provide('sui_balance', sui_balance);
provide('network_supported', network_supported);
provide('online', online);
provide('server_info', server_info);

function update_accounts({
  sui,
  sui: { selected_wallet_name, wallets, balance, selected_address },
  online: state_online,
}) {
  const selected_wallet = wallets[selected_wallet_name];
  const is_network_supported = is_chain_supported(sui);
  const accounts = selected_wallet?.accounts ?? [];
  const accounts_addresses = accounts.filter(
    ({ address }) => address !== selected_address,
  );
  const available_accounts_addresses = available_accounts.value.map(
    ({ address }) => address,
  );
  const selected_account = accounts.find(
    ({ address }) => address === selected_address,
  );
  const network = selected_wallet?.chain.split(':')[1];

  if (network_supported.value !== is_network_supported)
    network_supported.value = is_network_supported;

  if (accounts_addresses.join() !== available_accounts_addresses.join())
    available_accounts.value = accounts.filter(
      ({ address }) => address !== selected_address,
    );

  if (network !== current_network.value) current_network.value = network;
  if (balance !== sui_balance.value) sui_balance.value = balance;
  // @ts-ignore
  if (current_wallet.value?.name !== selected_wallet_name)
    current_wallet.value = selected_wallet;

  if (!selected_wallet) {
    available_accounts.value = [];
    current_address.value = null;
    current_account.value = null;
  }

  if (selected_address !== current_address.value) {
    current_address.value = selected_address;
    current_account.value = { ...selected_account };
  }

  if (current_account.value?.alias !== selected_account?.alias)
    current_account.value = selected_account;

  if (state_online !== online.value) online.value = state_online;
}

function on_server_info(event) {
  const { playerCount, maxPlayers } = event;

  server_info.online_players = playerCount;
  server_info.max_players = maxPlayers;
}

onMounted(() => {
  context.events.on('STATE_UPDATED', update_accounts);
  update_accounts(context.get_state());

  context.events.on('packet/serverInfo', on_server_info);
});

onUnmounted(() => {
  context.events.off('STATE_UPDATED', update_accounts);
  context.events.off('packet/serverInfo', on_server_info);
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
