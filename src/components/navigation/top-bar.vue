<i18n>
fr:
  logout: Déconnexion
  disconnect: Déconnexion
  connect: Connexion
  with: Avec
  login: Choisir une méthode de connexion
  alt: Utiliser google vous fournira un portefeuille Sui invisible utilisant {0}
  alt2: Si vous préférez utiliser votre propre portefeuille et gérer chaque transaction, choisissez l'option Sui
  quest: Quêtes terminées
  offline_ws: Hors ligne
  online_ws: En ligne
  testnet: Vous êtes actuellement sur un test network
en:
  logout: Logout
  disconnect: Disconnect
  connect: Connect
  with: With
  login: Choose a login method
  alt: Using google will provide you with an invisible Sui wallet using {0}
  alt2: If you prefer using your own wallet and manage each transaction, choose the Sui option
  quest: Quests completed
  offline_ws: Offline
  online_ws: Online
  testnet: You are currently on a test network
</i18n>

<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue';
import useBreakpoints from 'vue-next-breakpoints';
import { useI18n } from 'vue-i18n';
import Dropdown from 'v-dropdown';

import suiWalletSelector from '../sui-login/sui-wallet-selector.vue';
import { context } from '../../core/game/game.js';
import { mists_to_sui } from '../../core/sui/client.js';

const { t } = useI18n();

const update_selected_account = account => {
  context.dispatch('action/select_address', account.address);
  localStorage.setItem('last_selected_address', account.address);
};

const breakpoints = useBreakpoints({
  mobile: 1000,
});
// dialog to choose between google and Sui Wallet
const login_dialog = ref(false);
// dialog to choose the Sui Wallet
const sui_wallet_dialog = ref(false);
const dropdown = ref(null);

const available_accounts = inject('available_accounts');
const current_wallet = inject('current_wallet');
const current_network = inject('current_network');
const current_address = inject('current_address');
const current_account = inject('current_account');
const sui_balance = inject('sui_balance');

function address_display(account) {
  if (!account) return 'not found';
  if (account.alias) return account.alias;
  return `${account.address.slice(0, 6)}...${account.address.slice(-4)}`;
}
</script>

<template lang="pug">
nav(:class="{ small: breakpoints.mobile.matches }")
  .beware-tesnet(v-if="current_wallet && current_network !== 'mainnet'") {{ t('testnet') }}
  vs-row(justify="end")
    // ======
    vs-button.btn(v-if="!current_wallet" type="border" color="#eee" @click="login_dialog = true")
      i.bx.bx-droplet
      span {{ t('connect') }}
    vs-row.row(v-else justify="end")
      .sui-balance(v-if="sui_balance != null")
        span {{ mists_to_sui(sui_balance) }}
        img.icon(src="../../assets/sui/sui-logo.png")
      .badge(:class="{ mainnet: current_network === 'mainnet' }") Sui {{ current_network }} #[img.icon(:src="current_wallet.icon")]
      // Address container with dropdown

      Dropdown(:border="false" ref="dropdown")
        template(#trigger)
          vs-button(type="transparent" color="#eee").address_container
            span.address {{ address_display(current_account) }}
            i.bx.bx-chevron-down
        .dropdown-content
          vs-row(justify="center")
            vs-button.btn(
              type="transparent"
              block color="#9E9E9E"
              v-for="account in available_accounts"
              :key="account.address"
              @click="() => (update_selected_account(account), dropdown.close())"
            ) {{ address_display(account) }}
          vs-row(justify="center")
            vs-button.btn(type="transparent" block color="#E74C3C" @click="() => current_wallet.disconnect()")
              i.bx.bx-log-out
              span {{ t('logout') }}
      //- vs-avatar(history size="60" @click="logout_dialog = true")
        img(:src="avatar")

  // First login dialog to choose between google (ZkLogin) and Sui Wallet

  vs-dialog(v-model="login_dialog" overlay-blur)
    template(#header)
      img.logo(src="../../assets/logo.png")
    vs-row(justify="center")
      .title {{ t('login') }}
    vs-button.btn(type="gradient" block color="#E74C3C" disabled)
      i.bx.bxl-google
      span Google
    vs-button.btn(type="gradient" block color="#3498DB" @click="(sui_wallet_dialog = true, login_dialog = false)")
      i.bx.bx-droplet
      span SUI Wallet
    template(#footer)
      vs-row(justify="center")
        i18n-t.alt(keypath="alt" tag="span")
          a.zklogin(href="https://sui.io/zklogin", target="_blank") ZkLogin
      vs-row(justify="center")
        span.alt {{ t('alt2') }}

  // Second dialog to select the Sui wallet

  vs-dialog(v-model="sui_wallet_dialog" overlay-blur not-padding)
    suiWalletSelector(@connection_done="sui_wallet_dialog = false")

</template>

<style lang="stylus" scoped>
.beware-tesnet
  position absolute
  top 0
  left 0
  width 100%
  height 25px
  display flex
  justify-content center
  align-items center
  font-size .7em
  font-weight bold
  text-transform uppercase
  background linear-gradient(100deg, crimson, #EE5A24)

.logo
  width 200px
  filter drop-shadow(1px 2px 3px black)
.icon
  width 20px
  object-fit contain
  margin-left .3em
span.alt
  font-size .8em
  .zklogin
    color #3498DB
    text-decoration underline
    cursor pointer
    &:hover
      text-decoration none

.sui-balance
  display flex
  margin-right 1em
  justify-content center
  align-items center
  height max-content
  span
    font-size .875em
    margin-right .5em
  img
    transform translateY(-2px)
    width 15px
    object-fit contain

nav
  padding 1em
  .row
    align-items center
    .address_container
      .address
        font-size 1.2em
        text-shadow 1px 2px 3px black
      i
        font-size 1.3em
        margin-left .5em
    .badge
      display flex
      align-items center
      margin .25em
      text-transform capitalize
      box-shadow 1px 2px 3px black
      border-radius 20px
      border 1px solid #F39C12
      font-size .8em
      color #ECF0F1
      padding .25em 1em
      &.mainnet
        border 1px solid #27AE60
    .username
      cursor default
      margin-right .5em
      text-transform capitalize
      font-size 1.3em
      margin-left 1em

.not-mainnet
  width 100%
  position absolute
  top 0
  left 0
  z-index 10000
  background crimson
  display flex
  justify-content center
  align-items center
  text-transform uppercase
  font-size .6em
  padding .5em
  font-weight bold
  opacity .7

.dropdown-content
  padding .5em
  font-size .8em
  user-select none
  backdrop-filter blur(10px)
  background rgba(0, 0, 0, .5)
</style>
