<script setup lang="ts">
import TodoList from './TodoList.vue'
import StatsDisplay from './StatsDisplay.vue'
</script>

<template>
  <div class="h-full flex flex-col gap-6">
    <!-- Stats Section -->
    <section>
      <h2 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Your Progress</h2>
      <StatsDisplay />
    </section>

    <hr class="border-gray-100" />

    <!-- Todo Section -->
    <section class="flex-1 overflow-hidden flex flex-col">
      <TodoList />
    </section>
  </div>
</template>
