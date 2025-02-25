<template lang="pug">
    .slot-container(:class="{ in_fight }")
      img(:src="fight_character_overview.avatar" alt="stats")
      div 
        .name {{ fight_character_overview.name }}
        .stats 
          div {{ fight_character_overview.health }}
          img(src="../../assets/statistics/health.png")
        //- div {{ fight_character_overview }}
    </template>
    
    <script setup>
    import { inject } from 'vue';
    
    import stats from '../../assets/ui/stats.png';
    
    const in_fight = inject('in_fight');
    const fight_character_overview = inject('fight_character_overview');
  
    </script>
    
    <style lang="stylus" scoped>
    .slot-container
      display flex
      gap 10px
      height 150px
      border-radius 12px
      margin-left 0
      overflow hidden
      margin-top auto
      border 1px solid black
      background rgba(#212121, .6)
      place-self start
      max-width 700px
      width 100%
      min-width 300px
      grid-gap 5px
      padding .25em
      opacity .3
      &.in_fight
        opacity 1
      > img
        max-width 160px
        max-height 160px
        min-height 150px
        z-index 0
        margin-top -5px
        margin-left -10px
      > div
        width 100%
      div
        color white
        .name
          font-size 1.2em
          font-weight bold
        .stats 
          display flex
          align-items center
          gap 10px
          img 
            height 16px
    </style>
    