<template lang="pug">
transition(name="fade" mode="out-in")
  div(:class="status_class" class="status_icon")
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps(['status'])

const status_class = computed(() => {
  return {
    'loading_icon--loading': props.status === 'loading',
    'loading_icon--success': props.status === 'success',
    'loading_icon--error': props.status === 'error',
  }
})
</script>

<style lang="stylus" scoped>
size = 20px

.fade-enter-active, .fade-leave-active
  transition opacity 0.5s ease-in-out

.fade-enter-from, .fade-leave-to
  opacity 0

.status_icon
  display: inline-block
  width size
  height size
  text-align: center
  position: relative
  border-radius: 50%
  &.loading_icon--loading
    &:before
      content: ''
      position: absolute
      top: 50%
      left: 50%
      display: inline-block
      height size
      width size
      border: 3px solid rgba(255, 255, 255, .33)
      border-top-color: #fff
      border-radius: 50%
      animation:
        loading_icon--fade_in .33s ease,
        loading_icon--rotation .66s linear 0s infinite
  &.loading_icon--success
    background: #8bc34a
    &:after
      content: ''
      position: absolute
      top: 50%
      left: 50%
      display: inline-block
      height: 40%
      width: 35%
      border: 3px solid #fff
      border-top-width: 0
      border-right-width: 0
      transform: translate(-50%, -75%) rotate(-45deg)
      animation: loading_icon--fade_in .6s ease
  &.loading_icon--error
    background: #ff5722
    &:after
      content: ''
      position: absolute
      top: 50%
      left: 50%
      display: inline-block
      height: 40%
      width: 40%
      background:
        linear-gradient(to bottom, transparent 44%, #fff 44%, #fff 56%, transparent 56%),
        linear-gradient(to right, transparent 44%, #fff 44%, #fff 56%, transparent 56%)
      transform: translate(-50%, -50%) rotate(-45deg)
      animation: loading_icon--fade_in .6s ease

@keyframes loading_icon--fade_in
  0% { opacity: 0; }
  100% { opacity: 1; }

@keyframes loading_icon--rotation
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
</style>
