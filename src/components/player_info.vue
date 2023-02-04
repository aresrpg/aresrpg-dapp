<script setup>
import { inject, computed } from 'vue';

const user = inject('user');
const avatar = computed(
  () =>
    `https://cdn.discordapp.com/avatars/${user.discord.id}/${user.discord.avatar}.png?size=128`
);
</script>

<template lang="pug">
.container
  .banner
  img.avatar(:src="avatar")
  .content
    .rank {{ user.discord.staff ? 'Staff' : 'Player' }} #[img.staff_icon(v-if="user.discord.staff" src="../assets/037-freeze.png")]
    .inner
      .name {{ user.username || 'Sceat' }}
</template>

<style lang="stylus" scoped>
.staff_icon
  width 20px
  object-fit contain
  margin-left .3em
.container
  display flex
  flex-flow column nowrap
  width 300px
  height 500px
  border 1px solid #ECF0F1
  border-radius 12px
  overflow hidden
  position relative
  box-shadow 1px 2px 3px black
  color #ECF0F1
  .banner
    background url('../assets/background_noise.jpeg') center / cover
    width 100%
    height 70px
    border-bottom 1px solid #ECF0F1
  img.avatar
    position absolute
    top 20px
    left 1em
    border-radius 50%
    width 80px
    border 1px solid #ECF0F1
    box-shadow 1px 2px 3px black
  .content
    display flex
    flex-flow column nowrap
    .rank
      display flex
      align-items center
      margin .5em
      margin-left auto
      text-transform capitalize
      box-shadow 1px 2px 3px black
      border-radius 20px
      border 1px solid #ECF0F1
      font-size .8em
      color #ECF0F1
      padding .25em 1em
      font-family 'Itim', cursive
    .inner
      display flex
      flex-flow column nowrap
</style>
