<script setup lang="ts">
import { usePomodoro } from '~/composables/usePomodoro'

const { formattedTime, toggleTimer, resetTimer, isRunning, currentMode } = usePomodoro()
</script>

<template>
  <div class="flex flex-col items-center justify-center space-y-8">
    <!-- Timer Text -->
    <div 
      class="text-[12rem] leading-none font-bold text-primary tabular-nums tracking-tighter select-none transition-colors duration-500"
      :class="{ 'opacity-50': !isRunning && currentMode !== 'flow' }"
    >
      {{ formattedTime() }}
    </div>

    <!-- Controls -->
    <div class="flex items-center space-x-6">
      <button 
        @click="toggleTimer"
        class="px-12 py-4 bg-primary text-white text-xl font-bold rounded-full shadow-lg hover:shadow-xl hover:bg-opacity-90 active:scale-95 transition-all duration-300 flex items-center gap-2"
      >
        <span v-if="!isRunning">Start Focus</span>
        <span v-else>Pause</span>
      </button>

      <button 
        @click="resetTimer"
        class="p-4 rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
        title="Reset Timer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
          <path d="M3 3v9h9" />
        </svg>
      </button>
    </div>
  </div>
</template>
