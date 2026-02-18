<script setup lang="ts">
import ModeSwitcher from '~/components/ModeSwitcher.vue'
import TimerDisplay from '~/components/TimerDisplay.vue'
import InfoPanel from '~/components/InfoPanel.vue'
import { usePomodoro } from '~/composables/usePomodoro'

const { currentMode } = usePomodoro()

useHead({
  title: 'videPomo',
  meta: [
    { name: 'description', content: 'A beautiful, minimalist Glassmorphism Pomodoro timer.' }
  ],
  bodyAttrs: {
    class: 'bg-background text-text-primary font-sans antialiased overflow-hidden'
  }
})

const modeGlowClass = computed(() => {
  switch (currentMode.value) {
    case 'focus': return 'shadow-[0_0_100px_rgba(163,66,60,0.15)]'
    case 'short-break': return 'shadow-[0_0_100px_rgba(67,104,80,0.15)]'
    case 'long-break': return 'shadow-[0_0_100px_rgba(75,123,148,0.15)]'
    case 'flow': return 'shadow-[0_0_100px_rgba(118,88,152,0.15)]'
    default: return ''
  }
})

const modeBlobColor = computed(() => {
  switch (currentMode.value) {
    case 'focus': return 'bg-focus/20'
    case 'short-break': return 'bg-short-break/20'
    case 'long-break': return 'bg-long-break/20'
    case 'flow': return 'bg-flow/20'
    default: return 'bg-focus/20'
  }
})
</script>

<template>
  <main class="h-screen w-screen flex items-center justify-center p-4 sm:p-8 bg-background relative overflow-hidden transition-colors duration-1000">
    <!-- Dynamic Breathing Background Blobs -->
    <div 
      class="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none mix-blend-screen animate-pulse-slow transition-colors duration-1000"
      :class="modeBlobColor"
    ></div>
    <div 
      class="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none mix-blend-screen animate-pulse-slow animation-delay-2000 transition-colors duration-1000"
      :class="modeBlobColor"
    ></div>

    <div 
      class="w-full max-w-6xl h-[90vh] bg-glass backdrop-blur-xl rounded-[2.5rem] flex overflow-hidden border border-glass-border relative z-10 transition-all duration-700"
      :class="modeGlowClass"
    >
      
      <!-- Left Column: Timer & Controls -->
      <div class="flex-1 flex flex-col items-center justify-center relative z-10 p-12 border-r border-glass-border">
        <header class="absolute top-12 w-full flex justify-center">
            <ModeSwitcher />
        </header>
        
        <div class="flex-1 flex flex-col justify-center">
             <TimerDisplay />
        </div>
        
        <footer class="absolute bottom-8 text-center text-text-muted text-xs font-medium tracking-widest uppercase opacity-50">
          Stay focused, enter flow.
        </footer>
      </div>

      <!-- Right Column: Info Panel -->
      <div class="w-[400px] bg-black/10 p-12 flex flex-col border-l border-glass-border relative z-10 backdrop-blur-md hidden lg:flex">
        <InfoPanel />
      </div>

    </div>
  </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

body {
  font-family: 'Inter', sans-serif;
}

@keyframes pulse-slow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

.animate-pulse-slow {
  animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}
</style>
