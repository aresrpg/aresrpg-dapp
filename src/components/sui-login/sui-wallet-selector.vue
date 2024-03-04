<i18n>
en:
  connect: Connect a Wallet
  what: What is a Wallet
  section1_title: Easy login
  section1_desc: No need to create new accounts and passwords for every website. Just connect your wallet and get going.
  section2_title: Store your Digital Assets
  section2_desc: Send, receive, store, and display your items and tokens.
  wallet_connect_refused: Why did you cancel ? 🫠
fr:
  connect: Connecter un Portefeuille
  what: Qu'est-ce qu'un Portefeuille
  section1_title: Connexion facile
  section1_desc: Pas besoin de créer de nouveaux comptes et mots de passe pour chaque site Web. Connectez simplement votre portefeuille et c'est parti.
  section2_title: Stockez vos actifs numériques
  section2_desc: Envoyez, recevez, stockez et affichez vos objets et tokens.
  wallet_connect_refused: Pourquoi avez-vous annulé ? 🫠
</i18n>

<template lang="pug">
.container
  .left-pane
    .head {{ t('connect') }}
    .wallet(v-for="wallet in wallets" :key="wallet.name" @click="() => connect_to_wallet(wallet)")
      img(:src="wallet.icon" :alt="wallet.name")
      span {{ wallet.name }}
  .right-pane
    .head {{ t('what') }}
    .content
      .section
        .title {{ t('section1_title') }}
        .desc {{ t('section1_desc') }}
      .section
        .title {{ t('section2_title') }}
        .desc {{ t('section2_desc') }}
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { inject } from 'vue';

import toast from '../../toast';

const { t } = useI18n();
const wallets = inject('wallets');
const emits = defineEmits(['connection_done']);

async function connect_to_wallet(wallet) {
  try {
    await wallet.connect();
  } catch (error) {
    console.error(error);
    toast.error(t('wallet_connect_refused'), 'Hey !');
  } finally {
    emits('connection_done');
  }
}
</script>

<style lang="stylus" scoped>
.head
  font-size 1.3em
  font-weight 900
  margin-bottom 1em

.container
  display flex
  flex-flow row nowrap
  min-height 400px
  .left-pane
    display flex
    flex-flow column nowrap
    min-width max-content
    padding 1em
    .wallet
      display flex
      align-items center
      font-size 1.1em
      padding .5em
      transition 100ms
      border-radius 10px
      img
        width 30px
        border-radius 10px
        height @width
        object-fit cover
        margin-right .5em
      &:hover
        cursor pointer
        background rgba(white, .2)
  .right-pane
    display flex
    flex-flow column nowrap
    align-items center
    padding 1em
    background #282828
    .content
      display flex
      flex-flow column nowrap
      padding 3em
      .section
        margin-bottom 2em
        .title
          font-size 1.1em
          margin-bottom .5em
        .desc
          font-size .9em
          padding-left .5em
          opacity .8
</style>
