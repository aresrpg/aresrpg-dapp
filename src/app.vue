<template lang="pug">
router-view
</template>

<script setup>
import { provide, reactive, watch, ref } from 'vue';
import fetch_api from './fetch_api.js';
import { useToast } from 'vue-toastification';

const name = 'app';
const user = reactive({});
const loading = ref(false);
const server_info = reactive({});
const resync = ref(0);
const toast = useToast();

watch(resync, () => {
  loading.value = true;
  fetch_api(`/me`)
    .then(me => {
      if (me?.uuid) Object.assign(user, me);
    })
    .finally(() => (loading.value = false));
  fetch_api('/server-info').then(info => Object.assign(server_info, info));
});

provide('user', user);
provide('resync', resync);
provide('server-info', server_info);
provide('loading', loading);
</script>

<style lang="stylus">
sc-reset()
    margin 0
    padding 0
    box-sizing border-box

sc-disableScollBar()
    ::-webkit-scrollbar
        display: none;

:root
  font-size 18px
  background #212121

*
  sc-reset()
  sc-disableScollBar()
  font-family 'Rubik', sans-serif
  outline none
  scroll-behavior smooth
  &::-webkit-scrollbar-track
    box-shadow inset 0 0 6px rgba(0, 0, 0, .3)
    background-color #555
  &::-webkit-scrollbar
    width 12px
    background-color #F5F5F5
  &::-webkit-scrollbar-thumb
    box-shadow inset 0 0 6px rgba(0, 0, 0, .3)
    background-color #252525
  a
    :active
      color #e1c79b
      fill #e1c79b
</style>
