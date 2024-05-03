<i18n>
en:
  no_characters: You must lock a character to play
fr:
  no_characters: Vous devez verrouiller un personnage pour jouer
</i18n>

<template lang="pug">
Dropdown(:border="false" ref="dropdown")
  template(#trigger)
    vs-button.btn.character-container(type="transparent" color="#212121" v-if="selected_character")
      i.bx.bx-chevron-down
      span.name {{  selected_character.name }}
    vs-button.btn.character-container.no-characters(
      v-else
      type="gradient" color="#FF3D00"
      @click="go_to_characters"
    ) {{ t('no_characters') }}
  .dropdown-content
    vs-row(justify="center")
      vs-button.btn(
        type="transparent"
        block color="#9E9E9E"
        v-for="character in characters"
        :key="character.name"
        @click="select_character(character)"
      ) {{ character.name }}
</template>

<script setup>
import Dropdown from 'v-dropdown';
import { ref, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { context } from '../../core/game/game.js';

const dropdown = ref(null);

const router = useRouter();
const characters = inject('characters');
const selected_character = inject('selected_character');

function go_to_characters() {
  router.push('/characters');
}

function select_character(character) {
  context.dispatch('action/select_character', character.id);
  // @ts-ignore
  dropdown.value.close();
}

const { t } = useI18n();
</script>

<style lang="stylus" scoped>
.dropdown-content
  padding .5em
  font-size .8em
  user-select none
  backdrop-filter blur(10px)
  background rgba(0, 0, 0, .5)
</style>
