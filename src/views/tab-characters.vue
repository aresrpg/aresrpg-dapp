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
      La liberté est vôtre : équipez vos personnages comme bon vous semble, et si vous le souhaitez, vous pouvez facilement les retirer ou leurs objets pour les mettre en vente sur le marché.
      AresRPG n'est pas seulement un jeu ; c'est un royaume dans lequel vos décisions façonnent votre destin, et vos actifs vous appartiennent véritablement.
    locked_characters: 🔒 Personnages sélectionnés
    locked_characters_desc: Ces personnages sont actuellement utilisés, vous pouvez jouer avec eux dans le jeu
    unlocked_characters: Personnages disponibles
    unlocked_characters_desc: Ceux-ci sont uniquement dans votre portefeuille, vous pouvez librement les transférer ou les vendre
    new: Nouveau personnage
  en:
    welcome: Welcome Adventurer!
    explanation: |
      AresRPG is an immersive voxel-based MMORPG that unfolds entirely within your browser, uniquely crafted atop the {0} chain.
      Our innovative approach eliminates the need for traditional databases; every piece of data is securely stored on-chain.
      This means you, as a User, hold complete ownership over your in-game assets.
      Everything from items and characters to gold coins and titles resides within your wallet, offering you unparalleled control and security.
      In a bid to make AresRPG accessible to everyone, we absorb transaction costs for users who sign in through Google (ZkLogin), allowing you to dive into our infinite world for free.
    explanation2: |
      The game offers limitless character creation, enabling you to forge as many personas as you wish.
      Each character embarks on its own unique journey, boasting a personalized inventory and progression pathway.
      The freedom is yours: Stuff your characters as you see fit, and should you decide, you can easily withdraw them or their items to feature anything on the marketplace for trade.
      AresRPG is not just a game; it's a realm where your decisions craft your destiny, and your assets are truly your own.
    locked_characters: 🔒 Selected characters
    locked_characters_desc: Those characters are currently in use, you can play with them in the game
    unlocked_characters: Available characters
    unlocked_characters_desc: These one are only in your wallet, you can freely transfer or sell them
    new: New character
</i18n>

<script setup>
import { useI18n } from 'vue-i18n';
import { ref, provide, inject, defineAsyncComponent } from 'vue';

import sectionHeader from '../components/misc/section-header.vue';
import sectionContainer from '../components/misc/section-container.vue';

const UserCharacter = defineAsyncComponent(
  () => import('../components/cards/user-character.vue'),
);
const CharacterCreateVue = defineAsyncComponent(
  () => import('../components/game-ui/character-create.vue'),
);
const { t } = useI18n();

const new_character_dialog = ref(false);

const locked_characters = inject('locked_characters');
const unlocked_characters = inject('unlocked_characters');

provide('new_character_dialog', new_character_dialog);
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
  sectionHeader(:title="t('locked_characters')" :desc="locked_characters ? t('locked_characters_desc') : null" color="#00C853")
    .character-container
      div.nothing(v-if="locked_characters[0]?.id === 'default'")
      UserCharacter(v-else v-for="character in locked_characters" :key="character.id" :locked="true" :character="character")

  // Unlocked characters
  sectionHeader(:title="t('unlocked_characters')" :desc="t('unlocked_characters_desc')" color="#212121")
    .character-container
      UserCharacter(v-if="unlocked_characters" v-for="character in unlocked_characters" :key="character.id" :character="character")
      .new(@click="new_character_dialog = true") {{ t('new') }}

  // Create a new character
  CharacterCreateVue(@cancel="new_character_dialog = false")
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
