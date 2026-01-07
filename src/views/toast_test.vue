<template lang="pug">
.toast-test
  h1 Toast Test
  .buttons
    button(@click="show_success") Success
    button(@click="show_error") Error
    button(@click="show_info") Info
    button(@click="show_warn") Warning
    button(@click="show_dark") Dark
    button(@click="show_loading") Loading
</template>

<script setup>
import toast from '../toast.js'

function show_success() {
  toast.success('Operation completed successfully!', 'Success')
}

function show_error() {
  toast.error('Something went wrong!', 'Error')
}

function show_info() {
  toast.info('Here is some information', 'Info')
}

function show_warn() {
  toast.warn('Please be careful!', 'Warning')
}

function show_dark() {
  toast.dark('Dark notification', 'Notice')
}

function show_loading() {
  const notification = toast.tx('Please wait...', 'Processing')
  setTimeout(() => {
    notification.update('success', 'Done!', { title: 'Complete' })
  }, 2000)
}
</script>

<style scoped>
.toast-test {
  padding: 50px;
  background: #0a0a0f;
  min-height: 100vh;
}

h1 {
  color: white;
  margin-bottom: 30px;
}

.buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

button {
  padding: 15px 30px;
  background: linear-gradient(135deg, #00d4ff 0%, #00ffd1 100%);
  color: #000;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 16px;
  transition: all 0.2s;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(0, 212, 255, 0.4);
}
</style>
