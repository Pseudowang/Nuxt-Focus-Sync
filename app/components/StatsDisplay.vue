<script setup lang="ts">
import { usePomodoro } from "~/composables/usePomodoro";
import { computed } from "vue";

const { stats, currentMode } = usePomodoro();

const formattedFocusTime = computed(() => {
  const minutes = Math.floor(stats.value.todayFocusTime / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
});

// const modeTextColor = computed(() => {
//   switch (currentMode.value) {
//     case "focus":
//       return "text-focus";
//     case "short-break":
//       return "text-short-break";
//     case "long-break":
//       return "text-long-break";
//     case "flow":
//       return "text-flow";
//     default:
//       return "text-focus";
//   }
// });
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <!-- Daily Focus -->
    <div
      class="bg-white/5 p-5 rounded-2xl border border-glass-border flex flex-col items-center justify-center text-center group hover:bg-white/[0.08] transition-all duration-300"
    >
      <div
        class="font-bold text-2xl text-text-primary group-hover:scale-110 transition-transform duration-500"
      >
        {{ formattedFocusTime }}
      </div>
      <div
        class="text-text-muted text-[10px] uppercase tracking-[0.15em] mt-2 font-bold opacity-50"
      >
        Focus Time
      </div>
    </div>

    <!-- Streak -->
    <div
      class="bg-white/5 p-5 rounded-2xl border border-glass-border flex flex-col items-center justify-center text-center group hover:bg-white/[0.08] transition-all duration-300"
    >
      <div
        class="text-text-primary font-bold text-2xl flex items-center gap-2 group-hover:scale-110 transition-transform duration-500"
      >
        {{ stats.streak }}
        <span class="text-xl filter drop-shadow-[0_0_8px_rgba(255,165,0,0.5)]"
          >🔥</span
        >
      </div>
      <div
        class="text-text-muted text-[10px] uppercase tracking-[0.15em] mt-2 font-bold opacity-50"
      >
        Day Streak
      </div>
    </div>
  </div>
</template>
