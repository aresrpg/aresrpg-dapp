<i18n>
en:
  required: Requirements
  tailor: Tailor
  craft: Craft
  reveal: Reveal
  craft_title: Craft item
  craft_desc: Are you sure you want to craft {0} ?
  cancel: Cancel
  crafting: Crafting item
  crafted: Item crafted
  crafted_failed: Failed to craft item
  revealing: Revealing item
  revealed: Item revealed
  revealed_failed: Failed to reveal item
  close: Close
fr:
  required: Requis
  tailor: Tailleur
  craft: Fabriquer
  reveal: Révéler
  craft_title: Fabriquer l'objet
  craft_desc: Êtes-vous sûr de vouloir fabriquer {0} ?
  cancel: Annuler
  crafting: Fabrication de l'objet
  crafted: Objet fabriqué
  crafted_failed: Échec de la fabrication de l'objet
  revealing: Révélation de l'objet
  revealed: Objet révélé
  revealed_failed: Échec de la révélation de l'objet
  close: Fermer
</i18n>

<template lang="pug">
.recipe.material-2
  .top
    img(:src="item_icon(recipe.template.item_type)")
    .name
      span {{ recipe.template.name }}
      .job #[b {{ t('required') }}]: {{ t('tailor') }} {{ recipe.level }}
    .lvl Lvl. {{ recipe.template.level }}
  .bottom
    .ingredients
      vs-tooltip(v-for="ingredient in recipe.ingredients" :key="ingredient.item_type")
        template(#content) {{ ingredient.name }}
        .ingredient
          img(:src="item_icon(ingredient.item_type)" :alt="ingredient.item_type" :class="{ token: ingredient.item_type.length > 20 }")
          span x{{ pretty_amount(ingredient) }}
      .btns
        vs-button(v-if="admin.admin_caps.length" type="gradient" size="small" color="#F4511E" @click="delete_recipe") Delete
        vs-button(v-if="is_finished" type="gradient" size="small" color="#76FF03" @click="reveal_craft" :disabled="currently_revealing")
          span.title {{ t('reveal') }}
        vs-button(v-else :disabled="!has_required_ingredients" type="gradient" size="small" color="#FFB300" @click="craft_dialog = true") {{ t('craft') }}

  /// craft dialog
  vs-dialog(v-model="craft_dialog")
    template(#header) {{ t('craft_title') }}
    i18n-t(keypath="craft_desc")
      b.itemname {{ recipe.template.name }} (Lvl. {{ recipe.template.level }})
    template(#footer)
      .dialog-footer
        vs-button(type="transparent" color="#E74C3C" @click="craft_dialog = false") {{ t('cancel') }}
        vs-button(type="transparent" color="#2ECC71" @click="craft_item") {{ t('craft') }}

  /// revealed dialog
  vs-dialog(v-model="reveal_dialog" :loading="!selected_item")
    template(#header) Wow!!!
    itemDescription
    template(#footer)
      .dialog-footer
        vs-button(type="transparent" color="#2ECC71" @click="(reveal_dialog = false, select_item.value = null)") {{ t('close') }}
</template>

<script setup>
import { inject, computed, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { SUPPORTED_TOKENS } from '@aresrpg/aresrpg-sdk/sui';
import { BigNumber as BN } from 'bignumber.js';

import {
  sui_craft_item,
  sui_delete_recipe,
  sui_reveal_craft,
} from '../../core/sui/client.js';
import toast from '../../toast.js';
import { context } from '../../core/game/game.js';
import { SUI_EMITTER } from '../../core/modules/sui_data.js';

import itemDescription from './item-description.vue';

const { t } = useI18n();
const props = defineProps(['recipe']);
const owned_items = inject('owned_items');
const owned_tokens = inject('owned_tokens');
const finished_crafts = inject('finished_crafts');
const selected_item = inject('selected_item');
const reveal_dialog = ref(false);

const craft_dialog = ref(false);
const currently_revealing = ref(false);

const is_finished = computed(() => {
  return finished_crafts.value.some(
    craft => craft.recipe_id === props.recipe.id,
  );
});

async function craft_item() {
  const tx = toast.tx(t('crafting'), props.recipe.template.name);
  try {
    craft_dialog.value = false;
    await sui_craft_item(props.recipe);
    tx.update('success', t('crafted'));
  } catch (error) {
    console.error(error);
    tx.update('error', t('crafted_failed'));
  }
}

async function reveal_craft() {
  const tx = toast.tx(t('revealing'), props.recipe.template.name);
  try {
    currently_revealing.value = true;
    selected_item.value = null;
    const finished_craft = finished_crafts.value.find(
      craft => craft.recipe_id === props.recipe.id,
    );
    await sui_reveal_craft(finished_craft);
    tx.update('success', t('revealed'));
    // @ts-ignore
    context.dispatch('action/sui_remove_finished_craft', finished_craft.id);
  } catch (error) {
    console.error(error);
    tx.update('error', t('revealed_failed'));
  }
  currently_revealing.value = false;
  reveal_dialog.value = true;
}

function on_item_reveal(item) {
  selected_item.value = item;
}

onMounted(() => {
  SUI_EMITTER.on('ItemRevealedEvent', on_item_reveal);
});

onUnmounted(() => {
  SUI_EMITTER.off('ItemRevealedEvent', on_item_reveal);
});

function pretty_amount(ingredient) {
  const token = SUPPORTED_TOKENS[ingredient.item_type];
  if (token?.decimal)
    return new BN(ingredient.amount.toString())
      .dividedBy(new BN(10).pow(token.decimal))
      .toFixed(2);

  return ingredient.amount;
}

const has_required_ingredients = computed(() => {
  const items_by_type = [...owned_items.value, ...owned_tokens.value].reduce(
    (acc, item) => {
      if (!acc[item.item_type]) acc[item.item_type] = new BN(0);
      if (item.is_token)
        acc[item.item_type] = acc[item.item_type].plus(
          new BN(item.amount.toString()).dividedBy(
            new BN(10).pow(item.decimal),
          ),
        );

      acc[item.item_type] = acc[item.item_type].plus(item.amount);
      return acc;
    },
    {},
  );

  return props.recipe.ingredients.every(ingredient => {
    return new BN(
      items_by_type[ingredient.item_type] ?? 0,
    ).isGreaterThanOrEqualTo(ingredient.amount);
  });
});

const admin = inject('admin');

async function delete_recipe() {
  if (!admin.admin_caps.length) return;
  const [admin_cap] = admin.admin_caps;
  await sui_delete_recipe({ admin_cap, recipe_id: props.recipe.id });
}

function item_icon(item_type) {
  const known_token = SUPPORTED_TOKENS[item_type];

  if (known_token) return known_token.image_url;
  return `https://assets.aresrpg.world/item/${item_type}.png`;
}
</script>

<style lang="stylus" scoped>
span.title
  color #212121

.recipe
  cursor pointer
  display flex
  flex-flow column nowrap
  background rgba(#eee, .1)
  padding .5em
  border 1px solid black
  .top
    display flex
    flex-flow row nowrap
    align-items center
    padding-bottom .5em
    border-bottom 1px solid rgba(#eee, .3)
    img
      width 40px
      height @width
      object-fit contain
      margin-right 1em
    .name
      display flex
      flex-flow column nowrap
      span
        font-size .8em
        text-transform uppercase
        font-weight bold
      .job
        font-size .8em
        opacity .8
        b
          font-size .8em
          opacity .8
    .lvl
      margin-left auto
      font-size .9em
      opacity .9
  .bottom
    display flex
    flex-flow row nowrap
    .ingredients
      display flex
      flex-flow row wrap
      padding .5em 0
      width 100%
      .btns
        display flex
        flex-flow column nowrap
        margin-left auto
      .ingredient
        display flex
        flex-flow row nowrap
        align-items center
        padding .25em .5em
        margin 0 .25em
        border 1px solid #212121
        background linear-gradient(90deg, rgba(#546E7A, .3), rgba(#263238, .3))
        img
          width 30px
          height @width
          object-fit contain
          margin-right .5em
          &.token
            border-radius 50px
        span
          font-size .8em
          opacity .8

.dialog-content
  display flex
  align-items center
  justify-content center
.dialog-footer
  display flex
  justify-content flex-end

b.itemname
  font-style italic
  color #9575CD
</style>
