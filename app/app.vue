<script setup lang="ts">
import ModeSwitcher from '~/components/ModeSwitcher.vue'
import TimerDisplay from '~/components/TimerDisplay.vue'
import InfoPanel from '~/components/InfoPanel.vue'

useHead({
  title: 'Warm Focus',
  meta: [
    { name: 'description', content: 'A beautiful, warm Pomodoro timer to keep you focused.' }
  ],
  bodyAttrs: {
    class: 'bg-background text-text font-sans antialiased overflow-hidden'
  }
})
</script>

<template>
  <main class="h-screen w-screen flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-background via-orange-50 to-orange-100">
    <div class="w-full max-w-6xl h-[90vh] bg-white/60 backdrop-blur-xl rounded-[3rem] shadow-2xl flex overflow-hidden border border-white/50 relative">
      
      <!-- Decorative blobs -->
      <div class="absolute -top-20 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply animate-blob"></div>
      <div class="absolute -bottom-20 -right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply animate-blob animation-delay-2000"></div>

      <!-- Left Column: Timer & Controls -->
      <div class="flex-1 flex flex-col items-center justify-center relative z-10 p-12 border-r border-gray-100/50">
        <header class="absolute top-12 w-full flex justify-center">
            <ModeSwitcher />
        </header>
        
        <div class="flex-1 flex flex-col justify-center">
             <TimerDisplay />
        </div>
        
        <footer class="absolute bottom-8 text-center text-gray-400 text-sm font-medium">
          Stay warm, stay focused.
        </footer>
      </div>

      <!-- Right Column: Info Panel -->
      <div class="w-[400px] bg-white/40 p-12 flex flex-col border-l border-white/50 relative z-10 backdrop-blur-md hidden lg:flex">
        <InfoPanel />
      </div>

    </div>
  </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700&display=swap');

body {
  font-family: 'Outfit', sans-serif;
}

@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}
</style>
