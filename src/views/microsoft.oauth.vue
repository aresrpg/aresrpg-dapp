<template lang="pug">
oauth
</template>

<script setup>
import { onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import oauth from '../components/loading.vue';

import fetch_api from '../fetch_api.js';

const route = useRoute();
const router = useRouter();
const resync = inject('resync');

onMounted(() => {
  const { query: { code } = {} } = route;
  fetch_api(`/login`, {
    method: 'POST',
    body: { code },
  }).then(() => {
    router.push('/');
    resync.value++;
  });
});
</script>
