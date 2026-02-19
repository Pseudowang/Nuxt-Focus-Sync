<script setup lang="ts">
import { usePomodoro } from '~/composables/usePomodoro'

const { formattedTime, toggleTimer, resetTimer, isRunning, currentMode, currentFocusTask, setFocusTask, completeAndSaveFlowSession, timeLeft } = usePomodoro()

const modeTextColor = computed(() => {
  switch (currentMode.value) {
    case 'focus': return 'text-focus'
    case 'short-break': return 'text-short-break'
    case 'long-break': return 'text-long-break'
    case 'flow': return 'text-flow'
    default: return 'text-focus'
  }
})

const modeGlowStyle = computed(() => {
  switch (currentMode.value) {
    case 'focus': return 'drop-shadow(0 0 15px rgba(163, 66, 60, 0.4))'
    case 'short-break': return 'drop-shadow(0 0 15px rgba(67, 104, 80, 0.4))'
    case 'long-break': return 'drop-shadow(0 0 15px rgba(75, 123, 148, 0.4))'
    case 'flow': return 'drop-shadow(0 0 15px rgba(118, 88, 152, 0.4))'
    default: return ''
  }
})

const modeBgColor = computed(() => {
  switch (currentMode.value) {
    case 'focus': return 'bg-focus'
    case 'short-break': return 'bg-short-break'
    case 'long-break': return 'bg-long-break'
    case 'flow': return 'bg-flow'
    default: return 'bg-focus'
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center space-y-12">
    <!-- Focus Task Indicator -->
    <div 
      v-if="currentFocusTask"
      class="flex items-center gap-3 px-6 py-2 bg-white/5 backdrop-blur-md rounded-full text-text-primary animate-fade-in border border-glass-border select-none mb-[-2rem] z-10 transition-all duration-500"
    >
      <span class="w-2 h-2 rounded-full animate-pulse transition-colors duration-500" :class="modeBgColor"></span>
      <span class="text-text-muted text-sm font-medium uppercase tracking-wider">Focusing on:</span>
      <span class="font-bold text-lg max-w-[300px] truncate">{{ currentFocusTask.title }}</span>
      <span 
        v-if="currentFocusTask.tagName"
        class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0"
        :class="currentFocusTask.tagClass"
      >
        {{ currentFocusTask.tagName }}
      </span>
      <button 
        @click="setFocusTask(null)" 
        class="ml-2 p-1 text-text-muted hover:text-text-primary hover:bg-white/10 rounded-full transition-colors"
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
      class="text-[14rem] leading-none font-bold font-mono text-text-primary tabular-nums tracking-tight select-none transition-all duration-1000 flex items-baseline"
      :class="{ 'opacity-40': !isRunning && currentMode !== 'flow' }"
      :style="{ filter: modeGlowStyle }"
    >
      {{ formattedTime() }}
    </div>

    <!-- Controls -->
    <div class="flex items-center space-x-10">
      <button 
        @click="toggleTimer"
        class="px-14 py-4 text-white text-xl font-bold rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all duration-500 flex items-center gap-3"
        :class="modeBgColor"
      >
        <span v-if="!isRunning">{{ currentMode === 'flow' ? 'Start Flow' : 'Focus' }}</span>
        <span v-else>Pause</span>
      </button>

      <!-- Complete & Save (Flow Mode Only) -->
      <Transition
        enter-active-class="transition-all duration-500 ease-out"
        enter-from-class="opacity-0 scale-90 translate-x-4"
        enter-to-class="opacity-100 scale-100 translate-x-0"
        leave-active-class="transition-all duration-300 ease-in"
        leave-from-class="opacity-100 scale-100 translate-x-0"
        leave-to-class="opacity-0 scale-90 translate-x-4"
      >
        <button 
          v-if="currentMode === 'flow'"
          @click="completeAndSaveFlowSession"
          :disabled="timeLeft === 0"
          class="p-4 rounded-2xl bg-white/5 border border-glass-border text-emerald-400 hover:text-emerald-300 hover:bg-white/10 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Complete & Save"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </Transition>

      <button 
        @click="resetTimer"
        class="p-4 rounded-2xl bg-white/5 border border-glass-border text-text-muted hover:text-text-primary hover:bg-white/10 transition-all duration-300 group"
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
          class="group-hover:rotate-[-45deg] transition-transform duration-700"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.font-mono {
  font-family: 'JetBrains Mono', monospace;
}
</style>
