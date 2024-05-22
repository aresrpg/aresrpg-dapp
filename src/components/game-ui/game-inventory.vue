<i18n>
en:
  claim_all: Claim all
fr:
  claim_all: Tout récupérer
</i18n>

<template lang="pug">
.game-inventory
  itemEquipments
  .item
    itemDescription(v-if="selected_item" :item="selected_item")
  .inventory
    .header
      img.equipment(src="../../assets/ui/equipment.svg" :class="{ selected: selected_category === 'equipment' }" @click="selected_category = 'equipment'")
      img.consumables(src="../../assets/ui/consumable.svg" :class="{ selected: selected_category === 'consumables' }" @click="selected_category = 'consumables'")
      img.misc(src="../../assets/ui/misc.svg" :class="{ selected: selected_category === 'misc' }" @click="selected_category = 'misc'")
      img.loot(src="../../assets/ui/loot.svg" :class="{ selected: selected_category === 'loot' }" @click="selected_category = 'loot'")
    itemInventory.i-inv
    vs-button.vsbtn(
      type="gradient"
      size="small"
      color="#F9A825"
      @click="claim_all"
      :loading="claim_loading"
      v-if="selected_category === 'loot' && extension_items.length"
    ) {{ t('claim_all') }}
</template>

<script setup>
import { ref, inject, provide, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import itemDescription from '../cards/item-description.vue';
import itemInventory from '../cards/item-inventory.vue';
import itemEquipments from '../cards/item-equipments.vue';
import { sui_withdraw_items_from_extension } from '../../core/sui/client.js';

const extension_items = inject('extension_items');
const owned_items = inject('owned_items');

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

provide('edit_mode', edit_mode);
provide('selected_item', selected_item);
provide('selected_category', selected_category);
provide('edit_mode_equipment', edit_mode_equipment);

const { t } = useI18n();

const claim_loading = ref(false);

async function claim_all() {
  claim_loading.value = true;
  try {
    await sui_withdraw_items_from_extension(extension_items.value);
  } catch (error) {
    console.error(error);
  } finally {
    claim_loading.value = false;
  }
}

watch(owned_items, items => {
  if (selected_item.value) {
    const target_item = items.find(item => item.id === selected_item.value.id);
    if (target_item) selected_item.value = target_item;
  }
});
</script>

<style lang="stylus" scoped>


.vsbtn
  margin-top 1em
  height 50px

.i-inv
  border 1px solid rgba(#eee, .3)
  border-radius 12px
  border-top-right-radius 0
  border-bottom-right-radius 0
  height 100%

.game-inventory
  display grid
  grid "perso inventory" 1fr "item inventory" 280px / 6fr 4fr
  grid-gap 1em
  height 100%
  width 80%
  max-width 900px
  .item
    grid-area item
    border 5px double #212121
    background linear-gradient(to bottom, #212121, rgba(#455A64, .7) 50%)
    border-radius 12px
    padding .5em
    font-size .9rem
  .inventory
    grid-area inventory
    border 5px double #212121
    border-radius 12px
    padding .25em
    padding-top .5em
    background linear-gradient(to bottom, #212121, rgba(#455A64, .3) 50%)
    display flex
    flex-flow column nowrap
    justify-content stretch
    .header
      display flex
      justify-content center
      margin-bottom 20px
      img
        width 50px
        margin 0 5px 0 0
        height @width
        padding .25em
        cursor pointer
        &.selected
          filter drop-shadow(1px 2px 3px #FFF59D)
    .content
      border 1px solid rgba(#eee, .3)
      // background rgba(#000, .3)
      border-radius 12px
      border-top-right-radius 0
      border-bottom-right-radius 0
      display flex
      width 100%
</style>
