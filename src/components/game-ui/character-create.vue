<i18n>
fr:
  character_name: Nom du personnage
  character_name_valid: Le nom du personnage doit être compris entre 3 et 20 caractères
  create_button: Créer
  cancel_button: Annuler
  name_too_long: Le nom est trop long
  name_invalid: Le nom est invalide
  name_white_space: Le nom ne peut pas contenir d'espaces blancs
  name_taken: Ce nom est déjà pris
en:
  character_name: character name
  character_name_valid: The character name must be between 3 and 20 chars
  create_button: Create
  cancel_button: Cancel
  name_too_long: Name is too long
  name_invalid: Name is invalid
  name_white_space: Name cannot contain white spaces
  name_taken: This name is already taken
</i18n>

<script setup>
import { inject, ref, watch, computed } from 'vue';
import Spells from '@aresrpg/aresrpg-sdk/spells';
import { useI18n } from 'vue-i18n';

import {
  sui_create_character,
  sui_is_character_name_taken,
} from '../../core/sui/client.js';

import characterCanvasDisplay from './character-canvas-display.vue';
import SpellDisplay from './menu_spell_display.vue';

const name_error = ref('');
const selected_class_type = ref('IOP_MALE');

const new_character_name = ref('');
const character_creation_loading = ref(false);

const new_character_dialog = inject('new_character_dialog');

const emits = defineEmits(['cancel']);
const { t } = useI18n();

const characters = [
  {
    type: 'IOP_MALE',
    class: 'iop',
    image: 'http://assets.aresrpg.world/classe/iop_male.jpg',
    name: 'Iop (male)',
    desc: "Knights of the realm, the Iop's are as brave as they are brawn. With a penchant for charging headfirst into battle, their formidable strength is an asset in close combat. Though not the most strategic fighters, an Iop's presence on the battlefield can change the tide with a swing of their mighty sword.",
  },
  {
    type: 'IOP_FEMALE',
    class: 'iop',
    image: 'http://assets.aresrpg.world/classe/iop_female.jpg',
    name: 'Iop (female)',
    desc: 'The female Iop stands tall among her peers, blending grace with overwhelming power. Her sword, a whirlwind of steel, carves through enemies with precision and might. While often underestimated, her strategic prowess and indomitable courage make her a true force to be reckoned with.',
  },
  {
    type: 'SRAM_MALE',
    class: 'sram',
    image: 'http://assets.aresrpg.world/classe/sram_male.jpg',
    name: 'Sram (male)',
    desc: "Emerging from the shadows, the male Sram is the embodiment of death's guile. A master of stealth and deceit, he can vanish from sight to strike when least expected. With the power to summon skeletal warriors and lay cunning traps, he ensures that the battlefield is always in his favor.",
  },
  {
    type: 'SRAM_FEMALE',
    class: 'sram',
    image: 'http://assets.aresrpg.world/classe/sram_female.jpg',
    name: 'Sram (female)',
    desc: 'The female Sram, a specter of stealth and subterfuge, wields the powers of invisibility and necromancy with sinister finesse. Her traps ensnare the unwary, and her summoned minions rise from the earth to do her bidding. In the art of silent assassination, she has no equal.',
  },
  {
    type: 'XELOR',
    image: 'http://assets.aresrpg.world/classe/xelor_male.jpg',
    disabled: true,
    desc: 'Xelors are the manipulators of time itself, capable of bending moments to their will. They can slow down foes, hasten allies, and, if legends are to be believed, reverse the flow of battle. Their command over temporal magic makes them enigmatic and unpredictable adversaries.',
  },
  {
    type: 'XELOR',
    image: 'http://assets.aresrpg.world/classe/xelor_male.jpg',
    disabled: true,
  },
  {
    type: 'XELOR',
    image: 'http://assets.aresrpg.world/classe/xelor_male.jpg',
    disabled: true,
  },
  {
    type: 'XELOR',
    image: 'http://assets.aresrpg.world/classe/xelor_male.jpg',
    disabled: true,
  },
  {
    type: 'XELOR',
    image: 'http://assets.aresrpg.world/classe/xelor_male.jpg',
    disabled: true,
  },
];

function get_character_skin({ classe, female }) {
  if (classe === 'IOP')
    return female
      ? 'http://assets.aresrpg.world/classe/iop_female.jpg'
      : 'http://assets.aresrpg.world/classe/iop_male.jpg';
  if (classe === 'SRAM')
    return female
      ? 'http://assets.aresrpg.world/classe/sram_female.jpg'
      : 'http://assets.aresrpg.world/classe/sram_male.jpg';
}

const selected_class_data = computed(() => {
  const character = characters.find(
    character => character.type === selected_class_type.value,
  );

  if (!character?.class) throw new Error('Invalid character type');

  return {
    ...character,
    spells: Spells[character.class],
  };
});

const name_too_long = computed(
  () => new_character_name.value.trim().length > 20,
);
const name_invalid = computed(
  () => !new_character_name.value.trim().match(/^[a-zA-Z0-9-_]+$/),
);
const name_white_space = computed(
  () => !new_character_name.value.match(/^[a-zA-Z0-9-_]+$/),
);

function on_server_error({ code }) {
  switch (code) {
    case 'CREATE_CHARACTER_NAME_TAKEN':
      name_error.value = 'This name is already taken';
      break;
    default:
      break;
  }
}

watch(new_character_dialog, value => {
  if (!value) {
    new_character_name.value = '';
    name_error.value = '';
  }
});

watch(new_character_name, value => {
  if (value.length > 2 && name_too_long.value) {
    name_error.value = t('name_too_long');
  } else if (value.length > 2 && name_invalid.value) {
    name_error.value = t('name_invalid');
  } else if (value.length > 2 && name_white_space.value) {
    name_error.value = t('name_white_space');
  } else if (value) name_error.value = '';
});

async function create_character() {
  character_creation_loading.value = true;
  const female = selected_class_type.value.includes('FEMALE');
  const classe = selected_class_type.value.includes('IOP') ? 'iop' : 'sram';

  if (await sui_is_character_name_taken(new_character_name.value)) {
    name_error.value = t('name_taken');
    character_creation_loading.value = false;
    return;
  }

  try {
    await sui_create_character({
      name: new_character_name.value,
      type: classe,
      sex: female ? 'female' : 'male',
    });
  } catch (error) {
    console.error(error);
  } finally {
    character_creation_loading.value = false;
    new_character_name.value = '';
    cancel();
  }
}

const is_character_name_valid = computed(
  () =>
    new_character_name.value.length > 3 &&
    new_character_name.value.length <= 20 &&
    new_character_name.value.match(/^[a-zA-Z0-9-_]+$/),
);

function cancel() {
  emits('cancel');
}
</script>

<template lang="pug">
vs-dialog(v-model="new_character_dialog" :loading="character_creation_loading" full-screen)
  .create_character
    .class_name {{ selected_class_data.name }}
    .slider
      .character(
        v-for="character in characters"
        :style="{ background: `url(${character.image}) center / cover` }"
        @click="() => selected_class_type = character.type"
        :class="{ selected: selected_class_type === character.type, disabled: character.disabled }"
      )
    .desc {{ selected_class_data.desc }}
    .perso
      characterCanvasDisplay(:type="selected_class_type")
    .spells
      SpellDisplay(:spells="selected_class_data.spells")
    vs-input.name(block placeholder="Enter your name" v-model="new_character_name" @keyup.enter="create_character")
      template(#message-danger v-if="name_error") {{ name_error }}
    vs-button.cancel(type="transparent" size="xl" color="#E74C3C" @click="cancel") {{ t('cancel_button') }}
    vs-button.create(
      type="transparent"
      size="xl"
      color="#2ECC71"
      @click="create_character"
      :disabled="!is_character_name_valid"
    ) {{ t('create_button') }}
</template>

<style lang="stylus" scoped>
.create_character
  backdrop-filter blur(50px)
  display grid
  height calc(100vh - 80px)
  background rgba(#212121, .5)
  border-radius 12px
  overflow hidden
  place-items center center
  grid "title title title" 50px "slider slider slider" 4fr "desc perso spells" 4fr "cancel name create" 1fr / 1fr 1fr 1fr
  >*
    color #eeeeee
  .class_name
    grid-area title
    font-size 1.5em
    text-align center
    font-weight 900
    text-shadow 1px 2px 3px black
    text-transform uppercase
    place-self end center
  .slider
    grid-area slider
    place-self stretch
    margin 1em
    display flex
    flex-flow row nowrap
    justify-content center
    padding 0 5%
    .character
      border-bottom 3px solid black
      width 150px // adjust if necessary to fill the container width
      max-height 500px
      cursor pointer
      opacity .5
      position relative // For pseudo-element positioning
      // Adjust the clip-path to cover the gap; tweak the percentages as necessary
      clip-path polygon(40% 0, 100% 0, 65% 100%, 5% 100%)
      margin-left -60px
      filter drop-shadow(3px 1px 1px black)
      &::after
        content ''
        position absolute
        top 0
        right 0
        width 36%
        height 100%
        background white
        z-index 10
        clip-path polygon(90% 0, 100% 0, 65% 100%, 5% 100%)
      &:hover
        filter brightness(1.2)
      &.selected
        opacity 1
        // filter drop-shadow(1px 2px 3px black)
      &.disabled
        filter grayscale(100%)
        opacity .2
        cursor default
      &:first-child
        margin-left 0
        border-top-left-radius 6px
        border-bottom-left-radius 6px
        clip-path polygon(0 0, 100% 0, 65% 100%, 0 100%)
      &:last-child
        border-top-right-radius 6px
        border-bottom-right-radius 6px
        clip-path polygon(40% 0, 100% 0, 100% 100%, 5% 100%)
        &::after
          display none

  .desc
    grid-area desc
    margin 1em 3em
    padding 1em
    place-self stretch
    background rgba(0,0,0,0.5)
    border 1px solid #8b7355 // A border color that fits the game's aesthetic
    box-shadow 0 4px 8px rgba(0, 0, 0, 0.1) // Soft shadow for depth
    color #E0E0E0 // Light text for readability
    font-size 1.2em
    line-height 1.5
    overflow-y auto // Allows scrolling if the content is too long
    border-radius 6px // Slight rounding of corners

  .perso
    grid-area perso
    place-self stretch
    margin 1em
  .spells
    grid-area spells
    place-self stretch
    margin 1em 3em
    background rgba(0,0,0,0.2)
    border 1px solid #8b7355 // A border color that fits the game's aesthetic
    border-radius 6px // Slight rounding of corners

  .name
    grid-area name
    height 50px
    width 100%
    border-radius 6px
    margin 1em 2em
    padding 0 1em
    color #212121
    font-size 1.5em
    text-align center
  .cancel
    grid-area cancel
  .create
    grid-area create
</style>
