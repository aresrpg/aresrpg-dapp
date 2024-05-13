<template lang="pug">
.game-inventory
  .perso
    .name {{ selected_character.name }}
    .relics
      .r1
        img.slot-img(src="../../assets/ui/slot_relic.png")
        .slot
      .r2
        img.slot-img(src="../../assets/ui/slot_relic.png")
        .slot
      .r3
        img.slot-img(src="../../assets/ui/slot_relic.png")
        .slot
      .r4
        img.slot-img(src="../../assets/ui/slot_relic.png")
        .slot
      .r5
        img.slot-img(src="../../assets/ui/slot_relic.png")
        .slot
      .r6
        img.slot-img(src="../../assets/ui/slot_relic.png")
        .slot
    .center
      .title
        img.slot-img(src="../../assets/ui/slot_title.png")
        .slot
      .amulet
        img.slot-img(src="../../assets/ui/slot_amulet.png")
        .slot
      .weapon
        img.slot-img(src="../../assets/ui/slot_weapon.png")
        .slot
      .ring_left
        img.slot-img(src="../../assets/ui/slot_ring.png")
        .slot
      .belt
        img.slot-img(src="../../assets/ui/slot_belt.png")
        .slot
      .ring_right
        img.slot-img(src="../../assets/ui/slot_ring.png")
        .slot
      .boots
        img.slot-img(src="../../assets/ui/slot_boots.png")
        .slot
    .right
      .hat
        img.slot-img(src="../../assets/ui/slot_hat.png")
        .slot
      .cloack
        img.slot-img(src="../../assets/ui/slot_cloack.png")
        .slot
      .pet
        img.slot-img(src="../../assets/ui/slot_pet.png")
        .slot
  .item
    itemDescription(v-if="target_item" :item="target_item")
  .inventory
    .header
      img.equipment(src="../../assets/ui/equipment.svg" :class="{ selected: selected_category === 'equipment' }" @click="selected_category = 'equipment'")
      img.consumables(src="../../assets/ui/consumable.svg" :class="{ selected: selected_category === 'consumables' }" @click="selected_category = 'consumables'")
      img.misc(src="../../assets/ui/misc.svg" :class="{ selected: selected_category === 'misc' }" @click="selected_category = 'misc'")
      img.loot(src="../../assets/ui/loot.svg" :class="{ selected: selected_category === 'loot' }" @click="selected_category = 'loot'")
    .content
      itemInventory(:items="items" @open_item_description="target_item = $event")
</template>

<script setup>
import { ref, inject, computed } from 'vue';

import itemDescription from '../cards/item-description.vue';
import itemInventory from '../cards/item-inventory.vue';
import { is_resource, is_consumable } from '../../core/utils/item.js';

const target_item = ref(null);
const owned_items = inject('owned_items');
const extension_items = inject('extension_items');
const selected_character = inject('selected_character');

const selected_category = ref('equipment');

const items = computed(() => {
  switch (selected_category.value) {
    case 'loot':
      return extension_items.value;
    case 'consumables':
      return owned_items.value.filter(is_consumable);
    case 'misc':
      return owned_items.value.filter(is_resource);
    default:
      return owned_items.value.filter(
        item => !is_consumable(item) && !is_resource(item),
      );
  }
});
</script>

<style lang="stylus" scoped>
.name
  position absolute
  top .5em
  right 50%
  transform translateX(50%)
  text-transform uppercase
  opacity .6
  font-weight bold

img.slot-img
  width 100%
  height 100%
  object-fit contain
  padding .5em
  filter grayscale(1)
  opacity .6
.slot
  position absolute
  width 100%
  height 100%
  top 0
  left 0
  box-shadow: inset 0 0 15px 0 #212121
  border 1px solid #212121

.game-inventory
  display grid
  grid "perso inventory" 1fr "item inventory" 280px / 6fr 4fr
  grid-gap 1em
  height 100%
  width 80%
  max-width 900px
  .perso
    position relative
    grid-area perso
    border 5px double #212121
    background linear-gradient(to bottom, #212121, rgba(#455A64, .7) 50%)
    border-radius 12px
    display flex
    flex-flow row nowrap
    justify-content space-between
    align-items center
    padding 1em
    .relics
      display flex
      flex-flow column nowrap
      >*
        width 50px
        height @width
        margin-bottom 5px
        position relative
    .center
      display grid
      grid "title amulet weapon" 1fr "ring_left belt ring_right" 1fr "boots boots boots" 1fr / 1fr 1fr 1fr
      place-items center
      >*
        width 60px
        height @width
        position relative
      .title
        grid-area title
        width 80px
        height @width
        margin-right 1em
      .amulet
        grid-area amulet
      .weapon
        grid-area weapon
        width 80px
        height @width
        margin-left 1em
      .ring_left
        grid-area ring_left
      .belt
        grid-area belt
        width 80px
        height @width
        margin-top 1em
      .ring_right
        grid-area ring_right
      .boots
        grid-area boots
        width 80px
        height @width
    .right
      display flex
      flex-flow column nowrap
      >*
        width 60px
        height @width
        margin-bottom 5px
        position relative
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
      padding .5em
      height 100%
</style>
