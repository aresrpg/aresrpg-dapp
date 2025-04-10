<template lang="pug">
.item-equipments
  .edit
    BxsLock.lock(v-if="!edit_mode")
    vs-button.cancel(icon color="#E74C3C" v-if="edit_mode && !accept_loading" @click="cancel_edit_equipment")
      RadixIconsCross2
    vs-button.accept(icon color="#2ECC71" v-if="edit_mode" @click="accept_edit_equipment")
      FluentCheckmark12Regular
  .name {{ selected_character.name }}
  .relics
    equipmentSlot.r1(:slot="'relic_1'" :background="slot_relic" :highlighted="is_dragging_relic")
    equipmentSlot.r2(:slot="'relic_2'" :background="slot_relic" :highlighted="is_dragging_relic")
    equipmentSlot.r3(:slot="'relic_3'" :background="slot_relic" :highlighted="is_dragging_relic")
    equipmentSlot.r4(:slot="'relic_4'" :background="slot_relic" :highlighted="is_dragging_relic")
    equipmentSlot.r5(:slot="'relic_5'" :background="slot_relic" :highlighted="is_dragging_relic")
    equipmentSlot.r6(:slot="'relic_6'" :background="slot_relic" :highlighted="is_dragging_relic")
  .center
    equipmentSlot.title(:slot="'title'" :background="slot_title" :highlighted="is_dragging_title")
    equipmentSlot.amulet(:slot="'amulet'" :background="slot_amulet" :highlighted="is_dragging_amulet")
    equipmentSlot.weapon(:slot="'weapon'" :background="slot_weapon" :highlighted="is_dragging_weapon")
    equipmentSlot.left_ring(:slot="'left_ring'" :background="slot_ring" :highlighted="is_dragging_ring")
    equipmentSlot.belt(:slot="'belt'" :background="slot_belt" :highlighted="is_dragging_belt")
    equipmentSlot.right_ring(:slot="'right_ring'" :background="slot_ring" :highlighted="is_dragging_ring")
    equipmentSlot.boots(:slot="'boots'" :background="slot_boots" :highlighted="is_dragging_boots")
  .right
    equipmentSlot.hat(:slot="'hat'" :background="slot_hat" :highlighted="is_dragging_hat")
    equipmentSlot.cloak(:slot="'cloak'" :background="slot_cloak" :highlighted="is_dragging_cloak")
    equipmentSlot.pet(:slot="'pet'" :background="slot_pet" :highlighted="is_dragging_pet")
</template>

<script setup>
import { inject, computed, ref, onMounted, watch } from 'vue';
// @ts-ignore
import { ITEM_CATEGORY } from '@aresrpg/aresrpg-sdk/items';

// @ts-ignore
import slot_relic from '../../assets/ui/slot_relic.png';
// @ts-ignore
import slot_title from '../../assets/ui/slot_title.png';
// @ts-ignore
import slot_amulet from '../../assets/ui/slot_amulet.png';
// @ts-ignore
import slot_weapon from '../../assets/ui/slot_weapon.png';
// @ts-ignore
import slot_ring from '../../assets/ui/slot_ring.png';
// @ts-ignore
import slot_belt from '../../assets/ui/slot_belt.png';
// @ts-ignore
import slot_boots from '../../assets/ui/slot_boots.png';
// @ts-ignore
import slot_hat from '../../assets/ui/slot_hat.png';
// @ts-ignore
import slot_cloak from '../../assets/ui/slot_cloak.png';
// @ts-ignore
import slot_pet from '../../assets/ui/slot_pet.png';
import {
  is_consumable,
  is_resource,
  is_weapon,
} from '../../core/utils/item.js';
import { sui_equip_items } from '../../core/sui/client.js';
import {
  decrease_loading,
  increase_loading,
} from '../../core/utils/loading.js';

import equipmentSlot from './equipment-slot.vue';

// @ts-ignore
import BxsLock from '~icons/bxs/lock';
// @ts-ignore
import RadixIconsCross2 from '~icons/radix-icons/cross-2';
// @ts-ignore
import FluentCheckmark12Regular from '~icons/fluent/checkmark-12-regular';

const selected_character = inject('selected_character');
const selected_item = inject('selected_item');
const edit_mode_equipment = inject('edit_mode_equipment');
const edit_mode = inject('edit_mode');
const owned_items = inject('owned_items');
const real_equipment = computed(() => {
  if (!selected_character.value) return {};
  const {
    relic_1,
    relic_2,
    relic_3,
    relic_4,
    relic_5,
    relic_6,
    title,
    amulet,
    weapon,
    left_ring,
    belt,
    right_ring,
    boots,
    hat,
    cloak,
    pet,
  } = selected_character.value;
  return {
    relic_1,
    relic_2,
    relic_3,
    relic_4,
    relic_5,
    relic_6,
    title,
    amulet,
    weapon,
    left_ring,
    belt,
    right_ring,
    boots,
    hat,
    cloak,
    pet,
  };
});

const accept_loading = ref(false);

function start_edit_equipment() {
  edit_mode.value = true;
}

onMounted(() => {
  Object.assign(edit_mode_equipment, real_equipment.value);
});

function cancel_edit_equipment() {
  edit_mode.value = false;
  Object.assign(edit_mode_equipment, real_equipment.value);
  edit_mode_equipment.dragged_item = null;
  edit_mode_equipment.equipments = owned_items.value.filter(
    item => !is_consumable(item) && !is_resource(item) && !is_equipped(item),
  );
}

async function accept_edit_equipment() {
  // find differences between real_equipment and edit_mode_equipment, then use equip_items & unequip_items
  const to_equip = [];
  const to_unequip = [];

  Object.entries(real_equipment.value).forEach(([slot, item]) => {
    if (edit_mode_equipment[slot] !== item) {
      if (edit_mode_equipment[slot])
        to_equip.push({ item: edit_mode_equipment[slot], slot });
      if (item) to_unequip.push({ item, slot });
    }
  });

  accept_loading.value = true;
  increase_loading();

  try {
    await sui_equip_items({
      character: selected_character.value,
      to_equip,
      to_unequip,
    });
  } catch (error) {
    console.error(error);
  } finally {
    decrease_loading();
    accept_loading.value = false;
  }

  edit_mode.value = false;
}

function is_equipped(item) {
  return (
    item.id === selected_character.value.weapon?.id ||
    item.id === selected_character.value.title?.id ||
    item.id === selected_character.value.amulet?.id ||
    item.id === selected_character.value.belt?.id ||
    item.id === selected_character.value.boots?.id ||
    item.id === selected_character.value.hat?.id ||
    item.id === selected_character.value.cloak?.id ||
    item.id === selected_character.value.pet?.id ||
    item.id === selected_character.value.left_ring?.id ||
    item.id === selected_character.value.right_ring?.id ||
    item.id === selected_character.value.relic_1?.id ||
    item.id === selected_character.value.relic_2?.id ||
    item.id === selected_character.value.relic_3?.id ||
    item.id === selected_character.value.relic_4?.id ||
    item.id === selected_character.value.relic_5?.id ||
    item.id === selected_character.value.relic_6?.id
  );
}

const is_dragging_relic = computed(() => {
  return (
    edit_mode_equipment.dragged_item?.item_category === ITEM_CATEGORY.RELIC
  );
});

const is_dragging_title = computed(() => {
  return (
    edit_mode_equipment.dragged_item?.item_category === ITEM_CATEGORY.TITLE
  );
});

const is_dragging_amulet = computed(() => {
  return (
    edit_mode_equipment.dragged_item?.item_category === ITEM_CATEGORY.AMULET
  );
});

const is_dragging_weapon = computed(() => {
  return (
    edit_mode_equipment.dragged_item &&
    is_weapon(edit_mode_equipment.dragged_item)
  );
});

const is_dragging_ring = computed(() => {
  return edit_mode_equipment.dragged_item?.item_category === ITEM_CATEGORY.RING;
});

const is_dragging_belt = computed(() => {
  return edit_mode_equipment.dragged_item?.item_category === ITEM_CATEGORY.BELT;
});

const is_dragging_boots = computed(() => {
  return (
    edit_mode_equipment.dragged_item?.item_category === ITEM_CATEGORY.BOOTS
  );
});

const is_dragging_hat = computed(() => {
  return edit_mode_equipment.dragged_item?.item_category === ITEM_CATEGORY.HAT;
});

const is_dragging_cloak = computed(() => {
  return (
    edit_mode_equipment.dragged_item?.item_category === ITEM_CATEGORY.CLOAK
  );
});

const is_dragging_pet = computed(() => {
  return edit_mode_equipment.dragged_item?.item_category === ITEM_CATEGORY.PET;
});
</script>

<style lang="stylus" scoped>

.lock
  opacity .7

.name
  position absolute
  top .5em
  right 50%
  transform translateX(50%)
  text-transform uppercase
  opacity .6
  font-weight bold

.item-equipments
  position relative
  grid-area perso
  border var(--ui-border)
  background var(--primary)
  border-radius 12px
  display flex
  flex-flow row nowrap
  justify-content space-between
  align-items center
  padding 1em
  .edit
    position absolute
    bottom .5em
    right .5em
    display flex
    flex-flow row nowrap
    justify-content center
    align-items center
    >*
      margin .25em
      height @width
      cursor pointer

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
    grid "title amulet weapon" 1fr "left_ring belt right_ring" 1fr "boots boots boots" 1fr / 1fr 1fr 1fr
    place-items center
    >*
      width 60px
      height @width
      position relative
    .title
      grid-area title
      width 74px
      height @width
      margin-right 1em
    .amulet
      grid-area amulet
    .weapon
      grid-area weapon
      width 74px
      height @width
      margin-left 1em
    .left_ring
      grid-area left_ring
    .belt
      grid-area belt
      width 74px
      height @width
      margin-top 1em
    .right_ring
      grid-area right_ring
    .boots
      grid-area boots
      width 74px
      height @width
  .right
    display flex
    flex-flow column nowrap
    >*
      width 74px
      height @width
      margin-bottom 5px
      position relative
</style>
