<i18n>
en:
  claim: Claim all
fr:
  claim: Tout récupérer
</i18n>

<template lang="pug">
.inbox-container
  vs-table
    template(#thead)
      .fake-claim
      .claim
        vs-button(type="gradient" size="small" color="#F9A825" @click="claim_all") {{ t('claim') }}
    template(#tbody)
      vs-tr(v-for="item in compacted_items" :key="item.id" :data="item")
        vs-td
          img.icon(:src="`/item/${item.item_type}.jpg`")
        vs-td {{ item.name }}
        vs-td {{ item.item_category }}
        vs-td x{{ item.amount }}
        vs-td.id(@click="() => open_explorer(item.id)") {{ short_id(item.id) }}
        template(#expand)
          itemDescription(:item="item")
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { NETWORK } from '../../env.js';
import { key_from_item } from '../../core/utils/item.js';
import { sui_withdraw_items_from_extension } from '../../core/sui/client.js';

import itemDescription from './item-description.vue';

const { t } = useI18n();

const props = defineProps(['items']);

const short_id = id => `${id.slice(0, 3)}..${id.slice(-3)}`;

async function claim_all() {
  await sui_withdraw_items_from_extension(props.items.map(item => item.id));
}

const open_explorer = id => {
  window.open(`https://suiscan.xyz/${NETWORK}/object/${id}`, '_blank');
};

const compacted_items = computed(() => {
  console.log(props.items);

  return [
    ...props.items
      .map(item => ({ ...item, amount: 1 }))
      .reduce((items, item) => {
        const key = key_from_item(item);
        const existing_item = items.get(key);

        if (existing_item) {
          existing_item.amount += item.amount;
        } else {
          items.set(key, { ...item });
        }

        return items;
      }, new Map())
      .values(),
  ];
});
</script>

<style lang="stylus" scoped>
.inbox-container
  border 2px solid #FDD835
  padding 1em
  padding-top 0
  border-radius 12px
  border-top none
  border-top-left-radius 0
  border-top-right-radius 0
  position relative

  .fake-claim
    height 40px

  img.icon
    width 40px
    height @width
    object-fit contain
    border-radius 5px
    overflow hidden
    filter drop-shadow(1px 2px 3px black)

  .claim
    position absolute
    display flex
    right .5em
    top 0
    align-items flex-end

  .id
    cursor: pointer
    text-decoration: underline
</style>
