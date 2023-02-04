<script setup>
import { inject, computed } from 'vue';
import card from './card.vue';
import fetch_api from '../fetch_api.js';
import { useRouter } from 'vue-router';
import { VITE_DISCORD_CLIENT_ID, VITE_DISCORD_REDIRECT_URI } from '../env.js';

const color = '#ECF0F1';
const user = inject('user');
const discord_login = `https://discord.com/api/oauth2/authorize
?client_id=${VITE_DISCORD_CLIENT_ID}
&redirect_uri=${VITE_DISCORD_REDIRECT_URI}
&response_type=code
&scope=identify%20guilds.members.read
`;

const router = useRouter();
const linked = computed(() => user?.discord);

const connect = () => (window.location.href = discord_login);
const unlink = () => fetch_api(`/discord/unlink`).then(router.go);
const on_click = () => {
  if (!linked.value) connect();
};
</script>

<template lang="pug">
card(
  :clickable="true"
  @click="on_click"
  :dropdown="linked"
  :border="color"
  background="#7289da"
)
  template(#content)
    img.logo(src="../assets/discord.png")
    .name(:class="{ unlinked: !linked }") {{ linked ? user.discord.username : 'Link Discord' }}
    .sep(v-if="linked") ₪
    .id(v-if="linked") {{  user.discord.discriminator }}
  template(#dropdown)
    .item.logout(@click="unlink") Disconnect
</template>

<style lang="stylus" scoped>
img.logo
  border-radius 5px
  border 1px solid v-bind(color)
  margin-left .5em
  margin-right .25em
  width 30px
  object-fit contain
.name, .id
  padding 0 .25em
  font-size 1em
  color v-bind(color)

.unlinked
  padding 0 .5em 0 .25em

.sep
  color #7289da

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
