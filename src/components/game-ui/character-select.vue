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
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { context } from '../../core/game/game.js';

const dropdown = ref(null);

const characters = ref([]);

function update_characters({
  selected_character_id,
  sui: { locked_characters },
}) {
  const characters_ids = locked_characters
    .map(character => character.id)
    .filter(id => id !== selected_character_id);
  const last_characters_ids = characters.value.map(character => character.id);

  if (characters_ids.join() !== last_characters_ids.join())
    characters.value = locked_characters.filter(
      character => character.id !== selected_character_id,
    );
}

onMounted(() => {
  context.events.on('STATE_UPDATED', update_characters);
  update_characters(context.get_state());
});

onUnmounted(() => {
  context.events.off('STATE_UPDATED', update_characters);
});

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
