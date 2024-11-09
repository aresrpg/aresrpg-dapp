<template lang="pug">
sectionContainer
  tabs.tabs_(:tabs="shop_tabs" :spaced="true" :nobg="true" :noborder="true")
    template(#tab="{ tab, active }")
      vs-button(type="transparent" size="small" color="#90CAF9" :active="active").name {{ t(`APP_TAB_SHOP_${tab.toUpperCase()}`) }}
    template(#content="{ data, tab }")
      .buy-page(v-if="tab === 'buy'")
        .left
          marketCategories
        .right
          itemDescription
          marketListings
      .faucet-page(v-else-if="tab === 'faucet'")
        faucetCard(v-for="token in faucet_tokens" :token="token")
      .mint-page(v-else-if="tab === 'mint'")
        sectionHeader(:title="t('APP_TAB_SHOP_MINT_TITLE')" :desc="t('APP_TAB_SHOP_MINT_HEADER')" color="#FFC107")
        .mints
          mintCard(v-for="mint in mints" :mint="mint" :has_key="false")
      .sell-page(v-else-if="tab === 'sell'")
        .selling
          marketMyListings
        .inv
          .desc
            itemDescription
          .buttons(v-if="show_sell_buttons")
            .input
              vs-input.vinput(
                type="number"
                v-model="requested_list_price"
                icon-after
              )
                template(#icon)
                  TokenSui
                template(#message-danger v-if="!is_price_valid") {{ t('APP_TAB_SHOP_WRONG_PRICE') }}
            vs-button(
              type="gradient"
              size="small"
              color="#A4C400"
              @click="() => sell(1)"
              :disabled="!selected_item || !is_price_valid || selected_currently_listing"
            ) {{ t('APP_TAB_SHOP_SELL') }}
            vs-button(
              v-if="selected_item && get_item_total_amount(selected_item) >= 10 && select_item?.stackable"
              type="gradient"
              size="small"
              color="#60A917"
              @click="() => sell(10)"
              :disabled="!selected_item || !is_price_valid || selected_currently_listing"
            ) {{ t('APP_TAB_SHOP_SELL') }} x10
            vs-button(
              v-if="selected_item && get_item_total_amount(selected_item) >= 100 && select_item?.stackable"
              type="gradient"
              size="small"
              color="#008A00"
              @click="() => sell(100)"
              :disabled="!selected_item || !is_price_valid || selected_currently_listing"
            ) {{ t('APP_TAB_SHOP_SELL') }} x100
          .items
            itemInventory(:disable_edit="true" :sell_mode="true")

  /// revealed dialog
  vs-dialog(v-model="reveal_dialog")
    template(#header)
      span.dialog-header(:class="{ reveal_shiny }") {{ t('APP_TAB_SHOP_REVEALED') }}
    itemDescription
    template(#footer)
      .dialog-footer
        vs-button(type="transparent" color="#2ECC71" @click="(reveal_dialog = false, reveal_shiny = false)") {{ t('APP_TAB_SHOP_CLOSE') }}
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { inject, ref, provide, computed, onMounted, onUnmounted } from 'vue';
import { BigNumber as BN } from 'bignumber.js';
import { MIST_PER_SUI } from '@mysten/sui/utils';

import sectionContainer from '../components/misc/section-container.vue';
import sectionHeader from '../components/misc/section-header.vue';
import itemDescription from '../components/cards/item-description.vue';
import itemInventory from '../components/cards/item-inventory.vue';
import tabs from '../components/game-ui/tabs.vue';
import marketCategories from '../components/cards/market-categories.vue';
import marketListings from '../components/cards/market-listings.vue';
import marketMyListings from '../components/cards/market-my-listings.vue';
import mintCard from '../components/cards/mint-card.vue';
import { sdk, sui_list_item } from '../core/sui/client.js';
import { context } from '../core/game/game.js';
import faucetCard from '../components/cards/faucet-card.vue';
import toast from '../toast.js';
import { NETWORK } from '../env.js';
import { sui_get_vaporeon_mint } from '../core/sui/temp_vaporeon_mint.js';
import { SUI_EMITTER } from '../core/modules/sui_data.js';

// @ts-ignore
import TokenSui from '~icons/token/sui';

const { t } = useI18n();
const router = useRouter();

const filtered_category = ref('relic');

provide('filtered_category', filtered_category);

const selected_item = inject('selected_item');
const selected_category = inject('selected_category');
const online = inject('online');

const mints = ref([]);
const reveal_dialog = ref(false);
const reveal_shiny = ref(false);

function reveal_mint({ item, shiny }) {
  selected_item.value = item;
  reveal_dialog.value = true;
  reveal_shiny.value = shiny;
}

onMounted(async () => {
  const minted = await sui_get_vaporeon_mint();
  // @ts-ignore
  mints.value.push({
    name: 'Vaporeon',
    image_url: 'https://assets.aresrpg.world/item/vaporeon.png',
    price: 60 * 1000000000,
    contract: sdk.VAPOREON.split('::')[0],
    minted,
    max_mint: 1000,
  });

  SUI_EMITTER.on('VaporeonMintEvent', reveal_mint);
});

onUnmounted(() => {
  SUI_EMITTER.off('VaporeonMintEvent', reveal_mint);
});

const shop_tabs = {
  buy: {},
  sell: {},
  ...(NETWORK === 'testnet' && { faucet: {} }),
  mint: {},
};

const faucet_tokens = Object.values(sdk.SUPPORTED_TOKENS);

const selected_item_type = ref(null);
const requested_list_price = ref(1);

provide('selected_item_type', selected_item_type);

const show_sell_buttons = computed(() => {
  return selected_item && !selected_item.value?.list_price;
});

function get_item_total_amount(item) {
  return (
    item.amount +
    context
      .get_state()
      .sui.unlocked_items.reduce((acc, { id, item_type, amount }) => {
        if (item.id !== id && item.item_type === item_type) return acc + amount;
        return acc;
      }, 0)
  );
}

const is_price_valid = computed(() => {
  try {
    const price = requested_list_price.value;
    BigInt(new BN(price).multipliedBy(MIST_PER_SUI.toString()).toString());
    return price >= 0.01 && price <= 1000000;
  } catch (error) {
    return false;
  }
});

const currently_listing = ref([]);

const selected_currently_listing = computed(() =>
  // @ts-ignore
  currently_listing.value.includes(selected_item.value?.id),
);

async function sell(quantity) {
  if (!selected_item.value) return;

  const listed_id = selected_item.value.id;

  const tx = toast.tx(t('APP_TAB_SHOP_LISTING'), selected_item.value.name);
  // @ts-ignore
  currently_listing.value.push(selected_item.value.id);
  try {
    await sui_list_item({
      item: selected_item.value,
      amount: quantity,
      price: requested_list_price.value,
    });
    tx.update('success', t('APP_TAB_SHOP_LISTED'));
  } catch (error) {
    tx.update('error', t('APP_TAB_SHOP_FAILED_TO_LIST'));
    console.error(error);
  } finally {
    currently_listing.value = currently_listing.value.filter(
      id => id !== listed_id,
    );
  }
}
</script>

<style lang="stylus" scoped>
.tabs_
  height 100%
.name
  margin 0 1em
  text-transform uppercase
  font-size .8em
  font-weight bold

.buy-page
  display flex
  flex-flow row nowrap
  justify-content space-between
  height 100%
  >*
    border-radius 5px
    padding .5em
  .left
    width 40%
    margin-right 1em
    display flex
    flex-flow column nowrap
    background linear-gradient(to bottom, rgba(#212121, .6), transparent 50%)
  .right
    width 60%
    background linear-gradient(to bottom, rgba(#212121, .6), transparent 50%)
    display flex
    flex-flow column nowrap
.faucet-page
  display flex
  padding 1em
.sell-page
  display flex
  flex-flow row nowrap
  justify-content space-between
  height 100%
  z-index 10
  .selling
    width 49%
    background linear-gradient(to bottom, rgba(#212121, .6), transparent 50%)
    border-radius 12px
    height 100%
  .inv
    width 49%
    display flex
    flex-flow column nowrap
    padding 1em
    background linear-gradient(to bottom, #212121, rgba(#455A64, .3) 50%)
    border-radius 12px
    .desc
      margin-bottom 1em
    .buttons
      display flex
      flex-flow row nowrap
      justify-content flex-end
      >*
        margin-right .5em
      .input
        margin-right .5em
    .items
      border 1px solid rgba(#eee, .3)
      padding .5em
      margin-top 1em
      border-radius 12px
.reveal_shiny
  color gold
  text-shadow 1px 2px 1px black
  background linear-gradient(to bottom, #212121, #455A64)
</style>
