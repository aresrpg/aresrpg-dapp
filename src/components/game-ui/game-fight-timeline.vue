<template lang="pug">
    transition(name="slide-fade")
      .nextTurn(v-if="fight_state.state === 'FIGHT' && fight_state.nextStepTime - time > 3000")
        img(:src="current_player?.avatar" alt="avatar")
        div {{ current_player?.name }}
    
    .timeline
      .action
        vs-button.accept(v-if="fight_state.state === 'NOTHING'" icon color="#ff6100" @click="start_fight")
          div Start fight
        vs-button.accept(v-if="fight_state.state === 'PREPARE'" icon color="#ff6100" @click="ready_fight")
          div Ready {{ Math.round((fight_state.nextStepTime - time)/1000) }}s
        vs-button.accept(v-if="fight_state.state === 'FIGHT'" icon color="#ff6100" @click="next_turn" :disabled="!myself.isCurrent")
          div Next turn
          //- && myself.isCurrent
          //-{{ Math.round((fight_state.nextStepTime - time)/1000) }}s
      .player(
        v-if="in_fight"
        v-for="player in timeline_fight" 
        :key="player.id" 
        :class="{ current: player.isCurrent}"
        @mouseenter="() => fight_character_overview = { ...player }"
        @mouseleave="() => fight_character_overview = null"
      )
        .time(v-if="player.isCurrent") {{ Math.round((fight_state.nextStepTime - time)/1000) }}s
        img.avatar(:src="player.avatar" alt="avatar")
        .base
          .health(:style="{ height: (player.max_health/player.health*100) + '%' }" :class="{ blue: player.second_team }")
    
    </template>

<script setup>
import { ref, inject, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  context,
  current_three_character,
  current_sui_character,
} from '../../core/game/game.js';

const { t } = useI18n();

const three_character = current_three_character();

const timeline = ref([])

const myself = computed(() => timeline.value.find(player => player.myself))

const current_player = computed(() => timeline.value.find(player => player.isCurrent))


const fight = inject('fight_state')
const time = ref(Date.now())
const fight_state = ref({ state: 'NOTHING' })
const in_fight = inject('in_fight');
const fight_character_overview = inject('fight_character_overview');


const get_temporary_avatar = (entity) => {
  switch (entity.skin) {
    case 'bouftou': return 'https://i.imgur.com/g4rJ7K6.png'
    case 'oeuftermath': return 'https://i.imgur.com/KyCJDhj.png'
  }
  return 'https://assets.aresrpg.world/classe/senshi_male.jpg'
}

const timeline_fight = computed(() => {
  if (!fight.value) return []
  const timeline_build = fight.value.team1?.map((p) => ({ ...p, second_team: false }))?.concat(fight.value.team2?.map((p) => ({ ...p, second_team: true })))

  const timeline_transform = timeline_build.map((player, index) => {
    return {
      ...player,
      isCurrent: index == 0,
      avatar: get_temporary_avatar(player),
      name: player.name
    }
  })
  return timeline_transform || []
})

const start_fight = () => {
  fight_state.value = { state: 'FIGHT', nextStepTime: Date.now() + 5000 }
}
const ready_fight = () => {
  // in_fight.value = !in_fight
  // fight_state.value = {state: 'PREPARE', nextStepTime: Date.now() + 5000}
}

const next_turn = () => {
  fight_state.value = { state: 'FIGHT', nextStepTime: Date.now() + 5000 }

  const currentPlayerIndex = timeline.value.findIndex(player => player.isCurrent);
  timeline.value[currentPlayerIndex].isCurrent = false;
  timeline.value[(currentPlayerIndex + 1) % timeline.value.length].isCurrent = true;
}

setInterval(async () => {
  return;
  if (fight_state.value.state == 'PREPARE') {
    in_fight.value = true
    if (fight_state.value.nextStepTime < Date.now()) {
      fight_state.value = { state: 'FIGHT', nextStepTime: Date.now() + 5000 }
      timeline.value[0].isCurrent = true;
    }
    return;
  }
  if (fight_state.value.state == 'FIGHT') {

    if (fight_state.value.nextStepTime < Date.now()) {
      next_turn()
    }
  }
}, 100);

setInterval(() => {
  time.value = Date.now()
}, 10)


</script>

<style lang="stylus" scoped>

    .slide-fade-enter-active,
    .slide-fade-leave-active
      transition transform 0.5s ease-in-out, opacity 0.5s ease
    
    .slide-fade-enter-from
      // left -150px
      transform translateX(-100%)
      opacity 0
    
    .slide-fade-enter-to
      transform translateX(0)
      opacity 1
    
    .slide-fade-leave-to
      transform translateX(-100%) 
      opacity 0
    
    .action
      display flex
      gap 10px
      .accept:disabled
        background-color #514a3ccc
    .nextTurn
      position absolute
      top -50px
      left 20px
      img
        height 150px
        border-radius 6px
    .timeline
      position absolute
      display flex
      align-items flex-end
      gap 10px
      bottom -20px
      right 90px
      .player.current
        height 65px
        border solid 2px #ff6100
        border-top-right-radius 0px
        border-bottom-right-radius 0px
        // width 40px
        .avatar
          width 50px
    
      .player.current::after
        // border solid 3px #ff6100
        color #ff6100
        // padding 2px
        content '▼'
        position absolute
        top -25px
        left 20px
    
    
      .player
        position relative
        display flex
        align-items flex-end
        // background-color gray
        border solid 1px #514a3ccc
        height 50px
        border-radius 6px
        // overflow hidden
        // width 35px
        .time
          position absolute
          top -42px
          left -3px
          text-align center
          width 60px
        .base
          background-color gray
          display flex
          align-items flex-end
          height 100%
          width 5px
          .health.blue
            background-color blue
          .health
            background-color red
            width 5px
        .avatar
          border-top-left-radius 5px
          border-bottom-left-radius 5px
          height 100%
          width 40px
          object-fit cover
    </style>