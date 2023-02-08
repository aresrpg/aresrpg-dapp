<script setup>
import { onMounted, inject } from 'vue';
import a_nav from '../components/nav.vue';
import discord_info from '../components/user.info.vue';
import server_info from '../components/server.info.vue';
import inventory from '../components/inventory.vue';
import loading from '../components/loading.vue';

const resync = inject('resync');
const user = inject('user');
const is_loading = inject('loading');

onMounted(() => {
  resync.value++;
});
</script>

<template lang="pug">
loading(v-if="is_loading")
.app(v-else)
  a_nav
  .content
    .infos
      server_info
      discord_info(v-if="user.discord")
    inventory.inventory
</template>

<style lang="stylus" scoped>
.app
  display flex
  flex-flow column nowrap
  height 100vh
  .content
    display flex
    width 100%
    height 100%
    padding 2em
    flex-flow row nowrap
    .infos
      display flex
      flex-flow column nowrap
      >:nth-child(2)
        margin-top 1em
</style>
