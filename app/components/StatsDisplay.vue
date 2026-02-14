<script setup lang="ts">
import { usePomodoro } from '~/composables/usePomodoro'
import { computed } from 'vue'

const { stats } = usePomodoro()

const formattedFocusTime = computed(() => {
  const minutes = Math.floor(stats.value.todayFocusTime / 60)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`
  }
  return `${minutes}m`
})
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <!-- Daily Focus -->
    <div class="bg-primary/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
      <div class="text-primary font-bold text-3xl">{{ formattedFocusTime }}</div>
      <div class="text-gray-500 text-xs uppercase tracking-wider mt-1 font-semibold">Today's Focus</div>
    </div>

    <!-- Streak -->
    <div class="bg-orange-100/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
      <div class="text-orange-600 font-bold text-3xl flex items-center gap-1">
        {{ stats.streak }}
        <span class="text-xl">🔥</span>
      </div>
      <div class="text-gray-500 text-xs uppercase tracking-wider mt-1 font-semibold">Day Streak</div>
    </div>
  </div>
</template>
