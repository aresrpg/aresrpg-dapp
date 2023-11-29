<i18n>
fr:
  unlink: Délier
  sure: Délier ce compte ?
  yes: Oui
  no: Non
  check: Vérifier
  accounts_desc: Vous pouvez lier vos comptes pour accéder à plus de fonctionnalités et vous connecter depuis n'importe lequel.
  mastery_desc: Vous pouvez gagner des items sur Zealy en accomplissant des tonnes de quêtes ! N'oubliez pas de vérifier si vous étiez sur AresRPG v1 pour encore plus de récompenses
  success_v1: GG ! Vous êtes un vétéran confirmé 😀
  discord_account: Compte Discord
  google_account: Compte Google
  minecraft_account: Compte Minecraft
  sui_account: Wallet SUI
en:
  unlink: Unlink
  sure: Unlink this account ?
  yes: Yes
  no: No
  check: Check
  accounts_desc: You can link your accounts to get access to more features and login from any of them.
  mastery_desc: You can win items on Zealy by accomplishing tons of quests ! Don't forget to check if you were part of AresRPG v1 for even more rewards
  success_v1: GG ! You are a confirmed veteran 😀
  discord_account: Discord Account
  google_account: Google Account
  minecraft_account: Minecraft Account
  sui_account: Wallet SUI
</i18n>

<template lang="pug">
.settings
  section.accounts
    .title Accounts
    .desc {{ t('accounts_desc') }}
    .content
      .discord
        .title {{ t('discord_account') }}
        vs-switch(v-model="discord_toggle" color="#7289da")
          span {{ discord_toggle ? discord_username : 'Link now' }}
          i.bx.bxl-discord-alt
      .google.disabled
        .title {{ t('google_account') }}
        vs-switch(v-model="google_toggle" color="#E74C3C")
          span {{ google_toggle ? google_email : 'Link now' }}
          i.bx.bxl-google
      .minecraft
        .title {{ t('minecraft_account') }}
        vs-switch(v-model="minecraft_toggle" color="#2ECC71")
          span {{ minecraft_toggle ? minecraft_username : 'Link now' }}
          i.bx.bxl-microsoft
      .sui.disabled
        .title {{ t('sui_account') }}
        vs-switch(v-model="sui_toggle" color="#3498DB")
          span {{ sui_toggle ? 'Linked' : 'Link now' }}
          i.bx.bx-droplet
  section.mastery
    .title Mastery
    .desc {{ t('mastery_desc') }}
    .content
      .zealy
        img(src="../assets/crew3.svg")
        .title Zealy
        vs-button.btn(type="gradient" color="#3498DB" @click="refresh_zealy" :loading="zealy_loading")
          i.bx.bx-sm.bx-refresh
          span Refresh
      .v1
        img(src="../assets/logov1.png")
        .title Ares V1
        vs-button.btn(v-if="gtla == null" type="gradient" color="#F39C12" @click="refresh_v1")
          i.bx-sm.bx.bx-cloud-rain
          span {{ t('check') }}
        i.bx.bx-message-square-check(v-else-if="gtla")
        i.bx.bx-no-entry(v-else)
  vs-dialog(v-model="unlink_discord_dialog" overlay-blur)
    span {{ t('sure') }}
    template(#footer)
      vs-row
        vs-button.btn(type="gradient" color="#E74C3C" @click="unlink_discord")
          i.bx.bx-unlink
          span {{ t('yes') }}
        vs-button.btn(type="gradient" color="#2ECC71" @click="unlink_discord_dialog = false")
          i.bx.bx-collapse-alt
          span {{ t('no') }}
  vs-dialog(v-model="unlink_minecraft_dialog" overlay-blur)
    span {{ t('sure') }}
    template(#footer)
      vs-row
        vs-button.btn(type="gradient" color="#E74C3C" @click="unlink_minecraft")
          i.bx.bx-unlink
          span {{ t('yes') }}
        vs-button.btn(type="gradient" color="#2ECC71" @click="unlink_minecraft_dialog = false")
          i.bx.bx-collapse-alt
          span {{ t('no') }}
</template>

<script setup>
import { ref, computed, inject, watchEffect, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { VsNotification } from 'vuesax-alpha';

import request from '../request.js';
import {
  VITE_AZURE_CLIENT,
  VITE_MICROSOFT_REDIRECT_URI,
  VITE_DISCORD_CLIENT_ID,
  VITE_DISCORD_REDIRECT_URI,
} from '../env';
import router from '../router';

const { t } = useI18n();
const user = inject('user');
const resync = inject('resync');

const discord_toggle = ref(false);
const google_toggle = ref(false);
const minecraft_toggle = ref(false);
const sui_toggle = ref(false);
const zealy_loading = ref(false);

const discord_username = computed(() => user?.auth?.discord?.username);
const google_email = computed(() => user?.auth?.google?.email);
const minecraft_username = computed(() => user?.auth?.minecraft?.username);
const gtla = computed(() => user?.auth?.gtla);

const microsoft_login = `https://login.live.com/oauth20_authorize.srf
?client_id=${VITE_AZURE_CLIENT}
&response_type=code
&redirect_uri=${VITE_MICROSOFT_REDIRECT_URI}
&scope=XboxLive.signin%20offline_access`;

const discord_login = `https://discord.com/api/oauth2/authorize
?client_id=${VITE_DISCORD_CLIENT_ID}
&redirect_uri=${VITE_DISCORD_REDIRECT_URI}
&response_type=code
&scope=identify%20guilds.members.read
`;

const unlink_discord_dialog = ref(false);
const unlink_minecraft_dialog = ref(false);

const unlink_discord = () => {
  unlink_discord_dialog.value = false;
  request('mutation { discord { unlink } }').then(success => {
    if (success) window.location.reload();
    else unlink_discord_dialog.value = false;
  });
};

const unlink_minecraft = () => {
  request('mutation { minecraft { unlink } }').then(success => {
    if (success) window.location.reload();
    else unlink_minecraft_dialog.value = false;
  });
};

watch(discord_toggle, () => {
  if (discord_toggle.value && !user?.auth?.discord?.id) {
    discord_toggle.value = false;
    window.location.href = discord_login;
  } else if (!discord_toggle.value && user?.auth?.discord?.id) {
    unlink_discord_dialog.value = true;
    discord_toggle.value = true;
  }
});

watch(minecraft_toggle, () => {
  if (minecraft_toggle.value && !user?.auth?.minecraft?.uuid) {
    minecraft_toggle.value = false;
    window.location.href = microsoft_login;
  } else if (!minecraft_toggle.value && user?.auth?.minecraft?.uuid) {
    unlink_minecraft_dialog.value = true;
    minecraft_toggle.value = true;
  }
});

watchEffect(() => {
  discord_toggle.value = !!user?.auth?.discord?.id;
  google_toggle.value = false;
  minecraft_toggle.value = !!user?.auth?.minecraft?.uuid;
});

onMounted(() => {
  if (!user.uuid) router.push('/');
});

function refresh_zealy() {
  zealy_loading.value = true;
  request('mutation { zealy { refresh } }').then(success => {
    zealy_loading.value = false;
    if (success) {
      router.push('/');
      resync.value++;
    }
  });
}

function refresh_v1() {
  request('mutation { minecraft { refreshV1Data } }').then(success => {
    if (success) {
      VsNotification({
        icon: `<i class='bx bx-rocket'></i>`,
        flat: true,
        color: 'success',
        position: 'top-center',
        title: 'Yay!',
        text: t('success_v1'),
      });
      resync.value++;
    }
  });
}
</script>

<style lang="stylus" scoped>
.vs-switch
  display flex
  align-items center
  span
    padding-right .25em

.bx-message-square-check
  font-size 2em
  color #2ECC71
  filter drop-shadow(1px 2px 3px #2ECC71)

.bx-no-entry
  font-size 2em
  color #E74C3C
  filter drop-shadow(1px 2px 3px #E74C3C)

.disabled
  opacity .5

.settings
  display flex
  flex-flow column nowrap
  padding 3em
  >section
    width 100%
    border-top 1px solid white
    display flex
    flex-flow column nowrap
    >.title
      font-size .8em
      margin-bottom .5em
      text-transform uppercase
      font-weight 900
    >.desc
      font-size .9em
      margin-bottom .5em
      opacity .7
      position relative
      margin-left 1em
      &:before
        content ''
        margin-right .5em
        height 100%
        background #ddd
        width 2px
        position absolute
        left -10px
    .content
      display flex
      flex-flow column nowrap
      padding 2em
      >div
        display flex
        flex-flow row nowrap
        align-items center
        margin-bottom .5em
        img
          width 30px
          height @width
          object-fit contain
          margin-right .5em
          filter drop-shadow(1px 2px 3px black)
        .title
          padding-right 1em
          width 150px
          font-size .875em
</style>
