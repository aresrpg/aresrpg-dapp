<script setup>
import login_card from './minecraft_login.card.vue';
import discord_card from './discord_login.card.vue';
import lang_selector from '../components/lang_selector.vue';
import { inject, computed } from 'vue';

const user = inject('user');
const logged = computed(() => user?.uuid);
</script>

<template lang="pug">
nav
  img.logo(src="../assets/text_logo.png")
  discord_card.space_right(v-if="logged")
  login_card.space_right
  lang_selector
</template>

<style lang="stylus" scoped>
nav
  width 100%
  height 100px
  display flex
  flex-flow row nowrap
  align-items center
  padding 1em 2em
  color white

  .space_right
    margin-right 1em

  img.logo
    object-fit contain
    width 150px
    filter drop-shadow(1px 2px 3px black)
    margin-right auto
</style>
