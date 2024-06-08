<i18n>
en:
  required: Requirements
  tailor: Tailor
  craft: Craft
  reveal: Reveal
fr:
  required: Requis
  tailor: Tailleur
  craft: Fabriquer
  reveal: Révéler
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
        vs-button(v-if="is_finished" type="gradient" size="small" color="#76FF03" @click="reveal_craft")
          span.title {{ t('reveal') }}
        vs-button(v-else :disabled="!has_required_ingredients" type="gradient" size="small" color="#FFB300" @click="craft_item") {{ t('craft') }}
</template>

<script setup>
import { inject, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { SUPPORTED_TOKENS } from '@aresrpg/aresrpg-sdk/sui';
import { BigNumber as BN } from 'bignumber.js';

import {
  sui_craft_item,
  sui_delete_recipe,
  sui_reveal_craft,
} from '../../core/sui/client.js';

const { t } = useI18n();
const props = defineProps(['recipe']);
const owned_items = inject('owned_items');
const owned_tokens = inject('owned_tokens');
const finished_crafts = inject('finished_crafts');

const is_finished = computed(() => {
  return finished_crafts.value.some(
    craft => craft.recipe_id === props.recipe.id,
  );
});

function craft_item() {
  return sui_craft_item(props.recipe);
}

function reveal_craft() {
  return sui_reveal_craft(
    finished_crafts.value.find(craft => craft.recipe_id === props.recipe.id),
  );
}

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
    return new BN(items_by_type[ingredient.item_type] ?? 0).isGreaterThan(
      ingredient.amount,
    );
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
</style>
