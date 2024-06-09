<i18n>
en:
  item_sold: was sold
fr:
  item_sold: a été vendu
</i18n>

<template lang="pug">
router-view
</template>

<script setup>
import { onUnmounted, onMounted, provide, ref, reactive } from 'vue';
import deep_equal from 'fast-deep-equal';
import { useI18n } from 'vue-i18n';

import {
  context,
  current_character,
  current_locked_character,
} from './core/game/game.js';
import { enoki_address, enoki_wallet } from './core/sui/enoki.js';
import { SUI_EMITTER } from './core/modules/sui_data.js';
import toast from './toast.js';
import {
  pretty_print_mists,
  sui_get_my_listings,
  sui_get_policies_profit,
} from './core/sui/client.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore
const name = 'app';

const { t } = useI18n();

const sidebar_reduced = ref(false);
const game_visible = ref(false);

const available_accounts = ref([]);
const current_wallet = ref(null);
const current_address = ref(null);
const current_account = ref(null);
const sui_balance = ref(null);
const online = ref(false);
const inventory_counter = ref(1);

const server_info = reactive({
  online_players: 0,
  max_players: 0,
  online_characters: 0,
});

const characters = ref([]);
const selected_character = ref(null);
const extension_items = ref([]);
const owned_items = ref([]);

const in_fight = ref(false);

const equipment = reactive({
  relic_1: null,
  relic_2: null,
  relic_3: null,
  relic_4: null,
  relic_5: null,
  relic_6: null,
  title: null,
  amulet: null,
  weapon: null,
  left_ring: null,
  belt: null,
  right_ring: null,
  boots: null,
  hat: null,
  cloack: null,
  pet: null,
});

const selected_category = ref('equipment');
const selected_item = ref(null);
const edit_mode = ref(false);
const edit_mode_equipment = reactive({
  relic_1: null,
  relic_2: null,
  relic_3: null,
  relic_4: null,
  relic_5: null,
  relic_6: null,
  title: null,
  amulet: null,
  weapon: null,
  left_ring: null,
  belt: null,
  right_ring: null,
  boots: null,
  hat: null,
  cloack: null,
  pet: null,
  dragged_item: null,
  dragg_started_from: null,
  equipments: [],
});

const my_listings = ref([]);

const vue_locked_characters = ref(null);
const vue_unlocked_characters = ref(null);

const admin = reactive({
  character_profits: 0n,
  item_profits: 0n,
  admin_caps: [],
});

// thoses are only filled in the workshop tab
const recipes = ref([]);
const owned_tokens = ref([]);
const finished_crafts = ref([]);

provide('sidebar_reduced', sidebar_reduced);
provide('game_visible', game_visible);
provide('available_accounts', available_accounts);
provide('current_wallet', current_wallet);
provide('current_address', current_address);
provide('current_account', current_account);
provide('sui_balance', sui_balance);
provide('online', online);
provide('server_info', server_info);
provide('characters', characters);
provide('selected_character', selected_character);
provide('extension_items', extension_items);
provide('owned_items', owned_items);
provide('equipment', equipment);
provide('inventory_counter', inventory_counter);

provide('in_fight', in_fight);

provide('selected_item', selected_item);
provide('selected_category', selected_category);
provide('edit_mode', edit_mode);
provide('edit_mode_equipment', edit_mode_equipment);
provide('my_listings', my_listings);
provide('locked_characters', vue_locked_characters);
provide('unlocked_characters', vue_unlocked_characters);
provide('owned_tokens', owned_tokens);

provide('admin', admin);
provide('recipes', recipes);
provide('finished_crafts', finished_crafts);

function update_all(state) {
  const {
    sui: {
      selected_wallet_name,
      wallets,
      balance,
      tokens,
      selected_address,
      locked_characters,
      unlocked_characters,
      locked_items,
      unlocked_items,
      items_for_sale,
    },
    sui,
    selected_character_id,
    online: state_online,
  } = state;

  const selected_wallet = wallets[selected_wallet_name];
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

  const characters_ids = locked_characters
    .map(character => character.id)
    .filter(id => id !== selected_character_id);

  // @ts-ignore
  const last_characters_ids = characters.value.map(character => character.id);

  if (characters_ids.join() !== last_characters_ids.join())
    characters.value = locked_characters.filter(
      character => character.id !== selected_character_id,
    );

  if (sui.finished_crafts.length !== finished_crafts.value.length)
    finished_crafts.value = sui.finished_crafts;

  const locked_ids = locked_characters.map(c => c.id);
  const unlocked_ids = unlocked_characters.map(c => c.id);

  // @ts-ignore
  if (locked_ids.join() !== vue_locked_characters.value?.map(c => c.id).join())
    vue_locked_characters.value = locked_characters;

  if (
    // @ts-ignore
    unlocked_ids.join() !== vue_unlocked_characters.value?.map(c => c.id).join()
  )
    vue_unlocked_characters.value = unlocked_characters;

  if (
    selected_character_id &&
    // @ts-ignore
    selected_character.value?.id !== selected_character_id
  ) {
    selected_character.value = current_character(state);
  } else if (!selected_character_id) {
    selected_character.value = null;
  }

  if (!deep_equal(locked_items, extension_items.value))
    extension_items.value = locked_items;

  if (!deep_equal(unlocked_items, owned_items.value))
    owned_items.value = unlocked_items;

  if (!deep_equal(items_for_sale, my_listings.value))
    my_listings.value = items_for_sale;

  if (accounts_addresses.join() !== available_accounts_addresses.join())
    available_accounts.value = accounts.filter(
      ({ address }) => address !== selected_address,
    );

  if (balance !== sui_balance.value) sui_balance.value = balance;

  if (
    tokens.map(({ amount }) => amount.toString()).join() !==
    owned_tokens.value
      // @ts-ignore
      .map(({ amount }) => amount.toString())
      .join()
  )
    owned_tokens.value = tokens;

  if (current_wallet.value?.name !== selected_wallet_name)
    // @ts-ignore
    current_wallet.value = selected_wallet;

  if (admin.admin_caps.length !== sui.admin_caps.length) {
    admin.admin_caps = sui.admin_caps;
    if (sui.admin_caps.length)
      sui_get_policies_profit().then(({ character_profits, item_profits }) => {
        admin.character_profits = character_profits;
        admin.item_profits = item_profits;
      });
    else {
      admin.character_profits = 0n;
      admin.item_profits = 0n;
    }
  }

  if (!selected_wallet) {
    available_accounts.value = [];
    current_address.value = null;
    current_account.value = null;
  }

  if (selected_address !== current_address.value) {
    current_address.value = selected_address;
    current_account.value = { ...selected_account };
  }

  // @ts-ignore
  if (current_account.value?.alias !== selected_account?.alias)
    current_account.value = selected_account;

  if (state_online !== online.value) online.value = state_online;

  if (selected_character.value) {
    const character = current_locked_character(state);
    if (character) {
      const {
        relic_1,
        relic_2,
        relic_3,
        relic_4,
        relic_5,
        relic_6,
        title,
        amulet,
        weapon,
        left_ring,
        belt,
        right_ring,
        boots,
        hat,
        cloack,
        pet,
      } = character;

      let equipment_changed = false;

      // @ts-ignore
      if (relic_1?.id !== equipment.relic_1?.id) {
        equipment_changed = true;
        equipment.relic_1 = relic_1;
      }
      // @ts-ignore
      if (relic_2?.id !== equipment.relic_2?.id) {
        equipment_changed = true;
        equipment.relic_2 = relic_2;
      }
      // @ts-ignore
      if (relic_3?.id !== equipment.relic_3?.id) {
        equipment_changed = true;
        equipment.relic_3 = relic_3;
      }
      // @ts-ignore
      if (relic_4?.id !== equipment.relic_4?.id) {
        equipment_changed = true;
        equipment.relic_4 = relic_4;
      }
      // @ts-ignore
      if (relic_5?.id !== equipment.relic_5?.id) {
        equipment_changed = true;
        equipment.relic_5 = relic_5;
      }
      // @ts-ignore
      if (relic_6?.id !== equipment.relic_6?.id) {
        equipment_changed = true;
        equipment.relic_6 = relic_6;
      }
      // @ts-ignore
      if (title?.id !== equipment.title?.id) {
        equipment_changed = true;
        equipment.title = title;
      }
      // @ts-ignore
      if (amulet?.id !== equipment.amulet?.id) {
        equipment_changed = true;
        equipment.amulet = amulet;
      }
      // @ts-ignore
      if (weapon?.id !== equipment.weapon?.id) {
        equipment_changed = true;
        equipment.weapon = weapon;
      }
      // @ts-ignore
      if (left_ring?.id !== equipment.left_ring?.id) {
        equipment_changed = true;
        equipment.left_ring = left_ring;
      }
      // @ts-ignore
      if (belt?.id !== equipment.belt?.id) {
        equipment_changed = true;
        equipment.belt = belt;
      }
      // @ts-ignore
      if (right_ring?.id !== equipment.right_ring?.id) {
        equipment_changed = true;
        equipment.right_ring = right_ring;
      }
      // @ts-ignore
      if (boots?.id !== equipment.boots?.id) {
        equipment_changed = true;
        equipment.boots = boots;
      }
      // @ts-ignore
      if (hat?.id !== equipment.hat?.id) {
        equipment_changed = true;
        equipment.hat = hat;
      }
      // @ts-ignore
      if (cloack?.id !== equipment.cloack?.id) {
        equipment_changed = true;
        equipment.cloack = cloack;
      }
      // @ts-ignore
      if (pet?.id !== equipment.pet?.id) {
        equipment_changed = true;
        equipment.pet = pet;
      }

      if (equipment_changed) {
        inventory_counter.value++;
      }
    }
  }
}

function on_server_info(event) {
  const { playerCount, maxPlayers } = event;

  server_info.online_players = playerCount;
  server_info.max_players = maxPlayers;
}

onMounted(async () => {
  context.events.on('STATE_UPDATED', update_all);
  update_all(context.get_state());

  context.events.on('packet/serverInfo', on_server_info);

  const address = enoki_address();

  if (address) {
    // @ts-ignore
    context.dispatch('action/register_wallet', enoki_wallet());
    context.dispatch('action/select_wallet', 'Enoki');
    context.dispatch('action/select_address', address);
  }
});

onUnmounted(() => {
  context.events.off('STATE_UPDATED', update_all);
  context.events.off('packet/serverInfo', on_server_info);
});
// @ts-ignore
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

.vs-sidebar-item.play
  text-shadow 1px 2px 3px black
  background linear-gradient(to right, #FBC02D, #EF6C00)

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

.drv
  border none

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
