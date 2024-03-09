<template lang="pug">
.oauth
</template>

<script setup>
import { onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import fetch_api from '../request.js';

const route = useRoute();
const router = useRouter();
const loading = inject('loading');

onMounted(() => {
  const { query: { code } = {} } = route;
  loading.value++;
  fetch_api('mutation($code: String!) { discord { link(code: $code) } }', {
    code,
  }).then(() => {
    router.push('/');
    loading.value--;
  });
});
</script>
