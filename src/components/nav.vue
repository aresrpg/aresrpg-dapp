<script setup>
import login_card from './minecraft_login.card.vue';
import discord_card from './discord_login.card.vue';
import gtla_card from './gtla.card.vue';
import lang_selector from '../components/lang_selector.vue';
import { inject, computed } from 'vue';
import useBreakpoints from 'vue-next-breakpoints';

const user = inject('user');
const logged = computed(() => user?.uuid);
const linked = computed(() => user?.discord);
const breakpoints = useBreakpoints({
  mobile: 1000,
});
</script>

<template lang="pug">
nav(:class="{ small: breakpoints.mobile.matches }")
  img.logo(src="../assets/text_logo.png")
  gtla_card.space_right(v-if="linked")
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
  &.small
    .space_right
      display none

  .space_right
    margin-right 1em

  img.logo
    object-fit contain
    width 150px
    filter drop-shadow(1px 2px 3px black)
    margin-right auto
</style>
