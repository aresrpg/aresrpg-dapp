<template lang="pug">
.categories
  .select
    .filter-category
      span {{ t('APP_MARKET_CATEGORY') }}:
      vs-select(filter default-first-option v-model="filtered_category" :placeholder="t('APP_MARKET_CHOOSE')")
        vs-option-group(:label="t('APP_MARKET_EQUIPMENT')")
          vs-option(
            v-for="item in EQUIPMENTS"
            :label="t(`APP_ITEM_${item.toUpperCase()}`)" :value="item"
          )
        vs-option-group(:label="t('APP_ITEM_WEAPON')")
          vs-option(
            v-for="item in WEAPONS"
            :label="t(`APP_ITEM_${item.toUpperCase()}`)" :value="item"
          )
        vs-option-group(:label="t('APP_MARKET_CONSUMABLES')")
          vs-option(
            v-for="item in CONSUMABLES"
            :label="t(`APP_ITEM_${item.toUpperCase()}`)" :value="item"
          )
        vs-option-group(:label="t('APP_MARKET_MISC')")
          vs-option(
            v-for="item in MISC"
            :label="t(`APP_ITEM_${item.toUpperCase()}`)" :value="item"
          )
    //- .names
    //-   span {{ t('APP_MARKET_NAME') }}:
    //-   vs-select(filter default-first-option v-model="filtered_name" :placeholder="t('APP_MARKET_CHOOSE_NAME')")
    //-     vs-option(
    //-       v-for="item_name in Object.keys(currently_listed_items_names)"
    //-       :label="item_name" :value="item_name" :key="item_name"
    //-     )
  .all
    .none(v-if="!available_types.length") {{ t('APP_MARKET_NO_ITEMS') }}
    .type.material-1(v-else v-for="available_type in available_types" :key="available_type.name" @click="() => select_item(available_type)")
      img.icon(:src="available_type.image_url" alt="listing image")
      .right
        span.name {{ available_type.name }}
        .bottom
          .listed
            span {{ t('APP_MARKET_LISTED') }}:
            span.count {{ available_type.item_count }}
          .floor
            span {{ t('APP_MARKET_FLOOR') }}:
            span.count.price {{ pretty_print_mists(available_type.price_floor) }}
            TokenSui(:style="{ fontSize: '.7em', color: '#90CAF9' }")
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import {
  EQUIPMENTS,
  WEAPONS,
  CONSUMABLES,
  MISC,
} from '@aresrpg/aresrpg-sdk/items';
import { watch, ref, inject, onMounted, onUnmounted } from 'vue';

import { VITE_INDEXER_URL } from '../../env.js';
import { pretty_print_mists } from '../../core/sui/client.js';
// @ts-ignore
import { context } from '../../core/game/game.js';

// @ts-ignore
import TokenSui from '~icons/token/sui';

const { t } = useI18n();
const filtered_category = inject('filtered_category');
const filtered_name = ref();
const selected_item_type = inject('selected_item_type');
const selected_item = inject('selected_item');
const currently_listed_items_names = inject('currently_listed_items_names');

const available_types = ref([]);

function select_item(item) {
  if (selected_item_type.value !== item.item_type) selected_item.value = null;
  selected_item_type.value = item.item_type;
}

watch(filtered_name, name => {
  if (!name) return;
  const category = currently_listed_items_names.value[name];
  if (category) filtered_category.value = category;
});

watch(
  filtered_category,
  (category, last_category) => {
    if (category === last_category) return;
    selected_item.value = null;
    available_types.value = [];
    context.send_packet('packet/marketCategoryItemsRequest', {
      category,
    });
  },
  { immediate: true },
);

function handle_market_category_items_response({ items }) {
  const received_types = items.map(item => item.item_type);
  // update available types with new items and keep non updated ones
  available_types.value = [
    ...available_types.value.filter(
      available_type => !received_types.includes(available_type.item_type),
    ),
    // filtering out items without image_url because the server will send `null` if there are no more items (to remove them)
    ...items.filter(({ image_url }) => !!image_url),
  ];
}

onMounted(() => {
  context.events.on(
    'packet/marketCategoryItems',
    handle_market_category_items_response,
  );
});

onUnmounted(() => {
  context.events.off(
    'packet/marketCategoryItems',
    handle_market_category_items_response,
  );
  context.send_packet('packet/marketCategoryItemsRequest', {
    category: null,
  });
});
</script>

<style lang="stylus" scoped>
.categories
  display flex
  flex-flow column nowrap
  height 100%
  .select
    display flex
    justify-content space-evenly
    flex-flow row nowrap
    align-items center
    >span
      font-size .8em
      opacity .8
  .all
    padding .25em
    height 100%
    margin-top 1em
    .none
      font-size .8em
      opacity .5
      text-align center
    .type
      position relative
      display flex
      flex-flow row nowrap
      justify-content space-between
      align-items center
      padding .5em 1em
      margin-bottom .2em
      border 1px solid rgba(white, .3)
      background rgba(#eee, .1)
      cursor pointer
      span
        font-size .7em
        text-transform uppercase
        font-weight bold
      img.icon
        user-select none
        width 40px
        height @width
        object-fit contain
        border-radius 5px
        filter drop-shadow(1px 2px 3px rgba(black, .3))
      .right
        display flex
        flex-flow column nowrap
        align-items end
        justify-content center
        span.name
          font-size .9em
          opacity .7
          text-shadow 1px 2px 1px #212121
      .bottom
        display flex
        flex-flow row nowrap
        >div
          display flex
          flex-flow row nowrap
          align-items center
          justify-content center
          margin-left 10px
          span
            text-transform capitalize
            font-size .7em
            font-weight 400
            &.count
              font-weight 100
              margin-left .25em
              color #FFC107
              margin-right .25em
            &.price
              color #90CAF9
</style>
