<i18n>
  en:
    edit: Edit
    lock: Lock
    unlock: Unlock
    delete: Delete
    send: Send
    delete_desc: Are you sure you want to delete this character?
    cancel: Cancel
    confirm: Confirm
    invalid_address: Invalid Sui address
    lock_desc: You're about to lock this character to access it in game, you can unlock it at anytime when you're done playing
    unlock_desc: You're about to unlock this character and retrieve it in your wallet
  fr:
    edit: Modifier
    lock: Verrouiller
    unlock: Déverrouiller
    delete: Supprimer
    send: Envoyer
    delete_desc: Êtes-vous sûr de vouloir supprimer ce personnage ?
    cancel: Annuler
    confirm: Confirmer
    invalid_address: Adresse Sui invalide
    lock_desc: Vous êtes sur le point de verrouiller ce personnage pour y accéder en jeu, vous pouvez le déverrouiller à tout moment lorsque vous avez fini de jouer
    unlock_desc: Vous êtes sur le point de déverrouiller ce personnage et de le récupérer dans votre portefeuille
</i18n>

<template lang="pug">
.character(:class="{ locked: props.locked }")
  span.name {{ props.character.name }}
  .field
    .title Xp
    .value.mastery {{ props.character.experience }}
  .field
    .title id
    a.value.id(:href="character_explorer_link" target="_blank") {{ props.character.id.slice(0, 24) }}...
  .actions
    vs-button(v-if="!props.locked" type="transparent" size="small" disabled color="#FFCA28") {{ t('edit') }}
    vs-button(
      v-if="!props.locked"
      type="transparent"
      size="small"
      color="#EF5350"
      @click="delete_dialog = true") {{ t('delete') }}
    vs-button(v-if="!props.locked" type="transparent" size="small" color="#42A5F5" @click="send_dialog = true") {{ t('send') }}
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
          vs-button(type="transparent" color="#2ECC71" @click="lock_character") {{ t('confirm') }}

    /// unlock dialog
    vs-dialog(v-model="unlock_dialog" :loading="unlock_loading")
      template(#header) {{ t('unlock') }}
      span {{ t('unlock_desc') }}
      template(#footer)
        .dialog-footer
          vs-button(type="transparent" color="#E74C3C" @click="unlock_dialog = false") {{ t('cancel') }}
          vs-button(type="transparent" color="#2ECC71" @click="unlock_character") {{ t('confirm') }}

    /// send dialog
    vs-dialog(v-model="send_dialog" :loading="send_loading")
      template(#header) {{ t('send') }}
      .dialog-content
        vs-input(v-model="send_to" block label="Sui address" color="#448AFF" icon-after)
          template(#icon)
            i.bx.bx-droplet
          template(#message-warn v-if="send_to && !is_valid_sui_address") {{ t('invalid_address') }}
      template(#footer)
        .dialog-footer
          vs-button(type="transparent" color="#E74C3C" @click="send_dialog = false") {{ t('cancel') }}
          vs-button(type="transparent" color="#2ECC71" @click="send_character") {{ t('confirm') }}
</template>

<script setup>
import { computed, ref, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import { isValidSuiAddress } from '@mysten/sui.js/utils';

import { use_client } from '../../core/sui/client';

const { t } = useI18n();
const props = defineProps(['character', 'locked']);
const client = use_client();

const selected_wallet = inject('selected_wallet');
const user = inject('user');

const network = computed(() => {
  const current_chain = selected_wallet.value?.chain;
  if (!current_chain) return 'mainnet';

  const [, chain] = current_chain.split(':');

  return chain;
});

const character_explorer_link = computed(
  () => `https://suiscan.xyz/${network.value}/object/${props.character.id}`,
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

const receipt_id = computed(() => {
  return user.character_lock_receipts?.find(
    ({ character_id }) => character_id === props.character.id,
  )?.id;
});

async function delete_character() {
  try {
    delete_loading.value = true;
    await client.delete_character(props.character.id);
  } catch (error) {
    console.error(error);
  } finally {
    delete_loading.value = false;
    delete_dialog.value = false;
  }
}

async function lock_character() {
  try {
    lock_loading.value = true;
    console.log('locking', props.character.id);
    await client.lock_character(props.character.id);
  } catch (error) {
    console.error(error);
  } finally {
    lock_loading.value = false;
    lock_dialog.value = false;
  }
}

async function unlock_character() {
  try {
    unlock_loading.value = true;

    console.log('unlocking', props.character.id, receipt_id.value);

    if (!receipt_id.value) throw new Error('No receipt id found');

    await client.unlock_character(receipt_id.value);
  } catch (error) {
    console.error(error);
  } finally {
    unlock_loading.value = false;
    unlock_dialog.value = false;
  }
}

async function send_character() {
  try {
    send_loading.value = true;
    if (!is_valid_sui_address.value) throw new Error('Invalid Sui address');
    await client.send_object(props.character.id, send_to.value);
  } catch (error) {
    console.error(error);
  } finally {
    send_loading.value = false;
    send_dialog.value = false;
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
  overflow hidden
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
