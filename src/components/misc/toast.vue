<template lang="pug">
div.notification-loader
  .spin
    LoadingSpinner(:status="status")
  .left
    .title {{ title }}
    .text {{ text }}
</template>

<script setup>
import { defineProps } from 'vue';

import LoadingSpinner from './control-spinner.vue';

const props = defineProps(['status', 'text', 'title']);
</script>

<style lang="stylus" scoped>
.notification-loader
  display flex
  flex-flow row nowrap
  .spin
    width 50px
    height @width
</style>
