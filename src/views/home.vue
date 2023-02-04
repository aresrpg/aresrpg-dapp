<script setup>
import { onMounted, inject } from 'vue';
import a_nav from '../components/nav.vue';
import player_info from '../components/player_info.vue';

const resync = inject('resync');
const user = inject('user');

onMounted(() => {
  resync.value++;
});
</script>

<template lang="pug">
.app
  a_nav
  .content(v-if="user.discord")
    player_info
</template>

<style lang="stylus" scoped>
.app
  display flex
  flex-flow column nowrap
  .content
    display flex
    width 100%
    padding 2em
</style>
