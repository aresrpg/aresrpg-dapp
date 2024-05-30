<template lang="pug">
.equipment-slot(@drop="on_drag_drop" @dragover.prevent)
  img.equipped-img(
    v-if="shown_item"
    :src="shown_item?.image_url"
    @click="select_item"
    @dragstart="handle_drag_start"
    @dblclick="unequip"
  )
  img.slot-img(draggable="false" v-else :src="background")
  .slot(:class="{ highlighted: props.highlighted }")
  .appearance-indicator(v-if="item_changes_appearance(props.slot)")
    .hanger-icon
      | 🧥
</template>

<script setup>
import { computed, inject } from 'vue';
import { ITEM_CATEGORY } from '@aresrpg/aresrpg-sdk/items';

import { is_weapon } from '../../core/utils/item.js';

const props = defineProps(['slot', 'background', 'highlighted']);
const edit_mode_equipment = inject('edit_mode_equipment');
const edit_mode = inject('edit_mode');
const real_equipment = inject('equipment');
const selected_character = inject('selected_character');
const selected_item = inject('selected_item');

const shown_equipment = computed(() => {
  if (edit_mode.value) return edit_mode_equipment;
  return real_equipment;
});

const shown_item = computed(() => {
  return shown_equipment.value[props.slot];
});

function item_changes_appearance(slot) {
  // Assuming slots like boots, hat, etc., change the appearance
  const appearance_changing_slots = ['boots', 'hat', 'cloack', 'amulet', 'weapon'];
  return appearance_changing_slots.includes(slot);
}

function unequip() {
  if (!edit_mode.value) {
    Object.assign(edit_mode_equipment, real_equipment);
    edit_mode_equipment.equipments.push(real_equipment[props.slot]);
    edit_mode.value = true;
  } else edit_mode_equipment.equipments.push(edit_mode_equipment[props.slot]);
  edit_mode_equipment[props.slot] = null;
}

function handle_drag_start() {
  edit_mode_equipment.dragged_item = shown_item.value;
  edit_mode_equipment.dragg_started_from = props.slot;
}

function on_drag_drop() {
  const { dragged_item } = edit_mode_equipment;
  const currently_equipped_item = shown_item.value;

  if (is_slot_valid(props.slot, dragged_item)) {
    if (
      currently_equipped_item &&
      edit_mode_equipment.dragg_started_from === 'equipments'
    )
      edit_mode_equipment.equipments.push(currently_equipped_item);

    edit_mode.value = true;
    edit_mode_equipment[props.slot] = dragged_item;

    if (edit_mode_equipment.equipments.includes(dragged_item))
      edit_mode_equipment.equipments = edit_mode_equipment.equipments.filter(
        i => i !== dragged_item,
      );

    if (
      props.slot === 'left_ring' &&
      edit_mode_equipment.dragg_started_from === 'right_ring'
    ) {
      edit_mode_equipment.right_ring = null;
    } else if (
      props.slot === 'right_ring' &&
      edit_mode_equipment.dragg_started_from === 'left_ring'
    ) {
      edit_mode_equipment.left_ring = null;
    }
  }
  edit_mode_equipment.dragged_item = null;
}

function select_item() {
  selected_item.value = shown_item.value;
}

function is_equipped(item) {
  return (
    item.id === selected_character.value.weapon?.id ||
    item.id === selected_character.value.title?.id ||
    item.id === selected_character.value.amulet?.id ||
    item.id === selected_character.value.belt?.id ||
    item.id === selected_character.value.boots?.id ||
    item.id === selected_character.value.hat?.id ||
    item.id === selected_character.value.cloack?.id ||
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

function is_slot_valid(slot, item) {
  if (slot.includes('relic')) return item.item_category === ITEM_CATEGORY.RELIC;

  switch (slot) {
    case 'title':
      return item.item_category === ITEM_CATEGORY.TITLE;
    case 'amulet':
      return item.item_category === ITEM_CATEGORY.AMULET;
    case 'weapon':
      return is_weapon(item);
    case 'left_ring':
    case 'right_ring':
      return item.item_category === ITEM_CATEGORY.RING;
    case 'belt':
      return item.item_category === ITEM_CATEGORY.BELT;
    case 'boots':
      return item.item_category === ITEM_CATEGORY.BOOTS;
    case 'hat':
      return item.item_category === ITEM_CATEGORY.HAT;
    case 'cloack':
      return item.item_category === ITEM_CATEGORY.CLOACK;
    case 'pet':
      return item.item_category === ITEM_CATEGORY.PET;
  }
}
</script>

<style lang="stylus" scoped>
.equipment-slot
  user-select none
  position relative

img.slot-img
  width 100%
  height 100%
  object-fit contain
  padding .5em
  filter grayscale(1)
  opacity .3

img.equipped-img
  width 100%
  height 100%
  object-fit contain
  cursor pointer

.slot
  pointer-events none
  position absolute
  width 100%
  height 100%
  top 0
  left 0
  box-shadow: inset 0 0 15px 0 #212121
  border 1px solid #212121
  &.highlighted
    box-shadow: inset 0 0 15px 0 #F9A825
    border 1px solid #F9A825

.appearance-indicator
  position absolute
  top 0
  right 0
  width 20px
  height 20px
  display flex
  justify-content center
  align-items center
  background-color rgba(0, 0, 0, 0.5)
  border-radius 50%
  color white

.hanger-icon
  font-size 14px
</style>


