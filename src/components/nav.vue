<i18n>
fr:
  logout: Déconnexion
  connect: Connexion
  with: Avec
  login: Choisir une méthode de connexion
  alt: Vous pourrez toujours lier vos comptes plus tard
  play: Jouer
  sure: A bientôt !
  quest: Quêtes terminées
en:
  logout: Logout
  connect: Connect
  with: With
  login: Choose a login method
  alt: You can always link your accounts later
  play: Play
  sure: Come back soon !
  quest: Quests completed
</i18n>

<script setup>
import { inject, computed, ref, onMounted } from 'vue';
import useBreakpoints from 'vue-next-breakpoints';
import { useI18n } from 'vue-i18n';

import request from '../request.js';
import moai from '../assets/moai.png';
import {
  VITE_MICROSOFT_REDIRECT_URI,
  VITE_AZURE_CLIENT,
  VITE_DISCORD_CLIENT_ID,
  VITE_DISCORD_REDIRECT_URI,
} from '../env.js';
import router from '../router';

const { t, locale, isGlobal } = useI18n();

const user = inject('user');
const logged = computed(() => user?.uuid);
const linked = computed(() => user?.discord);
const breakpoints = useBreakpoints({
  mobile: 1000,
});

const login_dialog = ref(false);
const logout_dialog = ref(false);

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

const disconnect = () =>
  request('mutation { logout }').then(() => {
    router.push('/');
    setTimeout(() => {
      window.location.reload();
    }, 50);
  });

function connect_discord() {
  window.location.href = discord_login;
}

function connect_microsoft() {
  window.location.href = microsoft_login;
}

function play_now() {
  window.open('https://play.aresrpg.world', '_blank');
}

const avatar = computed(() => {
  const discord_id = user?.auth?.discord?.id;
  const avatar = user?.auth?.discord?.avatar;
  if (!discord_id)
    return 'https://st3.depositphotos.com/9998432/13335/v/450/depositphotos_133351928-stock-illustration-default-placeholder-man-and-woman.jpg';
  return `https://cdn.discordapp.com/avatars/${discord_id}/${avatar}.png?size=128`;
});

const username = computed(() => {
  const discord_username = user?.auth?.discord?.username;
  const minecraft_username = user?.auth?.minecraft?.username;
  return discord_username || minecraft_username || 'Anon';
});
</script>

<template lang="pug">
nav(:class="{ small: breakpoints.mobile.matches }")
  vs-row(justify="end")
    vs-button.btn(v-if="!logged" type="gradient" color="#2ECC71" @click="play_now")
      i.bx.bx-joystick-button
      span {{ t('play') }}
    vs-button.btn(v-if="!logged" type="border" color="#eee" @click="login_dialog = true")
      i.bx.bx-user-pin
      span {{ t('connect') }}
    vs-row.row(v-else justify="end")
      .badge Mastery {{ user.mastery }} #[img.icon(src="../assets/056-light.png")]
      .badge(v-if="user.auth.zealy") {{ user.auth.zealy.completed_quests }} {{ t('quest') }} #[img.icon(src="../assets/019-priest.png")]
      .badge(v-if="user.auth.discord") {{ user.auth.discord.staff ? 'Staff' : 'Player' }} #[img.icon(v-if="user.auth.discord.staff" src="../assets/037-freeze.png")]
      .username {{ username }}
      vs-avatar(history size="60" @click="logout_dialog = true")
        img(:src="avatar")
  vs-dialog(v-model="logout_dialog" overlay-blur)
    template(#header)
      img.logo(src="../assets/logo.png")
    vs-row(justify="center")
    vs-button.btn(type="relief" block color="#E74C3C" @click="disconnect")
      i.bx.bx-log-out
      span {{ t('logout') }}
    template(#footer)
      vs-row(justify="center")
        span.alt {{ t('sure') }}
  vs-dialog(v-model="login_dialog" overlay-blur)
    template(#header)
      img.logo(src="../assets/logo.png")
    vs-row(justify="center")
      .title {{ t('login') }}
    vs-button.btn(type="relief" block color="#7289da" @click="connect_discord")
      i.bx.bxl-discord-alt
      span Discord
    vs-button.btn(type="relief" block color="#E74C3C" disabled)
      i.bx.bxl-google
      span Google
    vs-button.btn(type="relief" block color="#2ECC71" @click="connect_microsoft")
      i.bx.bxl-microsoft
      span Minecraft
    vs-button.btn(type="relief" block color="#3498DB" disabled)
      i.bx.bx-droplet
      span SUI
    template(#footer)
      vs-row(justify="center")
        span.alt {{ t('alt') }}
</template>

<style lang="stylus" scoped>
.logo
  width 100px
  filter drop-shadow(1px 2px 3px black)
.icon
  width 20px
  object-fit contain
  margin-left .3em
span.alt
  font-size .8em

nav
  padding 1em
  .row
    align-items center
    .badge
      display flex
      align-items center
      margin .25em
      text-transform capitalize
      box-shadow 1px 2px 3px black
      border-radius 20px
      border 1px solid #ECF0F1
      font-size .8em
      color #ECF0F1
      padding .25em 1em
      font-family 'Itim', cursive
    .username
      cursor default
      margin-right .5em
      text-transform capitalize
      font-size 1.3em
      margin-left 1em
</style>
