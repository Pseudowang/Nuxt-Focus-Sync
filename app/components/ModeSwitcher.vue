<script setup lang="ts">
import { usePomodoro, type TimerMode } from '~/composables/usePomodoro'

const { currentMode, switchMode } = usePomodoro()

const modes: { id: TimerMode; label: string }[] = [
  { id: 'focus', label: 'Pomodoro' },
  { id: 'short-break', label: 'Short Break' },
  { id: 'long-break', label: 'Long Break' },
  { id: 'flow', label: 'Flow Mode' },
]
</script>

<template>
  <div class="flex items-center justify-center p-3 bg-gray-100/50 backdrop-blur-sm rounded-full w-fit mx-auto border border-gray-200">
    <button
      v-for="mode in modes"
      :key="mode.id"
      @click="switchMode(mode.id)"
      class="px-6 py-2 rounded-full text-sm font-medium transition-all duration-300"
      :class="[
        currentMode === mode.id 
          ? 'bg-white text-primary shadow-sm scale-110 z-10' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
      ]"
    >
      {{ mode.label }}
    </button>
  </div>
</template>
