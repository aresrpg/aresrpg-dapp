<template lang="pug">
.container
  span(v-if="!online && !props.allow_offline") {{ t('APP_PLEASE_CONNECT') }}
  slot(v-else)
</template>

<script setup>
import { inject } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps(['allow_offline']);

const online = inject('online');
</script>

<style lang="stylus" scoped>
.content
  a
    color #eee
    text-decoration underline
    &:hover
      color #fff

b.sui-network
  max-width 80%
  text-transform capitalize
  color #eee
.container
  padding 3em
  >span
    display flex
    width 100%
    height 100%
    color #eee
    flex-flow column nowrap
    width 100%
    justify-content center
    align-items center
</style>
