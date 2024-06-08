<i18n>
  en:
    lock: Select
    unlock: Unselect
    delete: Delete
    send: Send
    delete_desc: Are you sure you want to delete this character?
    cancel: Cancel
    confirm: Confirm
    invalid_address: Invalid Sui address
    lock_desc: You're about to select this character to access it in game, you can unselect it at anytime when you're done playing
    unlock_desc: You're about to unselect this character and retrieve it in your wallet
    lock_failed: Failed to select character, please retry shortly
    delete_failed: Failed to delete character, please retry shortly
    send_failed: Failed to send character, please retry shortly
  fr:
    lock: Sélectionner
    unlock: Désélectionner
    delete: Supprimer
    send: Envoyer
    delete_desc: Êtes-vous sûr de vouloir supprimer ce personnage ?
    cancel: Annuler
    confirm: Confirmer
    invalid_address: Adresse Sui invalide
    lock_desc: Vous êtes sur le point de sélectionner ce personnage pour y accéder en jeu, vous pouvez le désélectionner à tout moment lorsque vous avez fini de jouer
    unlock_desc: Vous êtes sur le point de désélectionner ce personnage et de le récupérer dans votre portefeuille
    lock_failed: Échec de sélection du personnage, veuillez réessayer ultérieurement
    delete_failed: Échec de suppression du personnage, veuillez réessayer ultérieurement
    send_failed: Échec de l'envoi du personnage, veuillez réessayer ultérieurement
</i18n>

<template lang="pug">
.character(:class="{ locked: props.locked, [props.character.classe]: true, male: props.character.sex === 'male' }")
  span.name {{ props.character.name }} #[b.xp Lvl {{ experience_to_level(props.character.experience) }}]
  .field
    .title classe:
    .value {{ props.character.classe.toUpperCase() }}
    i.bx(:class="genrer_icon")
  .field
    .title id:
    a.value.id(:href="character_explorer_link" target="_blank") {{ props.character.id.slice(0, 24) }}...
  .actions
    vs-button(
      v-if="!props.locked"
      type="transparent"
      size="small"
      color="#EF5350"
      @click="delete_dialog = true") {{ t('delete') }}
    vs-button(v-if="!props.locked" type="transparent" size="small" color="#4CAF50" @click="lock_dialog = true") {{ t('lock') }}
    vs-button(v-else type="transparent" size="small" color="#4CAF50" @click="unlock_dialog = true") {{ t('unlock') }}

    /// deletion dialog
    vs-dialog(v-model="delete_dialog" :loading="delete_loading")
      template(#header) {{ t('delete') }}
      span {{ t('delete_desc') }}
      template(#footer)
        .dialog-footer
          vs-button(type="transparent" color="#E74C3C" @click="delete_dialog = false") {{ t('cancel') }}
          vs-button(type="transparent" color="#2ECC71" @click="delete_character") {{ t('confirm') }}

    /// lock dialog
    vs-dialog(v-model="lock_dialog" :loading="lock_loading")
      template(#header) {{ t('lock') }}
      span {{ t('lock_desc') }}
      template(#footer)
        .dialog-footer
          vs-button(type="transparent" color="#E74C3C" @click="lock_dialog = false") {{ t('cancel') }}
          vs-button(type="transparent" color="#2ECC71" @click="select_character") {{ t('confirm') }}

    /// unlock dialog
    vs-dialog(v-model="unlock_dialog" :loading="unlock_loading")
      template(#header) {{ t('unlock') }}
      span {{ t('unlock_desc') }}
      template(#footer)
        .dialog-footer
          vs-button(type="transparent" color="#E74C3C" @click="unlock_dialog = false") {{ t('cancel') }}
          vs-button(type="transparent" color="#2ECC71" @click="unselect_character") {{ t('confirm') }}
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import { isValidSuiAddress } from '@mysten/sui/utils';

import { experience_to_level } from '../../core/utils/game/experience.js';
import { context } from '../../core/game/game.js';
import {
  sui_delete_character,
  sui_select_character,
  sui_unselect_character,
} from '../../core/sui/client.js';
import toast from '../../toast.js';
import { NETWORK } from '../../env.js';

const { t } = useI18n();
const props = defineProps(['character', 'locked']);

const genrer_icon = computed(() =>
  props.character.sex === 'male' ? 'bx-male-sign' : 'bx-female-sign',
);
const character_explorer_link = computed(
  () => `https://suiscan.xyz/${NETWORK}/object/${props.character.id}`,
);

const is_valid_sui_address = computed(() => {
  const is_alias = send_to.value.endsWith('.sui');
  return is_alias || isValidSuiAddress(send_to.value);
});

const delete_dialog = ref(false);
const delete_loading = ref(false);

const edit_dialog = ref(false);

const lock_dialog = ref(false);
const lock_loading = ref(false);

const send_dialog = ref(false);
const send_to = ref('');
const send_loading = ref(false);

const unlock_dialog = ref(false);
const unlock_loading = ref(false);

async function delete_character() {
  try {
    delete_loading.value = true;
    await sui_delete_character(props.character);
  } catch (error) {
    console.error(error);
    toast.warn(t('delete_failed'));
  } finally {
    delete_loading.value = false;
    delete_dialog.value = false;
  }
}

async function select_character() {
  try {
    lock_loading.value = true;
    await sui_select_character(props.character);
  } catch (error) {
    console.error(error);
    toast.warn(t('lock_failed'));
  } finally {
    lock_loading.value = false;
    lock_dialog.value = false;
  }
}

async function unselect_character() {
  try {
    unlock_loading.value = true;

    await sui_unselect_character(props.character);
  } catch (error) {
  } finally {
    unlock_loading.value = false;
    unlock_dialog.value = false;
  }
}
</script>

<style lang="stylus" scoped>
.character
  width 300px
  height max-content
  backdrop-filter blur(10px)
  background rgba(0, 0, 0, .3)
  border-radius 10px
  display flex
  flex-flow column nowrap
  padding .6em 1em 0
  justify-content center
  position: relative
  overflow: hidden

  &::before
    content: ''
    position: absolute
    top: 0
    right: 0
    bottom: 0
    left: 0
    background: rgba(0, 0, 0, 0.8) // Adjust the 0.5 value to increase or decrease the darkening effect
    z-index: 1

  >*
    position: relative
    z-index: 20

  &.iop
    background: url('https://assets.aresrpg.world/classe/iop_female.jpg') center / cover
    &.male
      background: url('https://assets.aresrpg.world/classe/iop_male.jpg') center / cover
  &.sram
    background: url('https://assets.aresrpg.world/classe/sram_female.jpg') center / cover
    &.male
      background: url('https://assets.aresrpg.world/classe/sram_male.jpg') center / cover

  &.locked
    border 1px solid #FFCA28

  .actions
    display flex
    justify-content flex-end
    font-size .8em

  span.name
    text-transform capitalize
    font-size 1.2em
    color #ddd
    padding-bottom .5em

    b.xp
      position absolute
      right -1em
      font-weight 900
      font-size .65em
      // text-transform uppercase
      opacity .8
      color #FFCA28
      background rgba(0, 0, 0, .3)
      border-radius 5px
      padding .25em .5em

  .field
    display flex
    flex-flow row nowrap
    align-items center
    .title
      font-weight bold
      font-size .65em
      text-transform uppercase
      opacity .7
    .value
      font-size .8em
      margin-left .5em
      text-transform capitalize

    i.bx
      font-size .875em
      margin-left .5em
      &.bx-male-sign
        color #26C6DA
      &.bx-female-sign
        color #EC407A
    a
      text-decoration underline
      opacity .7
      font-style italic

.dialog-content
  display flex
  align-items center
  justify-content center
.dialog-footer
  display flex
  justify-content flex-end
</style>
