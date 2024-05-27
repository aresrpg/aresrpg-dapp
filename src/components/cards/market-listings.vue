<i18n>
en:
  buy: Buy
  buy_confirm: Confirm purchase
  buy_confirm_desc: Are you sure you want to buy {0} for {1} ?
  cancel: Cancel
  confirm: Pay now
  buy_success: Purchase successful
  insufficient_funds: You are way to broke to afford this precious item..
fr:
  buy: Acheter
  buy_confirm: Confirmer l'achat
  buy_confirm_desc: Êtes-vous sûr de vouloir acheter {0} pour {1} ?
  cancel: Annuler
  confirm: Payer
  buy_success: Achat réussi
  insufficient_funds: Vous êtes trop fauché pour acheter cet objet précieux..
</i18n>

<template lang="pug">
.listings-container
  .listing(
    v-for="(listing, index) in listings"
    :key="listing.id"
    @click="() => select_item(listing)"
    :class="{ stripped: index % 2, selected: selected_item.id === listing.id }"
  )
    img.icon(:src="listing.image_url" alt="listing image")
    .name {{ listing.name }}
    .price.x1
      .amount (x1)
      .sui {{ final_item_price(listing)?.toFixed?.(2) }}
      TokenBrandedSui.icon
      vs-button.btn(
        v-if="listing.seller !== current_address"
        type="gradient" color="#43A047" size="small" @click="() => start_buy_item(listing)") {{ t('buy') }}
    .price.x10(v-if="listing.amount === 10")
      .amount (x10)
    .price.x100(v-if="listing.amount === 100")
      .amount (x100)

  /// buy dialog
  vs-dialog(v-model="buy_dialog" :loading="buy_loading")
    template(#header) {{ t('buy_confirm') }}
    i18n-t(keypath="buy_confirm_desc")
      b.itemname {{ bought_item?.name }}
      b.price {{ final_item_price(bought_item)?.toFixed?.(2) }} Sui
    template(#footer)
      .dialog-footer
        vs-button(type="transparent" color="#E74C3C" @click="buy_dialog = false") {{ t('cancel') }}
        vs-button(type="transparent" color="#2ECC71" @click="buy_item") {{ t('confirm') }}
</template>

<script setup>
import { watch, ref, inject, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { BigNumber as BN } from 'bignumber.js';
import { MIST_PER_SUI } from '@mysten/sui.js/utils';

import { VITE_INDEXER_URL } from '../../env.js';
import { sui_buy_item, mists_to_sui } from '../../core/sui/client.js';
import { SUI_EMITTER } from '../../core/modules/sui_data.js';
import toast from '../../toast.js';

// @ts-ignore
import TokenBrandedSui from '~icons/token-branded/sui';
// @ts-ignore
import GameIconsPayMoney from '~icons/game-icons/pay-money';

const selected_item_type = inject('selected_item_type');
const selected_item = inject('selected_item');

const buy_dialog = ref(false);
const buy_loading = ref(false);
const bought_item = ref(null);
const current_address = inject('current_address');
const sui_balance = inject('sui_balance');

const listings = ref([]);
const { t } = useI18n();

function select_item(item) {
  selected_item.value = item;
}

function start_buy_item(item) {
  if (
    new BN(sui_balance.value)
      .dividedBy(MIST_PER_SUI.toString())
      .isLessThan(final_item_price(item))
  ) {
    toast.warn(t('insufficient_funds'), '', GameIconsPayMoney);
    return;
  }
  buy_dialog.value = true;
  bought_item.value = item;
}

function final_item_price(item) {
  if (!item.is_aresrpg_item && !item.is_aresrpg_character)
    return new BN(mists_to_sui(item.list_price));

  // Convert mists to Sui and create a BN instance of the price
  const price_in_sui = new BN(mists_to_sui(item.list_price));

  // Determine the royalty rate
  const royalty_rate = item.is_aresrpg_character
    ? 0.1
    : item.is_aresrpg_item
      ? 0.05
      : 0;

  // Calculate the royalty amount
  const calculated_royalty = price_in_sui.times(royalty_rate);

  // Apply the minimum royalty fee of 0.1 Sui
  const royalty_amount = BN.max(calculated_royalty, new BN(0.1));

  // Calculate the final price
  const final_price = price_in_sui.plus(royalty_amount);

  // Return the final price as a string with two decimal places
  return final_price.isGreaterThan(0.1) ? final_price : new BN(0.1);
}

async function buy_item() {
  if (!bought_item.value) return;
  buy_loading.value = true;
  try {
    select_item(bought_item.value);
    await sui_buy_item(bought_item.value);
    toast.success(t('buy_success'), '', GameIconsPayMoney);
  } catch (error) {
    console.error(error);
  }
  buy_loading.value = false;
  buy_dialog.value = false;
}

async function fetch_listings() {
  const result = await fetch(
    `${VITE_INDEXER_URL}/listings/${selected_item_type.value}`,
  );
  const { items, cursor } = await result.json();
  listings.value = items;
  if (items.length) select_item(items[0]);
}

watch(
  selected_item_type,
  async (type, last_type) => {
    if (type === last_type) return;
    await fetch_listings();
  },
  { immediate: true },
);

function on_item_purchased({ id }) {
  const listing_index = listings.value.findIndex(listing => listing.id === id);

  if (listing_index !== -1) {
    listings.value.splice(listing_index, 1);
  }
}

function on_item_delisted(item) {
  on_item_purchased(item);
}

onMounted(async () => {
  SUI_EMITTER.on('ItemPurchasedEvent', on_item_purchased);
  SUI_EMITTER.on('ItemDelistedEvent', on_item_delisted);
});

onUnmounted(() => {
  SUI_EMITTER.off('ItemPurchasedEvent', on_item_purchased);
  SUI_EMITTER.off('ItemDelistedEvent', on_item_delisted);
});
</script>

<style lang="stylus" scoped>
.listings-container
  display flex
  flex-flow column nowrap
  margin-top 1em
  .listing
    display grid
    grid "icon name x1 x10 x100" auto / 50px 1fr max-content max-content max-content
    align-items center
    cursor pointer
    &.stripped
      background-color rgba(black, .1)

    &.selected
      background-color rgba(#9FA8DA, .2)

    img.icon
      width 40px
      height @width
      object-fit contain
      border-radius 5px
      filter drop-shadow(1px 2px 3px rgba(black, .3))

    .name
      font-size .9em

    .price
      display flex
      flex-flow row nowrap
      font-size .9em
      align-items center
      border-left 1px solid rgba(white, .3)
      padding-left .5em
      .amount
        font-size .7em
        opacity .7
        width 30px
      .sui
        margin-left auto

    a.id
      font-size .8em
      text-decoration underline
      font-style italic
      cursor pointer
      opacity .7

.dialog-content
  display flex
  align-items center
  justify-content center
.dialog-footer
  display flex
  justify-content flex-end

b.itemname
  font-style italic
  color #9575CD

b.price
  font-style italic
  color #64B5F6
</style>
