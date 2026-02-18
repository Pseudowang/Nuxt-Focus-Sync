<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { usePomodoro } from "~/composables/usePomodoro";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  tag?: string;
  tagColor?: string;
}

const TAG_OPTIONS = [
  { name: "Coding", color: "text-blue-400", bg: "bg-blue-400/10" },
  { name: "Reading", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { name: "Design", color: "text-purple-400", bg: "bg-purple-400/10" },
  { name: "Meeting", color: "text-amber-400", bg: "bg-amber-400/10" },
  { name: "General", color: "text-slate-400", bg: "bg-slate-400/10" },
];

const { currentFocusTask, setFocusTask, currentMode } = usePomodoro();
const todos = ref<Todo[]>([]);
const newTodoText = ref("");
const showTagMenu = ref(false);
const filteredTags = ref(TAG_OPTIONS);
const editingId = ref<number | null>(null);
const editingText = ref("");
const containerRef = ref<HTMLElement | null>(null);

const activeTodos = computed(() => todos.value.filter((t) => !t.completed));
const completedTodos = computed(() => todos.value.filter((t) => t.completed));

const handleClickOutside = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    showTagMenu.value = false;
  }
};

onMounted(() => {
  window.addEventListener("click", handleClickOutside);
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

onUnmounted(() => {
  window.removeEventListener("click", handleClickOutside);
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

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const lastChar = target.value.slice(-1);
  if (lastChar === "#") {
    showTagMenu.value = true;
    filteredTags.value = TAG_OPTIONS;
  } else if (showTagMenu.value) {
    const parts = target.value.split("#");
    const tagQuery = parts[parts.length - 1].toLowerCase();
    if (tagQuery.includes(" ")) {
      showTagMenu.value = false;
    } else {
      filteredTags.value = TAG_OPTIONS.filter((tag) =>
        tag.name.toLowerCase().includes(tagQuery),
      );
    }
  }
};

const selectTag = (tag: (typeof TAG_OPTIONS)[0]) => {
  const parts = newTodoText.value.split("#");
  parts.pop();
  newTodoText.value = parts.join("#") + "#" + tag.name + " ";
  showTagMenu.value = false;
};

const addTodo = () => {
  if (!newTodoText.value.trim()) return;

  let text = newTodoText.value.trim();
  let tag = "General";
  let tagColor = "text-slate-400 bg-slate-400/10";

  const tagMatch = text.match(/#(\w+)/);
  if (tagMatch) {
    tag = tagMatch[1];
    text = text.replace(/#\w+/, "").trim();
    const existingTag = TAG_OPTIONS.find(
      (t) => t.name.toLowerCase() === tag.toLowerCase(),
    );
    if (existingTag) {
      tagColor = `${existingTag.color} ${existingTag.bg}`;
    } else {
      const colors = [
        { color: "text-blue-400", bg: "bg-blue-400/10" },
        { color: "text-emerald-400", bg: "bg-emerald-400/10" },
        { color: "text-purple-400", bg: "bg-purple-400/10" },
        { color: "text-amber-400", bg: "bg-amber-400/10" },
        { color: "text-rose-400", bg: "bg-rose-400/10" },
        { color: "text-indigo-400", bg: "bg-indigo-400/10" },
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      tagColor = `${randomColor.color} ${randomColor.bg}`;
    }
  }

  todos.value.push({
    id: Date.now(),
    text: text || "Untitled Task",
    completed: false,
    tag,
    tagColor,
  });
  newTodoText.value = "";
  showTagMenu.value = false;
};

const removeTodo = (id: number) => {
  todos.value = todos.value.filter((t) => t.id !== id);
  if (currentFocusTask.value?.id === id) {
    setFocusTask(null);
  }
};

const toggleComplete = (todo: Todo) => {
  todo.completed = !todo.completed;
  if (todo.completed && currentFocusTask.value?.id === todo.id) {
    setFocusTask(null);
  }
};

const startEditing = (todo: Todo) => {
  editingId.value = todo.id;
  editingText.value = todo.tag ? `${todo.text} #${todo.tag}` : todo.text;
};

const saveEdit = () => {
  if (editingId.value === null) return;
  const todo = todos.value.find((t) => t.id === editingId.value);
  if (todo) {
    let text = editingText.value.trim();
    let tag = todo.tag || "General";
    let tagColor = todo.tagColor || "text-slate-400 bg-slate-400/10";

    const tagMatch = text.match(/#(\w+)/);
    if (tagMatch) {
      tag = tagMatch[1];
      text = text.replace(/#\w+/, "").trim();
      const existingTag = TAG_OPTIONS.find(
        (t) => t.name.toLowerCase() === tag.toLowerCase(),
      );
      if (existingTag) {
        tagColor = `${existingTag.color} ${existingTag.bg}`;
      } else if (tag !== todo.tag) {
        const colors = [
          { color: "text-blue-400", bg: "bg-blue-400/10" },
          { color: "text-emerald-400", bg: "bg-emerald-400/10" },
          { color: "text-purple-400", bg: "bg-purple-400/10" },
          { color: "text-amber-400", bg: "bg-amber-400/10" },
          { color: "text-rose-400", bg: "bg-rose-400/10" },
          { color: "text-indigo-400", bg: "bg-indigo-400/10" },
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        tagColor = `${randomColor.color} ${randomColor.bg}`;
      }
    }

    todo.text = text || "Untitled Task";
    todo.tag = tag;
    todo.tagColor = tagColor;

    if (currentFocusTask.value?.id === todo.id) {
      setFocusTask({ ...todo });
    }
  }
  editingId.value = null;
};

// Custom directive for focusing input
const vFocus = {
  mounted: (el: HTMLInputElement) => el.focus(),
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
    <div class="relative" ref="containerRef">
      <div class="flex gap-3">
        <input
          v-model="newTodoText"
          @input="handleInput"
          @keyup.enter="addTodo"
          type="text"
          placeholder="What's next? (Use # for tags)"
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

      <!-- Tag Floating Menu -->
      <div
        v-if="showTagMenu && filteredTags.length > 0"
        class="absolute left-0 right-0 top-full mt-2 bg-[#25282C] border border-glass-border rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
      >
        <div
          v-for="tag in filteredTags"
          :key="tag.name"
          @click="selectTag(tag)"
          class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0"
        >
          <span
            class="w-2 h-2 rounded-full"
            :class="tag.color.replace('text-', 'bg-')"
          ></span>
          <span class="text-text-primary font-medium">{{ tag.name }}</span>
        </div>
      </div>
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto pr-4 custom-scrollbar min-h-0 space-y-8">
      <!-- Active Tasks -->
      <TransitionGroup
        name="list"
        tag="ul"
        class="space-y-3"
      >
        <li
          v-for="todo in activeTodos"
          :key="todo.id"
          class="flex items-center justify-between py-3 px-3.5 bg-white/5 rounded-2xl border border-glass-border group hover:bg-white/[0.08] transition-all duration-300"
          :class="{ 'ring-1 ring-white/20': currentFocusTask?.id === todo.id }"
        >
          <div class="flex items-center gap-4 flex-1 min-w-0">
            <button
              @click="toggleComplete(todo)"
              class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0"
              :class="'border-white/10 hover:border-white/30'"
            >
              <div class="w-2 h-2 rounded-full opacity-0 group-hover:opacity-40 bg-emerald-500 transition-opacity"></div>
            </button>
            
            <div class="flex flex-col flex-1 min-w-0">
              <div v-if="editingId === todo.id" class="flex gap-2">
                <input
                  v-model="editingText"
                  @keyup.enter="saveEdit"
                  @blur="saveEdit"
                  v-focus
                  class="bg-transparent border-b border-white/20 focus:outline-none focus:border-white/50 text-text-primary w-full"
                />
              </div>
              <div v-else @dblclick="startEditing(todo)" class="flex items-center gap-2 truncate">
                <!-- Breathing Light -->
                <span 
                  v-if="currentFocusTask?.id === todo.id"
                  class="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                  :class="modeBgColor"
                ></span>
                <span class="truncate font-medium text-text-primary">
                  {{ todo.text }}
                </span>
                <span 
                  v-if="todo.tag"
                  class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0"
                  :class="todo.tagColor"
                >
                  {{ todo.tag }}
                </span>
              </div>
            </div>
          </div>

          <div
            class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
          >
            <button
              @click="setFocusTask(todo)"
              class="p-2 rounded-lg transition-all"
              :class="
                currentFocusTask?.id === todo.id
                  ? [modeTextColor, 'bg-white/10']
                  : 'text-text-muted hover:text-text-primary hover:bg-white/10'
              "
              title="Set as current focus"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button
              @click="removeTodo(todo.id)"
              class="p-2 text-text-muted hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </li>
      </TransitionGroup>

      <!-- Completed Tasks -->
      <div v-if="completedTodos.length > 0" class="space-y-4 pt-4 border-t border-white/5">
        <h4 class="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] opacity-40">
          Completed
        </h4>
        <TransitionGroup
          name="list"
          tag="ul"
          class="space-y-2"
        >
          <li
            v-for="todo in completedTodos"
            :key="todo.id"
            class="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl border border-glass-border opacity-50 group transition-all duration-300"
          >
            <div class="flex items-center gap-4 flex-1 min-w-0">
              <button
                @click="toggleComplete(todo)"
                class="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center transition-all flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="text-white">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <span class="line-through text-text-muted truncate text-sm">
                {{ todo.text }}
              </span>
            </div>
            <button
              @click="removeTodo(todo.id)"
              class="p-1.5 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </li>
        </TransitionGroup>
      </div>

      <!-- Empty State -->
      <div
        v-if="todos.length === 0"
        class="text-center text-text-muted/40 text-sm py-12 font-medium flex flex-col items-center gap-4"
      >
        <div class="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </div>
        今天想达成什么目标？
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
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

.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
.list-move {
  transition: transform 0.4s ease;
}
</style>
