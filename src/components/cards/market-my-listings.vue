<i18n>
en:
  withdraw: Withdraw
fr:
  withdraw: Retirer
</i18n>

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
      .sui {{ mists_to_sui(listing.list_price) }}
      TokenBrandedSui.icon
      vs-button.btn(type="gradient" color="#0277BD" size="small" @click="() => delist_item(listing)") {{ t('withdraw') }}
</template>

<script setup>
import { onMounted, inject } from 'vue';
import { useI18n } from 'vue-i18n';

import { mists_to_sui, sui_delist_item } from '../../core/sui/client.js';
import {
  decrease_loading,
  increase_loading,
} from '../../core/utils/loading.js';

// @ts-ignore
import TokenBrandedSui from '~icons/token-branded/sui';

const { t } = useI18n();
const selected_item = inject('selected_item');
const my_listings = inject('my_listings');

function select_item(item) {
  selected_item.value = item;
}

async function delist_item(item) {
  increase_loading();
  try {
    await sui_delist_item(item);
  } catch (error) {
    console.error(error);
  }
  decrease_loading();
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
