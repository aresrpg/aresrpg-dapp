<i18n>
en:
  workshop: Workshop
  desc: Here you can craft items if you have the required job & level.
  required: Requirements
  tailor: Tailor
  recipes: Available Recipes
  jobs: My Jobs
fr:
  workshop: Atelier
  desc: Ici vous pouvez fabriquer des objets si vous avez le métier et le niveau requis.
  required: Requis
  tailor: Tailleur
  recipes: Recettes Disponibles
  jobs: Mes Métiers
</i18n>

<template lang="pug">
sectionContainer
  sectionHeader(:title="t('workshop')" :desc="t('desc')" color="#673AB7" rows="true")
    .recipes
      .recipe-name {{ t('recipes') }}:
      recipeVue(v-for="recipe in indexed_recipes" :recipe="recipe" :key="recipe.id")
    .right
      .desc
        itemDescription
      .jobs-name {{ t('jobs') }}:
      .jobs
        .job.material-2(v-for="job in jobs" :key="job.name")
          img(:src="job.icon")
          span.name {{ job.name }}
          span.lvl Lvl. {{ job.level }}
      .items
        itemInventory(:sell_mode="true" :tokens="true")
</template>

<script setup>
import { inject, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import sectionContainer from '../components/misc/section-container.vue';
import sectionHeader from '../components/misc/section-header.vue';
import recipeVue from '../components/cards/recipe.vue';
import itemInventory from '../components/cards/item-inventory.vue';
import itemDescription from '../components/cards/item-description.vue';
import { VITE_INDEXER_URL } from '../env.js';
import tailor_icon from '../assets/jobs/tailor.png';
import woodcutter_icon from '../assets/jobs/woodcutter.png';
import { SUI_EMITTER } from '../core/modules/sui_data.js';

const { t } = useI18n();
const indexed_recipes = inject('recipes');

const jobs = [
  { name: 'Tailor', level: 1, icon: tailor_icon },
  { name: 'Woodcutter', level: 1, icon: woodcutter_icon },
];

const AFSUI =
  '0x02264251ff808fbf55c06f60fd1174814fd787bd32dc539531894deb497029c7::afsui::AFSUI';

function item_icon(item_type) {
  if (item_type === AFSUI)
    return 'https://strapi-dev.scand.app/uploads/FUD_Logo_46c0468f49.jpg';
  return `https://assets.aresrpg.world/item/${item_type}.png`;
}

async function refresh_recipes() {
  const result = await fetch(`${VITE_INDEXER_URL}/recipes`);
  const { recipes, cursor } = await result.json();
  indexed_recipes.value = recipes;
}

function on_recipe_create() {
  setTimeout(() => {
    refresh_recipes();
  }, 7000);
}

function on_recipe_delete() {
  setTimeout(() => {
    refresh_recipes();
  }, 7000);
}

onMounted(() => {
  refresh_recipes();

  SUI_EMITTER.on('RecipeCreateEvent', on_recipe_create);
  SUI_EMITTER.on('RecipeDeleteEvent', on_recipe_delete);
});

onUnmounted(() => {
  SUI_EMITTER.off('RecipeCreateEvent', on_recipe_create);
  SUI_EMITTER.off('RecipeDeleteEvent', on_recipe_delete);
});
</script>

<style lang="stylus" scoped>
.recipe-name,.jobs-name
  font-size .9em
  margin-bottom .5em
.recipes
  display flex
  flex-flow column nowrap
  width 49%
  min-height 500px
  border-radius 5px
  padding 1em .5em
  background linear-gradient(to bottom, rgba(#212121, .6), transparent 50%)
  >*
    margin-bottom 1em

.right
  display flex
  flex-flow column nowrap
  width 49%
  background linear-gradient(to bottom, rgba(#212121, .6), transparent 50%)
  border-radius 5px
  padding 1em .5em
  .jobs
    display flex
    flex-flow column nowrap
    width 100%
    justify-content center
    align-items center
  .job
    border 1px solid rgba(#212121, .5)
    display grid
    width 300px
    grid "icon name lvl" 1fr / 40px 1fr 60px
    margin-bottom .5em
    overflow hidden
    align-items center
    grid-column-gap 1em
    background linear-gradient(to right, rgba(#212121, .4), rgba(#eee, .1))
    img
      width 100%
      height 100%
      object-fit contain
    .lvl
      font-size .8em
      opacity .9
      opacity .8
    .name
      font-size .7em
      opacity .9
      text-transform uppercase
  .items
    border 1px solid rgba(#eee, .3)
    padding .5em
    margin-top 1em
    border-radius 12px
  .desc
    margin-bottom 1em
</style>
