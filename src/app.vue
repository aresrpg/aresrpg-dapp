<template lang="pug">
router-view
</template>

<script setup>
import { provide, reactive, watch, ref } from 'vue';
import { VsLoadingFn } from 'vuesax-alpha';

import fetch_api from './request.js';

const name = 'app';
const user = reactive({});
const loading = ref(false);
const server_info = reactive({});
const resync = ref(0);

let loading_instance = null;

watch(loading, value => {
  if (value === 1) {
    loading_instance = VsLoadingFn({
      type: 'square',
      color: '#F1C40F',
      background: '#212121',
    });
  } else if (!value) loading_instance.close();
});

watch(resync, () => {
  loading.value++;
  fetch_api(`
  { me
    {
      uuid
      mastery
      auth {
        discord { id username avatar staff }
        minecraft { uuid username }
        gtla { pseudo }
        zealy { level rank completed_quests }
      }
      app { inventory { name amount issuer } }
    }
  }`)
    .then(data => {
      if (data) {
        Object.assign(user, data.me);
      }
    })
    .finally(() => loading.value--);

  fetch_api('{ server { registrations online } }').then(({ server }) =>
    Object.assign(server_info, server),
  );
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

.vs-sidebar-item__icon
  background none

.vs-switch__text.is-on
  align-items normal

.btn
  font-size .9em
  i
    margin-right .5em

:root
  font-size 18px
  background #212121

[class^=vs]
  font-family 'Rubik', sans-serif !important

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
