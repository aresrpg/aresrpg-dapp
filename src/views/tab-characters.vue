<i18n>
  fr:
    welcome: Bienvenue, Aventurier !
    explanation: |
      AresRPG est un MMORPG voxel basé sur navigateur, conçu de manière unique sur la chaine {0}. Notre approche innovante élimine le besoin de bases de données traditionnelles ;
      chaque donnée est stockée de manière sécurisée sur la blockchain. Cela signifie que vous, en tant qu'Utilisateur, détenez une propriété complète sur vos actifs dans le jeu.
      Tout, des objets et des personnages aux pièces d'or et aux titres, réside dans votre portefeuille, vous offrant un contrôle et une sécurité inégalés.
      Dans le but de rendre AresRPG accessible à tous, nous prenons en charge les coûts de transaction pour les utilisateurs qui se connectent via Google,
      vous permettant de plonger dans notre monde expansif sans barrières financières.
    explanation2: |
      Le jeu offre une création de personnages illimitée, vous permettant de forger autant de personnas que vous le souhaitez.
      Chaque personnage se lance dans son propre voyage unique, avec un inventaire personnalisé et un chemin de progression.
      La liberté vous appartient : équipez vos personnages à votre guise et, si vous le décidez, vous pouvez facilement retirer ses objets pour les placer dans l'hôtel de vente ou les échanger.
      AresRPG n'est pas seulement un jeu ; c'est un royaume dans lequel vos décisions façonnent votre destin, et vos actifs vous appartiennent véritablement.
    locked_characters: 🔒 personnages verrouillés
    locked_characters_desc: Ces personnages sont actuellement utilisés, vous pouvez jouer avec eux dans le jeu
    unlocked_characters: personnages déverrouillés
    unlocked_characters_desc: Ceux-ci sont uniquement dans votre portefeuille, vous pouvez librement les transférer ou les vendre
    new: Nouveau personnage
    character_name: Nom du personnage
    create_new: Créer un nouveau personnage
    create_new_desc: Vous êtes sur le point de créer un nouveau personnage, cela créera un nouvel objet Sui qui sera envoyé à votre portefeuille !
    character_name_valid: Le nom du personnage doit être compris entre 3 et 20 caractères
    create_button: Créer
    cancel_button: Annuler
    create_storage: Créer un nouveau stockage
    crate_storage_desc: Commençons par demander de l'espace de stockage pour verrouiller vos personnages !
  en:
    welcome: Welcome Adventurer!
    explanation: |
      AresRPG is an immersive, voxel-based MMORPG that unfolds entirely within your browser, uniquely crafted atop the {0} chain.
      Our innovative approach eliminates the need for traditional databases; every piece of data is securely stored on-chain.
      This means you, as a User, hold complete ownership over your in-game assets.
      Everything from items and characters to gold coins and titles resides within your wallet, offering you unparalleled control and security.
      In a bid to make AresRPG accessible to everyone, we absorb transaction costs for users who sign in through Google (ZkLogin), allowing you to dive into our infinite world for free.
    explanation2: |
      The game offers limitless character creation, enabling you to forge as many personas as you wish.
      Each character embarks on its own unique journey, boasting a personalized inventory and progression pathway.
      The freedom is yours: equip your characters as you see fit, and should you decide, you can easily withdraw items to feature them on the marketplace for trade.
      AresRPG is not just a game; it's a realm where your decisions craft your destiny, and your assets are truly your own.
    locked_characters: 🔒 Locked characters
    locked_characters_desc: Those characters are currently in use, you can play with them in the game
    unlocked_characters: Unlocked characters
    unlocked_characters_desc: These one are only in your wallet, you can freely transfer or sell them
    new: New character
    character_name: character name
    create_new: Create a new character
    create_new_desc: You're about to create a new character, this will create a new Sui object which will be sent to your wallet !
    character_name_valid: The character name must be between 3 and 20 chars
    create_button: Create
    cancel_button: Cancel
    create_storage: Create a new storage
    crate_storage_desc: Let's start by requesting some storage space to lock your characters !
</i18n>

<script setup>
import { useI18n } from 'vue-i18n';
import { ref, inject, computed, watch, onUnmounted } from 'vue';

import sectionHeader from '../components/misc/section-header.vue';
import usercharacter from '../components/cards/user-character.vue';
import sectionContainer from '../components/misc/section-container.vue';
import { use_client } from '../core/sui/client';

const { t } = useI18n();

const new_character_dialog = ref(false);
const new_character_name = ref('');
const character_creation_loading = ref(false);

const client = use_client();

const loading = inject('loading');
const selected_account = inject('selected_account');
const user = inject('user');

async function create_character() {
  character_creation_loading.value = true;
  try {
    await client.create_character(new_character_name.value);
  } catch (error) {
    console.error(error);
  } finally {
    character_creation_loading.value = false;
    new_character_dialog.value = false;
    new_character_name.value = '';
  }
}

async function request_storage() {
  try {
    loading.value++;
    await client.request_storage();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value--;
  }
}

const is_character_name_valid = computed(
  () =>
    new_character_name.value.length > 3 &&
    new_character_name.value.length <= 20,
);
</script>

<template lang="pug">
sectionContainer
  vs-alert(type="relief" color="#0D47A1")
    template(#title) {{ t('welcome') }}
    .alert-content
      i18n-t(keypath="explanation" tag="p")
        b.sui Sui
      .explanation2 {{ t('explanation2') }}
  .space
  // Locked characters
  sectionHeader(:title="t('locked_characters')" :desc="user.locked_characters ? t('locked_characters_desc') : null" color="#00C853")
    .character-container
      div.nothing(v-if="loading")
      .request-storage(v-else-if="!user.locked_characters")
        .desc {{ t('crate_storage_desc') }}
        vs-button(type="floating" color="#00C853" @click="request_storage") {{ t('create_storage') }}
      usercharacter(v-else v-for="character in user.locked_characters" :key="character.id" :locked="true" :character="character")

  // Unlocked characters
  sectionHeader(:title="t('unlocked_characters')" :desc="t('unlocked_characters_desc')" color="#212121")
    .character-container
      usercharacter(v-if="user.unlocked_characters" v-for="character in user.unlocked_characters" :key="character.id" :character="character")
      .new(@click="new_character_dialog = true") {{ t('new') }}

  // Create a new character
  vs-dialog(v-model="new_character_dialog" :loading="character_creation_loading")
    template(#header) {{ t('create_new') }}
    .dialog-content
      span {{ t('create_new_desc') }}
      vs-input(
        v-model="new_character_name"
        :label="t('character_name')"
        label-float
        color="#448AFF"
        icon-after
      )
        template(#icon)
          i.bx.bx-user
      .note {{ t('character_name_valid') }}
    template(#footer)
      .dialog-footer
        vs-button(type="transparent" color="#E74C3C" @click="new_character_dialog = false") {{ t('cancel_button') }}
        vs-button(
          type="transparent"
          color="#2ECC71"
          @click="create_character"
          :disabled="!is_character_name_valid"
        ) {{ t('create_button') }}
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