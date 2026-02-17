<script setup lang="ts">
import { usePomodoro } from '~/composables/usePomodoro'

const { formattedTime, toggleTimer, resetTimer, isRunning, currentMode, currentFocusTask, setFocusTask, completeAndSaveFlowSession, timeLeft } = usePomodoro()
</script>

<template>
  <div class="flex flex-col items-center justify-center space-y-8">
    <!-- Focus Task Indicator -->
    <div 
      v-if="currentFocusTask"
      class="flex items-center gap-3 px-6 py-2 bg-orange-50/50 backdrop-blur-sm rounded-full text-orange-900/80 animate-fade-in border border-orange-100/50 select-none mb-[-2rem] z-10"
    >
      <span class="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
      <span class="font-medium text-lg max-w-[300px] truncate">{{ currentFocusTask.text }}</span>
      <button 
        @click="setFocusTask(null)" 
        class="ml-2 p-1 text-orange-300 hover:text-orange-500 hover:bg-orange-100 rounded-full transition-colors"
        title="Clear focus"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

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

      <!-- Complete & Save (Flow Mode Only) -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 scale-90"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-90"
      >
        <button 
          v-if="currentMode === 'flow'"
          @click="completeAndSaveFlowSession"
          :disabled="timeLeft === 0"
          class="p-4 rounded-full text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Complete & Save"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </Transition>

      <button 
        @click="resetTimer"
        class="p-4 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-300 group"
        title="Reset Timer"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          class="group-hover:rotate-[-45deg] transition-transform duration-500"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>
  </div>
</template>
