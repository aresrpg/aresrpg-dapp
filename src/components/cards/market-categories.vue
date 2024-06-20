<i18n>
en:
  no_items: No items are currently sold in this category
  category: Category
  name: Name
  choose: Type a category
  choose-name: Type an item name
  equipment: Equipment

  relic: Relic
  rune: Rune
  mount: Mount
  hat: Hat
  cloack: Cloack
  amulet: Amulet
  ring: Ring
  belt: Belt
  boots: Boots
  title: Title
  pet: Pet
  character: Character

  weapons: Weapons

  bow: Bow
  wand: Wand
  staff: Staff
  dagger: Dagger
  shovel: Shovel
  sword: Sword
  scythe: Scythe
  axe: Axe
  hammer: Hammer
  fishing_rod: Fishing rod
  pickaxe: Pickaxe

  resource: Resource
  misc: Misc

  key: Key

  consumable: Consumable

  orb: Orb

  listed: Listed
  floor: Floor
fr:
  no_items: Aucun item n'est actuellement vendu dans cette catégorie
  category: Catégorie
  name: Nom
  choose: Choisissez une catégorie
  choose-name: Tapez un nom d'item
  equipment: Équipement

  relic: Relique
  rune: Rune
  mount: Monture
  hat: Coiffe
  cloack: Cape
  amulet: Amulette
  ring: Anneau
  belt: Ceinture
  boots: Bottes
  title: Titre
  pet: Familiers
  character: Perso

  weapons: Armes

  bow: Arc
  wand: Baguette
  staff: Bâton
  dagger: Dague
  shovel: Pelle
  sword: Épée
  scythe: Faux
  axe: Hache
  hammer: Marteau
  fishing_rod: Canne à pêche
  pickaxe: Pioche

  resource: Ressource
  misc: Divers

  key: Clé

  consumable: Consommable

  orb: Orbe

  listed: En vente
  floor: Prix minimum
</i18n>

<template lang="pug">
.categories
  .select
    .filter-category
      span {{ t('category') }}:
      vs-select(filter default-first-option v-model="filtered_category" :placeholder="t('choose')")
        vs-option-group(:label="t('equipment')")
          vs-option(
            v-for="item in EQUIPMENTS"
            :label="t(item)" :value="item"
          )
        vs-option-group(:label="t('weapons')")
          vs-option(
            v-for="item in WEAPONS"
            :label="t(item)" :value="item"
          )
        vs-option-group(:label="t('consumable')")
          vs-option(
            v-for="item in CONSUMABLES"
            :label="t(item)" :value="item"
          )
        vs-option-group(:label="t('misc')")
          vs-option(
            v-for="item in MISC"
            :label="t(item)" :value="item"
          )
    .names
      span {{ t('name') }}:
      vs-select(filter default-first-option v-model="filtered_name" :placeholder="t('choose-name')")
        vs-option(
          v-for="item_name in Object.keys(currently_listed_items_names)"
          :label="item_name" :value="item_name" :key="item_name"
        )
  .all
    .none(v-if="!available_types.length") {{ t('no_items') }}
    .type.material-1(v-else v-for="available_type in available_types" :key="available_type.name" @click="() => select_item(available_type)")
      img.icon(:src="available_type.image_url" alt="listing image")
      .right
        span.name {{ available_type.name }}
        .bottom
          .listed
            span {{ t('listed') }}:
            span.count {{ available_type.item_count }}
          .floor
            span {{ t('floor') }}:
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
import { watch, ref, inject } from 'vue';

import { VITE_INDEXER_URL } from '../../env.js';
import { pretty_print_mists } from '../../core/sui/client.js';

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
  async (category, last_category) => {
    if (category === last_category) return;
    selected_item.value = null;
    const types = await fetch(
      `${VITE_INDEXER_URL}/item-types/${category}`,
    ).then(res => res.json());
    available_types.value = types;
  },
  { immediate: true },
);
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
