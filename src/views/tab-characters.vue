<script setup>
import { useI18n } from 'vue-i18n';
import { ref, provide, inject, defineAsyncComponent } from 'vue';

import sectionHeader from '../components/misc/section-header.vue';
import sectionContainer from '../components/misc/section-container.vue';
import { NETWORK } from '../env.js';

const UserCharacter = defineAsyncComponent(
  () => import('../components/cards/user-character.vue'),
);
const CharacterCreateVue = defineAsyncComponent(
  () => import('../components/game-ui/character-create.vue'),
);
const { t } = useI18n();

const new_character_dialog = ref(false);

const characters = inject('characters');

provide('new_character_dialog', new_character_dialog);
</script>

<template lang="pug">
sectionContainer(v-if="NETWORK === 'testnet'")
  vs-alert(type="relief" color="#0D47A1")
    template(#title) {{ t('APP_WELCOME') }}
    .alert-content
      i18n-t(keypath="APP_TAB_CHARACTERS_EXPLANATION" tag="p")
        b.sui Sui
      .explanation2 {{ t('APP_TAB_CHARACTERS_EXPLANATION_ALT') }}
  .space
  sectionHeader(:title="t('APP_CHARACTERS')" color="#00C853")
    .character-container
      div.nothing(v-if="characters[0]?.id === 'default'")
      UserCharacter(v-else v-for="character in characters" :key="character.id" :locked="true" :character="character")
      .new(@click="new_character_dialog = true") {{ t('APP_CHARACTER_NEW') }}

  // Create a new character
  CharacterCreateVue(@cancel="new_character_dialog = false")
</template>

<style lang="stylus" scoped>
.alert-content
  display flex
  flex-flow column nowrap
  .explanation2
    margin-top 1em
    // font-size .9em
    font-style italic
    opacity .7
.space
  height 20px

.request-storage
  display flex
  flex-flow column nowrap
  align-items center
  width 100%
  .desc
    font-size .9em
    margin-bottom 1em
    opacity .7

.dialog-content
  display flex
  flex-flow column nowrap
  align-items center
  max-width 400px
  justify-content center
  .dialog-desc
    font-size .9em
    margin-bottom 2em
  .note
    font-size .7em
    opacity .7
.dialog-footer
  display flex
  justify-content flex-end

b.sui
  color #4FC3F7
  font-weight bold

.character-container
  display flex
  flex-flow row wrap
  >*
    margin .5em
  .new
    cursor pointer
    width 300px
    height 125px
    border 2px dashed #eee
    border-radius 10px
    box-shadow 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)
    transition all 0.3s cubic-bezier(.25,.8,.25,1)
    display flex
    align-items center
    justify-content center
    &:hover
      box-shadow: 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22);
</style>
