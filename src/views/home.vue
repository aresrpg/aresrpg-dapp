<script setup>
import { onMounted, inject } from 'vue';
import a_nav from '../components/nav.vue';
import discord_info from '../components/user.info.vue';
import server_info from '../components/server.info.vue';
import inventory from '../components/inventory.vue';

const resync = inject('resync');
const user = inject('user');

onMounted(() => {
  resync.value++;
});
</script>

<template lang="pug">
.app
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
