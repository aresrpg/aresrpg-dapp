<i18n>
  fr:
    quest: Quêtes terminées
    rank: Rang
    items: Objets obtenus
    crew3: Lier Crew3
    hour: (peut mettre jusqu'à 1h pour se synchroniser)
  en:
    quest: Quests completed
    rank: Rank
    items: Items owned
    crew3: Connect to Crew3
    hour: (can take up to 1h to sync)
</i18n>

<script setup>
import { inject, computed } from 'vue';
import { useI18n } from 'vue-i18n';

import card from './card.vue';
const { t } = useI18n();

const user = inject('user');
const avatar = computed(
  () =>
    `https://cdn.discordapp.com/avatars/${user.discord.id}/${user.discord.avatar}.png?size=128`,
);

const open_crew3 = () => {
  window.open('https://aresrpg.crew3.xyz', '_blank');
};

const items_owned = computed(() => {
  return user?.inventory?.reduce((total, { amount }) => total + amount, 0);
});
</script>

<template lang="pug">
.container
  .banner
  .mastery {{ user?.mastery ?? 1 }}
  img.avatar(:src="avatar")
  .content
    .rank {{ user.discord.staff ? 'Staff' : 'Player' }} #[img.staff_icon(v-if="user.discord.staff" src="../assets/037-freeze.png")]
    .inner
      .name {{ user.discord.username || 'Sceat' }}
      .infos(v-if="user.crew3?.id")
        div
          .name {{ t('quest') }}
          .num {{  user.crew3.completed_quests }}
        div
          .name {{ t('rank') }}
          .num {{ user.crew3.rank }}
        div
          .name {{ t('items') }}
          .num {{ items_owned }}
      .card(v-else)
        card(
          :clickable="true"
          @click="open_crew3"
          background="#E74C3C"
        )
          template(#content)
            img.logo(src="../assets/crew3.svg")
            .name {{ t('crew3') }}
        span {{ t('hour') }}
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

  .mastery
    position absolute
    top 0
    right 10px
    font-size 3em
    opacity .5
    font-weight 900

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
    height 100%
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
      padding 1em
      padding-top 0
      height 100%
      margin-top .5em
      .card
        display flex
        justify-content center
        align-items center
        flex-flow column nowrap
        height 100%
        >span
          font-size .7em
          margin-top .5em
          font-style italic
        .name
          margin-right .5em
          font-weight 100
        img.logo
          margin .5em
          width 32px
          border-radius 50px
          border 1px solid #ECF0F1
      >.name
        font-weight 600
        align-self flex-start
        justify-self start
      .infos
        display flex
        flex-flow column nowrap
        padding 1em
        font-size .8em
        width 100%
        >div
          display grid
          grid-template-columns 150px 1fr
          border-bottom 1px solid #eee
          padding .5em
          .name
            font-weight 100
          .num
            color #2ECC71
            font-weight 900
            font-family 'Itim', cursive
</style>
