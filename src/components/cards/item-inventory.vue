<i18n>
en:
  feed: Feed
  fed: Your pet is very happy now!
fr:
  feed: Nourrir
  fed: Votre famillier est très heureux maintenant!
</i18n>

<template lang="pug">
.inventory-container(@dragover.prevent @drop="handle_drop")
  .item(
    :draggable="!props.disable_edit && selected_category === 'equipment'"
    v-for="item in items"
    :key="item.id"
    :class="{ selected: selected_item?.id === item.id, character: item.item_type === 'character'}"
    @click="() => select(item)"
    @click.right="on_right_click_item($event, item)"
    @dragstart="() => handle_drag_start(item)"
    @dblclick="() => equip_item(item)"
  )
    .amount(v-if="item.amount > 1") {{ item.amount }}
    img(:src="item?.image_url" :draggable="!props.disable_edit && selected_category === 'equipment'")
</template>

<script setup>
import { computed, inject, onMounted } from 'vue';
import { ITEM_CATEGORY } from '@aresrpg/aresrpg-sdk/items';
import ContextMenu from '@imengyu/vue3-context-menu';
import { useI18n } from 'vue-i18n';

import { sui_feed_pet } from '../../core/sui/client.js';
import toast from '../../toast.js';
import {
  is_resource,
  is_consumable,
  is_weapon,
  is_character,
} from '../../core/utils/item.js';
import {
  decrease_loading,
  increase_loading,
} from '../../core/utils/loading.js';

const props = defineProps(['disable_edit', 'sell_mode']);

const selected_item = inject('selected_item');
const selected_category = inject('selected_category');
const owned_items = inject('owned_items');
const extension_items = inject('extension_items');
const unlocked_characters = inject('unlocked_characters');
const edit_mode_equipment = inject('edit_mode_equipment');
const edit_mode = inject('edit_mode');
const real_equipment = inject('equipment');
const inventory_counter = inject('inventory_counter');

const { t } = useI18n();

function handle_drag_start(item) {
  edit_mode_equipment.dragged_item = item;
  edit_mode_equipment.dragg_started_from = 'equipments';
}

function on_right_click_item(event, item) {
  event.preventDefault();

  if (item.item_type === 'suifren_capy')
    ContextMenu.showContextMenu({
      x: event.x,
      y: event.y,
      theme: 'mac dark',
      items: [
        {
          label: t('feed'),
          onClick: async () => {
            try {
              increase_loading();
              const fed = await sui_feed_pet(item);
              if (fed) toast.success(t('fed'));
            } catch (error) {
              console.error(error);
            } finally {
              decrease_loading();
            }
          },
        },
      ],
    });
}

function handle_drop(event) {
  if (!edit_mode_equipment.dragged_item) return;
  if (
    !edit_mode_equipment.equipments.includes(edit_mode_equipment.dragged_item)
  ) {
    if (!edit_mode.value) {
      Object.assign(edit_mode_equipment, real_equipment);
      edit_mode.value = true;
    }
    edit_mode_equipment.equipments.push(edit_mode_equipment.dragged_item);
    edit_mode_equipment[edit_mode_equipment.dragg_started_from] = null;
  }
  edit_mode_equipment.dragged_item = null;
}

function find_free_relic_slot() {
  if (edit_mode_equipment.relic_1 === null) return 'relic_1';
  if (edit_mode_equipment.relic_2 === null) return 'relic_2';
  if (edit_mode_equipment.relic_3 === null) return 'relic_3';
  if (edit_mode_equipment.relic_4 === null) return 'relic_4';
  if (edit_mode_equipment.relic_5 === null) return 'relic_5';
  if (edit_mode_equipment.relic_6 === null) return 'relic_6';
}

function find_free_ring_slot() {
  if (edit_mode_equipment.left_ring === null) return 'left_ring';
  if (edit_mode_equipment.right_ring === null) return 'right_ring';
}

function equip_item(item) {
  const { item_category } = item;

  if (!edit_mode.value) {
    edit_mode.value = true;
    Object.assign(edit_mode_equipment, real_equipment);
  }

  switch (item_category) {
    case ITEM_CATEGORY.RELIC: {
      const slot = find_free_relic_slot();
      if (slot) {
        edit_mode_equipment[slot] = item;
        edit_mode_equipment.equipments = edit_mode_equipment.equipments.filter(
          i => i.id !== item.id,
        );
      } else {
        edit_mode_equipment.equipments.push(edit_mode_equipment.relic_6);
        edit_mode_equipment.relic_6 = item;
        edit_mode_equipment.equipments = edit_mode_equipment.equipments.filter(
          i => i.id !== item.id,
        );
      }
      break;
    }
    case ITEM_CATEGORY.TITLE: {
      if (edit_mode_equipment.title)
        edit_mode_equipment.equipments.push(edit_mode_equipment.title);
      edit_mode_equipment.title = item;
      edit_mode_equipment.equipments = edit_mode_equipment.equipments.filter(
        i => i.id !== item.id,
      );
      break;
    }
    case ITEM_CATEGORY.AMULET: {
      if (edit_mode_equipment.amulet)
        edit_mode_equipment.equipments.push(edit_mode_equipment.amulet);
      edit_mode_equipment.amulet = item;
      edit_mode_equipment.equipments = edit_mode_equipment.equipments.filter(
        i => i.id !== item.id,
      );
      break;
    }
    case ITEM_CATEGORY.RING: {
      const slot = find_free_ring_slot();

      if (slot) {
        edit_mode_equipment[slot] = item;
        edit_mode_equipment.equipments = edit_mode_equipment.equipments.filter(
          i => i.id !== item.id,
        );
      } else {
        edit_mode_equipment.equipments.push(edit_mode_equipment.right_ring);
        edit_mode_equipment.right_ring = item;
        edit_mode_equipment.equipments = edit_mode_equipment.equipments.filter(
          i => i.id !== item.id,
        );
      }
      break;
    }
    case ITEM_CATEGORY.BELT: {
      if (edit_mode_equipment.belt)
        edit_mode_equipment.equipments.push(edit_mode_equipment.belt);
      edit_mode_equipment.belt = item;
      edit_mode_equipment.equipments = edit_mode_equipment.equipments.filter(
        i => i.id !== item.id,
      );
      break;
    }
    case ITEM_CATEGORY.BOOTS: {
      if (edit_mode_equipment.boots)
        edit_mode_equipment.equipments.push(edit_mode_equipment.boots);
      edit_mode_equipment.boots = item;
      edit_mode_equipment.equipments = edit_mode_equipment.equipments.filter(
        i => i.id !== item.id,
      );
      break;
    }
    case ITEM_CATEGORY.HAT: {
      if (edit_mode_equipment.hat)
        edit_mode_equipment.equipments.push(edit_mode_equipment.hat);
      edit_mode_equipment.hat = item;
      edit_mode_equipment.equipments = edit_mode_equipment.equipments.filter(
        i => i.id !== item.id,
      );
      break;
    }
    case ITEM_CATEGORY.CLOACK: {
      if (edit_mode_equipment.cloack)
        edit_mode_equipment.equipments.push(edit_mode_equipment.cloack);
      edit_mode_equipment.cloack = item;
      edit_mode_equipment.equipments = edit_mode_equipment.equipments.filter(
        i => i.id !== item.id,
      );
      break;
    }
    case ITEM_CATEGORY.PET: {
      if (edit_mode_equipment.pet)
        edit_mode_equipment.equipments.push(edit_mode_equipment.pet);
      edit_mode_equipment.pet = item;
      edit_mode_equipment.equipments = edit_mode_equipment.equipments.filter(
        i => i.id !== item.id,
      );
      break;
    }
    default:
      if (is_weapon(item)) {
        if (edit_mode_equipment.weapon) {
          edit_mode_equipment.equipments.push(edit_mode_equipment.weapon);
        }
        edit_mode_equipment.weapon = item;
        edit_mode_equipment.equipments = edit_mode_equipment.equipments.filter(
          i => i.id !== item.id,
        );
      } else throw new Error('Unknown item category');
  }
}

function select(item) {
  selected_item.value = item;
}

const items = computed(() => {
  if (props.sell_mode) {
    return owned_items.value.sort((a, b) => a.name - b.name);
  }

  switch (selected_category?.value || 'equipment') {
    case 'loot':
      return extension_items.value;
    case 'consumables':
      return owned_items.value.filter(is_consumable);
    case 'misc':
      return owned_items.value.filter(is_resource);
    default: {
      if (inventory_counter?.value && edit_mode?.value)
        return edit_mode_equipment.equipments.sort((a, b) => a.name - b.name);

      const equipments = owned_items.value
        .filter(item => {
          return (
            !!item &&
            !is_consumable(item) &&
            !is_resource(item) &&
            !is_character(item)
          );
        })
        .sort((a, b) => a.name - b.name);

      if (edit_mode_equipment) edit_mode_equipment.equipments = equipments;
      return equipments;
    }
  }
});
</script>

<style lang="stylus" scoped>
.inventory-container
  display grid
  grid-gap .5em
  grid-template-columns repeat(auto-fill, 40px)
  grid-auto-rows 40px
  justify-content space-evenly
  overflow hidden
  overflow-y auto
  padding .5em
  .item
    position relative
    cursor pointer
    &.character
      img
        border 1px solid crimson
    .amount
      position absolute
      font-size .75em
      z-index 1
      top -2px
      left 0
      background rgba(black, .5)
      padding 0 4px
      display flex
      align-items center
      justify-content center
      opacity .8
    img
      width 40px
      height @width
      object-fit contain
      border-radius 5px
      overflow hidden
      cursor pointer
    &.selected
      img
        filter drop-shadow(1px 2px 3px black)
</style>
