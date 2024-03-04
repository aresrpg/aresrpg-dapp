<i18n>
fr:
  logout: Déconnexion
  connect: Connexion
  with: Avec
  login: Choisir une méthode de connexion
  alt: Utiliser google vous fournira un portefeuille Sui invisible utilisant {0}
  alt2: Si vous préférez utiliser votre propre portefeuille et gérer chaque transaction, choisissez l'option Sui
  quest: Quêtes terminées
en:
  logout: Logout
  connect: Connect
  with: With
  login: Choose a login method
  alt: Using google will provide you with an invisible Sui wallet using {0}
  alt2: If you prefer using your own wallet and manage each transaction, choose the Sui option
  quest: Quests completed
</i18n>

<script setup>
import { inject, ref, computed, onMounted, watch } from 'vue';
import useBreakpoints from 'vue-next-breakpoints';
import { useI18n } from 'vue-i18n';
import Dropdown from 'v-dropdown';

import {
  VITE_MICROSOFT_REDIRECT_URI,
  VITE_AZURE_CLIENT,
  VITE_DISCORD_CLIENT_ID,
  VITE_DISCORD_REDIRECT_URI,
} from '../../env.js';
import suiWalletSelector from '../sui-login/sui-wallet-selector.vue';
import { use_client } from '../../core/sui/client';

const { t } = useI18n();

const selected_wallet = inject('selected_wallet');
const selected_account = inject('selected_account');
const sui_balance = ref(null);

const update_selected_account = account => {
  selected_account.value = account;
  localStorage.setItem('last_selected_address', account.address);
};

const breakpoints = useBreakpoints({
  mobile: 1000,
});

// dialog to choose between google and Sui Wallet
const login_dialog = ref(false);
// dialog to choose the Sui Wallet
const sui_wallet_dialog = ref(false);
const account_select_dropdown = ref(false);
const dropdown = ref(null);

const client = use_client();

const available_accounts = computed(() => {
  if (!selected_wallet.value) return [];
  // return accounts without the selected index
  return selected_wallet.value.accounts.filter(
    ({ address }) => address !== selected_account.value.address,
  );
});

watch(
  selected_account,
  async () => {
    if (!selected_account.value) return;
    try {
      sui_balance.value = (await client.get_sui_balance()).toFixed(3);
    } catch (error) {
      console.error(error);
    }
  },
  { immediate: true },
);

const network = computed(() => {
  const current_chain = selected_wallet.value?.chain;
  if (!current_chain) return 'mainnet';

  const [, chain] = current_chain.split(':');

  return chain;
});

function address_display(account) {
  if (!account) return 'not found';
  if (account.alias) return account.alias;
  return `${account.address.slice(0, 6)}...${account.address.slice(-4)}`;
}
</script>

<template lang="pug">
nav(:class="{ small: breakpoints.mobile.matches }")
  vs-row(justify="end")
    vs-button.btn(v-if="!selected_wallet" type="border" color="#eee" @click="login_dialog = true")
      i.bx.bx-droplet
      span {{ t('connect') }}
    vs-row.row(v-else justify="end")
      //- .badge Mastery {{ user.mastery }} #[img.icon(src="../assets/056-light.png")]
      .sui-balance(v-if="sui_balance !== null")
        span {{ sui_balance }}
        img.icon(src="../../assets/sui-logo.png")
      .badge(:class="{ mainnet: network === 'mainnet' }") Sui {{ network }} #[img.icon(:src="selected_wallet.icon")]
      //- .badge(v-if="user.auth.zealy") {{ user.auth.zealy.completed_quests }} {{ t('quest') }} #[img.icon(src="../assets/019-priest.png")]
      //- .badge(v-if="user.auth.discord") {{ user.auth.discord.staff ? 'Staff' : 'Player' }} #[img.icon(v-if="user.auth.discord.staff" src="../assets/037-freeze.png")]
      // Address container with dropdown

      Dropdown(:border="false" ref="dropdown")
        template(#trigger)
          vs-button(type="transparent" color="#eee").address_container
            span.address {{ address_display(selected_account) }}
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
            vs-button.btn(type="transparent" block color="#E74C3C" @click="() => selected_wallet.disconnect()")
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
      font-family 'Itim', cursive
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
