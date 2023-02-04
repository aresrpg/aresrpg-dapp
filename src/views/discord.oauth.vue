<template lang="pug">
oauth
</template>

<script setup>
import { onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import oauth from '../components/oauth.vue';
import { useToast } from 'vue-toastification';

import fetch_api from '../fetch_api.js';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const resync = inject('resync');

onMounted(() => {
  const { query: { code } = {} } = route;
  fetch_api(`/discord/link`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
    .then(() => {
      resync.value++;
    })
    .catch(error => {
      if (error === 'USER_NOT_FOUND') {
        toast.error('User not found, please login again');
      } else if (error === 'ALREADY_LINKED') {
        toast.error('This discord account is already linked');
      } else console.error(error);
    })
    .finally(() => router.push('/'));
});
</script>
