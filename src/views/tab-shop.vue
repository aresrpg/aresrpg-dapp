<i18n>
  en:
    shop: 🥐 Market
    sell: Sell
    buy: Buy
    wrong_price: Invalid price
    listing: Listing in the market
    listed: Listed
    failed_to_list: Failed to list item
  fr:
    shop: 🥐 Hôtel des Ventes
    sell: Vendre
    buy: Acheter
    wrong_price: Prix invalide
    listing: Mise en vente
    listed: Listé avec succès
    failed_to_list: Échec de la mise en vente
</i18n>

<template lang="pug">
sectionContainer
  tabs.tabs_(:tabs="shop_tabs" :spaced="true" :nobg="true")
    template(#tab="{ tab }")
      .name {{ t(tab) }}
    template(#content="{ data, tab }")
      .buy-page(v-if="tab === 'buy'")
        .left
          marketCategories
        .right
          itemDescription
          marketListings
      .sell-page(v-else-if="tab === 'sell'")
        .selling
          marketMyListings
        .inv
          .desc
            itemDescription
          .buttons(v-if="selected_item && !selected_item.list_price")
            .input
              vs-input.vinput(
                type="number"
                v-model="requested_list_price"
                icon-after
              )
                template(#icon)
                  TokenSui
                template(#message-danger v-if="!is_price_valid") {{ t('wrong_price') }}
            vs-button(
              type="gradient"
              size="small"
              color="#A4C400"
              @click="() => sell(1)"
              :disabled="!selected_item || !is_price_valid || selected_currently_listing"
            ) {{ t('sell') }}
            vs-button(
              v-if="selected_item && get_item_total_amount(selected_item) >= 10"
              type="gradient"
              size="small"
              color="#60A917"
              @click="() => sell(10)"
              :disabled="!selected_item || !is_price_valid || selected_currently_listing"
            ) {{ t('sell') }} x10
            vs-button(
              v-if="selected_item && get_item_total_amount(selected_item) >= 100"
              type="gradient"
              size="small"
              color="#008A00"
              @click="() => sell(100)"
              :disabled="!selected_item || !is_price_valid || selected_currently_listing"
            ) {{ t('sell') }} x100
          .items
            itemInventory(:disable_edit="true" :sell_mode="true")
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { inject, ref, provide, computed } from 'vue';
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
import { sui_list_item } from '../core/sui/client.js';
import { context } from '../core/game/game.js';
import toast from '../toast.js';

// @ts-ignore
import TokenSui from '~icons/token/sui';

const { t } = useI18n();
const router = useRouter();

const filtered_category = ref('relic');

provide('filtered_category', filtered_category);

const selected_item = inject('selected_item');
const selected_category = inject('selected_category');

const shop_tabs = {
  buy: {},
  sell: {},
};

const owned_items = inject('owned_items');

const selected_item_type = ref(null);
const requested_list_price = ref(1);

provide('selected_item_type', selected_item_type);

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
  currently_listing.value.includes(selected_item.value?.id),
);

async function sell(quantity) {
  if (!selected_item.value) return;

  const listed_id = selected_item.value.id;

  const tx = toast.tx(t('listing'), selected_item.value.name);
  currently_listing.value.push(selected_item.value.id);
  try {
    await sui_list_item({
      item: selected_item.value,
      amount: quantity,
      price: requested_list_price.value,
    });
    tx.update('success', t('listed'));
  } catch (error) {
    tx.update('error', t('failed_to_list'));
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
      .input
        margin-right .5em
    .items
      border 1px solid rgba(#eee, .3)
      padding .5em
      margin-top 1em
      border-radius 12px
</style>
