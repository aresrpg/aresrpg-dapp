<i18n>
  en:
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
.character(:class="{ locked: props.locked, [props.character.type]: true, male: props.character.male }")
  span.name {{ props.character.name }} #[b.xp Lvl {{ experience_to_level(props.character.experience) }}]
  .field
    .title classe:
    .value {{ props.character.type }}
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
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { isValidSuiAddress } from '@mysten/sui.js/utils';

import { experience_to_level } from '../../core/utils/game/experience.js';
import { context } from '../../core/game/game.js';
import {
  sui_delete_character,
  sui_lock_character,
  sui_send_object,
  sui_unlock_character,
} from '../../core/sui/client.js';

const { t } = useI18n();
const props = defineProps(['character', 'locked']);

const genrer_icon = computed(() =>
  props.character.male ? 'bx-male-sign' : 'bx-female-sign',
);

const network = ref('mainnet');

const character_explorer_link = computed(
  () => `https://suiscan.xyz/${network.value}/object/${props.character.id}`,
);

function update_network({ sui: { selected_wallet_name, wallets } }) {
  const selected_wallet = wallets[selected_wallet_name];
  if (selected_wallet) {
    const [, chain] = selected_wallet.chain.split(':');
    if (chain !== network.value) network.value = chain;
  }
}

onMounted(() => {
  context.events.on('STATE_UPDATED', update_network);
  update_network(context.get_state());
});

onUnmounted(() => {
  context.events.off('STATE_UPDATED', update_network);
});

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
    await sui_delete_character(props.character.id);
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
    await sui_lock_character(props.character.id);
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

    const receipt = context
      .get_state()
      .sui.character_lock_receipts?.find(
        ({ character_id }) => character_id === props.character.id,
      );

    if (!receipt) throw new Error('No receipt id found');

    await sui_unlock_character(receipt);
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
    await sui_send_object(props.character.id, send_to.value);
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

  &.IOP
    background: url('../../assets/class/iop_f.jpg') center / cover
    &.male
      background: url('../../assets/class/iop.jpg') center / cover
  &.SRAM
    background: url('../../assets/class/sram_f.jpg') center / cover
    &.male
      background: url('../../assets/class/sram.jpg') center / cover

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
