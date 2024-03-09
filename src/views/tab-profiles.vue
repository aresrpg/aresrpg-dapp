<i18n>
  fr:
    welcome: Bienvenue, Aventurier !
    explanation: |
      AresRPG est un MMORPG voxel basé sur navigateur construit sur {0}. Nos serveurs n'ont pas de base de données du tout, tout est stocké on-chain.
      En tant qu'utilisateur, vous possédez l'intégralité de vos données, ce qui signifie que chaque objet, personnage, pièces d'or, et même votre nom d'utilisateur
      est stocké dans votre portefeuille. Lorsque vous utilisez la connexion via Google, nous paierons pour vos transactions, vous pouvez donc jouer gratuitement.
    explanation2: |
      Un profil est comme un sous-compte, il contient vos personnages, un inventaire partagé entre eux, leurs statistiques, les quêtes terminées, et plus encore.
      Vous pouvez créer autant de profils que vous le souhaitez et jouer avec eux ou les échanger avec d'autres joueurs.
    locked_profiles: 🔒 Profils verrouillés
    locked_profiles_desc: Ces profils sont actuellement utilisés, vous pouvez jouer avec eux dans le jeu
    unlocked_profiles: Profils déverrouillés
    unlocked_profiles_desc: Ceux-ci sont uniquement dans votre portefeuille, vous pouvez librement les transférer ou les vendre
    new: Nouveau profil
    profile_name: Nom du profil
    create_new: Créer un nouveau profil
    create_new_desc: Vous êtes sur le point de créer un nouveau profil, cela créera un nouvel objet Sui qui sera envoyé à votre portefeuille !
    profile_name_valid: Le nom du profil doit être compris entre 3 et 20 caractères
    create_button: Créer
    cancel_button: Annuler
    create_storage: Créer un nouveau stockage
    crate_storage_desc: Commençons par demander de l'espace de stockage pour verrouiller vos profils !
  en:
    welcome: Welcome Adventurer!
    explanation: |
      AresRPG is a browser-based voxel MMORPG built on {0}. Our servers have no database at all, everything is stored on-chain.
      As a User, you own the entirety of your data, which means every item, character, gold coins, and even your username
      is stored inside your wallet. When using the login through Google, we will pay for your transactions, so you can play for free.
    explanation2: |
      A profile is like a sub account, it contains your characters, an inventory shared accross them, their stats, finished quests, and more.
      You can create as many profiles as you want and play with them or trade them with other players.
    locked_profiles: 🔒 Locked profiles
    locked_profiles_desc: Those profiles are currently in use, you can play with them in the game
    unlocked_profiles: Unlocked profiles
    unlocked_profiles_desc: These one are only in your wallet, you can freely transfer or sell them
    new: New profile
    profile_name: Profile name
    create_new: Create a new profile
    create_new_desc: You're about to create a new profile, this will create a new Sui object which will be sent to your wallet !
    profile_name_valid: The profile name must be between 3 and 20 characters
    create_button: Create
    cancel_button: Cancel
    create_storage: Create a new storage
    crate_storage_desc: Let's start by requesting some storage space to lock your profiles !
</i18n>

<script setup>
import { useI18n } from 'vue-i18n';
import { ref, inject, computed, watch, onUnmounted } from 'vue';

import sectionHeader from '../components/misc/section-header.vue';
import userProfile from '../components/cards/user-profile.vue';
import sectionContainer from '../components/misc/section-container.vue';
import { use_client } from '../core/sui/client';

const { t } = useI18n();

const new_profile_dialog = ref(false);
const new_profile_name = ref('');
const profile_creation_loading = ref(false);

const client = use_client();

const loading = inject('loading');
const selected_account = inject('selected_account');
const user = inject('user');

async function create_profile() {
  profile_creation_loading.value = true;
  try {
    await client.create_profile(new_profile_name.value);
  } catch (error) {
    console.error(error);
  } finally {
    profile_creation_loading.value = false;
    new_profile_dialog.value = false;
    new_profile_name.value = '';
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

const is_profile_name_valid = computed(
  () =>
    new_profile_name.value.length > 3 && new_profile_name.value.length <= 20,
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
  // Locked profiles
  sectionHeader(:title="t('locked_profiles')" :desc="user.locked_profiles ? t('locked_profiles_desc') : null" color="#00C853")
    .profile-container
      div.nothing(v-if="loading")
      .request-storage(v-else-if="!user.locked_profiles")
        .desc {{ t('crate_storage_desc') }}
        vs-button(type="floating" color="#00C853" @click="request_storage") {{ t('create_storage') }}
      userProfile(v-else v-for="profile in user.locked_profiles" :key="profile.id" :locked="true" :profile="profile")

  // Unlocked profiles
  sectionHeader(:title="t('unlocked_profiles')" :desc="t('unlocked_profiles_desc')" color="#212121")
    .profile-container
      userProfile(v-if="user.unlocked_profiles" v-for="profile in user.unlocked_profiles" :key="profile.id" :profile="profile")
      .new(@click="new_profile_dialog = true") {{ t('new') }}

  // Create a new profile
  vs-dialog(v-model="new_profile_dialog" :loading="profile_creation_loading")
    template(#header) {{ t('create_new') }}
    .dialog-content
      span {{ t('create_new_desc') }}
      vs-input(
        v-model="new_profile_name"
        :label="t('profile_name')"
        label-float
        color="#448AFF"
        icon-after
      )
        template(#icon)
          i.bx.bx-user
      .note {{ t('profile_name_valid') }}
    template(#footer)
      .dialog-footer
        vs-button(type="transparent" color="#E74C3C" @click="new_profile_dialog = false") {{ t('cancel_button') }}
        vs-button(
          type="transparent"
          color="#2ECC71"
          @click="create_profile"
          :disabled="!is_profile_name_valid"
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

.profile-container
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
