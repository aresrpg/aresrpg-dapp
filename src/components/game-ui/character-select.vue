<template lang="pug">
Dropdown(:border="false" ref="dropdown" v-if="selected_character")
  template(#trigger)
    vs-button.btn.character-container(type="transparent" color="#212121")
      i.bx.bx-chevron-down
      span.name {{  selected_character.name }}
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
import { computed, inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const user = inject('user');
const selected_character = inject('selected_character');
const game = inject('game');

const dropdown = ref(null);

const characters = computed(() =>
  user.locked_characters.filter(c => c.name !== selected_character.value.name),
);

function select_character(character) {
  selected_character.value = character;
  game.value.dispatch('action/select_character', character.id);
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
