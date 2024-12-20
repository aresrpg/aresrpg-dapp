<template lang="pug">
.my-listings
  .listing(
    v-for="(listing, index) in my_listings"
    :key="listing?.id"
    @click="() => select_item(listing)"
    :class="{ stripped: index % 2, selected: selected_item?.id === listing.id }"
  )
    img.icon(:src="listing.image_url" alt="listing image")
    .name {{ listing.name }}
    .amount (x{{ listing.amount }})
    .price
      .sui {{ listing.list_price }}
      TokenBrandedSui.icon
      vs-button.btn(type="gradient" color="#0277BD" size="small" @click="() => delist_item(listing)" :disabled="delisting_items.includes(listing.id)") {{ t('APP_MARKET_WITHDRAW') }}
</template>

<script setup>
import { inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { mists_to_sui, sui_delist_item } from '../../core/sui/client.js';
import toast from '../../toast.js';

// @ts-ignore
import TokenBrandedSui from '~icons/token-branded/sui';

const { t } = useI18n();
const selected_item = inject('selected_item');
const my_listings = inject('my_listings');

function select_item(item) {
  selected_item.value = item;
}

const delisting_items = ref([]);

async function delist_item(item) {
  const tx = toast.tx(t('APP_MARKET_DELISTING'), item.name);
  delisting_items.value.push(item.id);
  try {
    await sui_delist_item(item);
    tx.update('success', t('APP_MARKET_DELISTED'));
  } catch (error) {
    console.error(error);
    tx.update('error', t('APP_MARKET_FAILED_TO_DELIST'));
  }
  delisting_items.value = delisting_items.value.filter(id => id !== item.id);
}
</script>

<style lang="stylus" scoped>
.my-listings
  display flex
  flex-flow column nowrap
  height 100%
  overflow hidden
  overflow-y auto
  .listing
    display grid
    grid "icon name amount price" 50px / 50px 1fr 50px max-content
    align-items center
    cursor pointer
    padding 0 .5em
    &.selected
      background-color rgba(crimson, .1) !important
    &.stripped
      background-color rgba(black, .1)
    img.icon
      width 35px
      height @width
      object-fit contain
      border-radius 5px
      filter drop-shadow(1px 2px 3px rgba(black, .3))
    .name
      font-size .9em
      margin-right 1em
      text-overflow ellipsis
      white-space nowrap
      overflow hidden

    .amount
      font-size .8em
      opacity .7
      margin-right 5px
      place-self center end
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
</style>
