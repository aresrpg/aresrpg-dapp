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
      :disabled="delete_loading"
      @click="delete_dialog = true") {{ t('APP_USER_DELETE') }}
    vs-button(v-if="!props.locked" type="transparent" size="small" color="#4CAF50" @click="lock_dialog = true" :disabled="lock_loading") {{ t('APP_USER_LOCK') }}
    vs-button(v-else type="transparent" size="small" color="#4CAF50" @click="unlock_dialog = true" :disabled="unlock_loading") {{ t('APP_USER_UNLOCK') }}

    /// deletion dialog
    vs-dialog(v-model="delete_dialog")
      template(#header) {{ t('APP_USER_DELETE') }}
      span {{ t('APP_USER_DELETE_DESC') }}
      template(#footer)
        .dialog-footer
          vs-button(type="transparent" color="#E74C3C" @click="delete_dialog = false") {{ t('APP_USER_CANCEL') }}
          vs-button(type="transparent" color="#2ECC71" @click="delete_character") {{ t('APP_USER_CONFIRM') }}

    /// lock dialog
    vs-dialog(v-model="lock_dialog")
      template(#header) {{ t('APP_USER_LOCK') }}
      span {{ t('APP_USER_LOCK_DESC') }}
      template(#footer)
        .dialog-footer
          vs-button(type="transparent" color="#E74C3C" @click="lock_dialog = false") {{ t('APP_USER_CANCEL') }}
          vs-button(type="transparent" color="#2ECC71" @click="select_character") {{ t('APP_USER_CONFIRM') }}

    /// unlock dialog
    vs-dialog(v-model="unlock_dialog")
      template(#header) {{ t('APP_USER_UNLOCK') }}
      span {{ t('APP_USER_UNLOCK_DESC') }}
      template(#footer)
        .dialog-footer
          vs-button(type="transparent" color="#E74C3C" @click="unlock_dialog = false") {{ t('APP_USER_CANCEL') }}
          vs-button(type="transparent" color="#2ECC71" @click="unselect_character") {{ t('APP_USER_CONFIRM') }}
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { isValidSuiAddress } from '@mysten/sui/utils';

import { experience_to_level } from '../../core/utils/game/experience.js';
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
  const is_alias = send_to.value.includes('@');
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
  const { update } = toast.tx(t('APP_USER_DELETING'), props.character.name);
  try {
    delete_loading.value = true;
    delete_dialog.value = false;
    await sui_delete_character(props.character);
    update('success', t('APP_USER_DELETED'));
  } catch (error) {
    console.error(error);
    update('error', t('APP_USER_DELETE_FAILED'));
  } finally {
    delete_loading.value = false;
  }
}

async function select_character() {
  const { update } = toast.tx(t('APP_USER_SELECTING'), props.character.name);
  try {
    lock_loading.value = true;
    lock_dialog.value = false;
    await sui_select_character(props.character);
    update('success', t('APP_USER_SELECTED'));
  } catch (error) {
    console.error(error);
    update('error', t('APP_USER_LOCK_FAILED'));
  } finally {
    lock_loading.value = false;
  }
}

function has_equipment(character) {
  return (
    character.weapon ||
    character.title ||
    character.amulet ||
    character.belt ||
    character.boots ||
    character.hat ||
    character.cloak ||
    character.pet ||
    character.left_ring ||
    character.right_ring ||
    character.relic_1 ||
    character.relic_2 ||
    character.relic_3 ||
    character.relic_4 ||
    character.relic_5 ||
    character.relic_6
  );
}

async function unselect_character() {
  const { update } = toast.tx(t('APP_USER_UNSELECTING'), props.character.name);
  if (has_equipment(props.character)) {
    update('error', t('APP_USER_UNSELECTING_STUFF'));
    return;
  }
  try {
    unlock_loading.value = true;
    unlock_dialog.value = false;
    await sui_unselect_character(props.character);
    update('success', t('APP_USER_UNSELECTED'));
  } catch (error) {
    console.error(error);
    if (error.message.includes('Some("unselect_character") }, 101)')) {
      update('error', t('APP_USER_UNSELECTING_STUFF'));
    } else update('error', t('APP_USER_UNLOCK_FAILED'));
  } finally {
    unlock_loading.value = false;
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

  &.senshi
    background: url('https://assets.aresrpg.world/classe/senshi_female.jpg') center / cover
    &.male
      background: url('https://assets.aresrpg.world/classe/senshi_male.jpg') center / cover
  &.yajin
    background: url('https://assets.aresrpg.world/classe/yajin_female.jpg') center / cover
    &.male
      background: url('https://assets.aresrpg.world/classe/yajin_male.jpg') center / cover

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
