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
</template>

<script setup>
import { ref, inject, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import itemDescription from '../cards/item-description.vue';
import itemInventory from '../cards/item-inventory.vue';
import itemEquipments from '../cards/item-equipments.vue';

const owned_items = inject('owned_items');
const selected_category = inject('selected_category');
const selected_item = inject('selected_item');

const { t } = useI18n();

const claim_loading = ref(false);

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
  height 100%

.game-inventory
  display grid
  grid "perso inventory" 1fr "item inventory" 280px / 6fr 4fr
  grid-gap 1em
  height 100%
  width 80%
  max-width 900px
  max-height 770px
  overflow-y auto
  padding-right 10px

  .item
    grid-area item
    border var(--ui-border)
    background var(--secondary)
    border-radius 12px
    padding .5em
    font-size .9rem
  .inventory
    grid-area inventory
    border var(--ui-border)
    border-radius 12px
    display flex
    flex-flow column nowrap
    justify-content stretch
    .header
      display flex
      justify-content center
      padding-top .5em
      padding-bottom 10px
      background var(--primary)
      border-radius 9px 9px 0px 0px
      img
        width 34px
        border-radius 6px
        margin 0 5px 0 0
        height @width
        padding .25em
        cursor pointer
        background-color #ff6100cc
        &.selected
          background-color var(--primary)
          border solid 2px #cccccc
    .content
      border-radius 12px
      border-top-right-radius 0
      border-bottom-right-radius 0
      display flex
      width 100%
</style>
