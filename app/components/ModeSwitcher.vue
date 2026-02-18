<script setup lang="ts">
import { usePomodoro, type TimerMode } from "~/composables/usePomodoro";

const { currentMode, switchMode } = usePomodoro();

const modes: { id: TimerMode; label: string }[] = [
  { id: "focus", label: "Focus" },
  { id: "short-break", label: "Short Break" },
  { id: "long-break", label: "Long Break" },
  { id: "flow", label: "Flow" },
];

const modeActiveColor = computed(() => {
  switch (currentMode.value) {
    case "focus":
      return "bg-focus text-white shadow-focus/30";
    case "short-break":
      return "bg-short-break text-white shadow-short-break/30";
    case "long-break":
      return "bg-long-break text-white shadow-long-break/30";
    case "flow":
      return "bg-flow text-white shadow-flow/30";
    default:
      return "bg-white text-background";
  }
});
</script>

<template>
  <div
    class="flex items-center justify-center p-1.5 bg-white/5 backdrop-blur-md rounded-2xl w-fit mx-auto border border-glass-border"
  >
    <button
      v-for="mode in modes"
      :key="mode.id"
      @click="switchMode(mode.id)"
      class="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-500 relative"
      :class="[
        currentMode === mode.id
          ? [modeActiveColor, 'shadow-lg scale-105 z-10']
          : 'text-text-muted hover:text-text-primary hover:bg-white/5',
      ]"
    >
      {{ mode.label }}
    </button>
  </div>
</template>
