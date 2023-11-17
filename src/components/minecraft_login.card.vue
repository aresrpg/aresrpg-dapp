<i18n>
  fr:
    logout: Déconnexion
    connect: Connexion
  en:
    logout: Logout
    connect: Connect
</i18n>

<script setup>
import { inject, computed } from 'vue';
import card from './card.vue';
import fetch_api from '../fetch_api.js';
import { useRouter } from 'vue-router';
import { VITE_MICROSOFT_REDIRECT_URI, VITE_AZURE_CLIENT } from '../env.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const color = '#ECF0F1';
const user = inject('user');
const microsoft_login = `https://login.live.com/oauth20_authorize.srf
?client_id=${VITE_AZURE_CLIENT}
&response_type=code
&redirect_uri=${VITE_MICROSOFT_REDIRECT_URI}
&scope=XboxLive.signin%20offline_access`;

const router = useRouter();

const connect = () => (window.location.href = microsoft_login);
const disconnect = () =>
  fetch_api(`/api/logout`).then(() => {
    window.location.reload();
  });
const on_click = () => {
  if (!user.uuid) connect();
};

const avatar_link = computed(() => {
  const { uuid } = user;
  if (uuid) return `https://mc-heads.net/avatar/${uuid}/30`;
});
</script>

<template lang="pug">
card(
  :clickable="true"
  @click="on_click"
  :dropdown="user.uuid"
  :border="color"
)
  template(#content)
    img.head(v-if="user.uuid" :src="avatar_link")
    .name {{ user.uuid ? user.username : t('connect') }}
  template(#dropdown)
    .item.disabled settings
    .item.logout(@click="disconnect") {{ t('logout') }}
</template>

<style lang="stylus" scoped>
img.head
  border-radius 5px
  border 1px solid v-bind(color)
  margin-left .5em
.name
  font-size 1em
  padding .5em
  color v-bind(color)
.item
  cursor pointer
  border-radius 10px
  font-size .7em
  padding .75em 1em
  text-transform uppercase
  &:hover
    background rgba(lighten(#212121, 10%), .4)
  &.disabled
    opacity .5
    cursor default
    &:hover
      background none
</style>
