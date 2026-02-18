<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { usePomodoro } from "~/composables/usePomodoro";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const { currentFocusTask, setFocusTask, currentMode } = usePomodoro();
const todos = ref<Todo[]>([]);
const newTodoText = ref("");

onMounted(() => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("pomodoro-todos");
    if (saved) {
      try {
        todos.value = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
  }
});

watch(
  todos,
  (newTodos) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pomodoro-todos", JSON.stringify(newTodos));
    }
  },
  { deep: true },
);

const addTodo = () => {
  if (!newTodoText.value.trim()) return;
  todos.value.push({
    id: Date.now(),
    text: newTodoText.value.trim(),
    completed: false,
  });
  newTodoText.value = "";
};

const removeTodo = (id: number) => {
  todos.value = todos.value.filter((t) => t.id !== id);
};

const modeBgColor = computed(() => {
  switch (currentMode.value) {
    case "focus":
      return "bg-focus";
    case "short-break":
      return "bg-short-break";
    case "long-break":
      return "bg-long-break";
    case "flow":
      return "bg-flow";
    default:
      return "bg-focus";
  }
});

const modeTextColor = computed(() => {
  switch (currentMode.value) {
    case "focus":
      return "text-focus";
    case "short-break":
      return "text-short-break";
    case "long-break":
      return "text-long-break";
    case "flow":
      return "text-flow";
    default:
      return "text-focus";
  }
});
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 space-y-6">
    <h3
      class="text-xs font-bold text-text-muted uppercase tracking-[0.2em] opacity-60"
    >
      Tasks
    </h3>

    <!-- Add Task -->
    <div class="flex gap-3">
      <input
        v-model="newTodoText"
        @keyup.enter="addTodo"
        type="text"
        placeholder="What's next?"
        class="flex-1 px-5 py-3 bg-white/5 border border-glass-border rounded-xl text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
      />
      <button
        @click="addTodo"
        class="p-3 rounded-xl text-white shadow-lg transition-all active:scale-95"
        :class="modeBgColor"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>

    <!-- List -->
    <ul class="flex-1 space-y-3 overflow-y-auto pr-4 custom-scrollbar min-h-0">
      <li
        v-for="todo in todos"
        :key="todo.id"
        class="flex items-center justify-between py-2 px-2.5 bg-white/5 rounded-2xl border border-glass-border group hover:bg-white/[0.08] transition-all duration-300"
      >
        <div class="flex items-center gap-4 flex-1 min-w-0">
          <button
            @click="todo.completed = !todo.completed"
            class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0"
            :class="
              todo.completed
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-white/10 hover:border-white/30'
            "
          >
            <svg
              v-if="todo.completed"
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-white"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <span
            :class="{
              'line-through text-text-muted opacity-40': todo.completed,
              'text-text-primary': !todo.completed,
            }"
            class="truncate font-medium transition-all"
          >
            {{ todo.text }}
          </span>
        </div>

        <div
          class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <!-- Focus Button -->
          <button
            v-if="!todo.completed"
            @click="setFocusTask(todo)"
            class="p-2 rounded-lg transition-all"
            :class="
              currentFocusTask?.id === todo.id
                ? [modeTextColor, 'bg-white/10']
                : 'text-text-muted hover:text-text-primary hover:bg-white/10'
            "
            title="Set as current focus"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>

          <!-- Delete Button -->
          <button
            @click="removeTodo(todo.id)"
            class="p-2 text-text-muted hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="3 6 5 6 21 6"></polyline>
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              ></path>
            </svg>
          </button>
        </div>
      </li>
    </ul>

    <div
      v-if="todos.length === 0"
      class="text-center text-text-muted/40 text-sm py-8 font-medium"
    >
      No tasks for today. Stay focused!
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 20px;
}
</style>
