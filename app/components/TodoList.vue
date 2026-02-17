<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { usePomodoro } from '~/composables/usePomodoro'

interface Todo {
  id: number
  text: string
  completed: boolean
}


const { currentFocusTask, setFocusTask } = usePomodoro()
const todos = ref<Todo[]>([])
const newTodoText = ref('')

onMounted(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('pomodoro-todos')
    if (saved) {
      try {
        todos.value = JSON.parse(saved)
      } catch (e) {
        console.error(e)
      }
    }
  }
})

watch(todos, (newTodos) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pomodoro-todos', JSON.stringify(newTodos))
  }
}, { deep: true })

const addTodo = () => {
  if (!newTodoText.value.trim()) return
  todos.value.push({
    id: Date.now(),
    text: newTodoText.value.trim(),
    completed: false
  })
  newTodoText.value = ''
}

const removeTodo = (id: number) => {
  todos.value = todos.value.filter(t => t.id !== id)
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-xl font-bold text-gray-800">Tasks</h3>
    
    <!-- Add Task -->
    <div class="flex gap-2 px-0.5">
      <input 
        v-model="newTodoText"
        @keyup.enter="addTodo"
        type="text" 
        placeholder="Add a new task..." 
        class="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
      <button 
        @click="addTodo"
        class="bg-primary text-white p-2 rounded-lg hover:bg-opacity-90"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>

    <!-- List -->
    <ul class="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
      <li 
        v-for="todo in todos" 
        :key="todo.id"
        class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm group hover:border-gray-200 transition-colors"
      >
        <div class="flex items-center gap-3">
          <button 
            @click="todo.completed = !todo.completed"
            class="w-5 h-5 rounded border flex items-center justify-center transition-colors"
            :class="todo.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-primary'"
          >
            <svg v-if="todo.completed" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <span 
            :class="{ 'line-through text-gray-400': todo.completed, 'text-gray-700': !todo.completed }"
            class="break-words max-w-[200px]"
          >
            {{ todo.text }}
          </span>
        </div>

        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <!-- Focus Button -->
          <button 
            v-if="!todo.completed"
            @click="setFocusTask(todo)"
            class="p-1.5 rounded-full transition-colors"
            :class="currentFocusTask?.id === todo.id ? 'text-primary bg-orange-50' : 'text-gray-400 hover:text-primary hover:bg-gray-50'"
            title="Set as current focus"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>

          <!-- Delete Button -->
          <button 
            @click="removeTodo(todo.id)"
            class="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </li>
    </ul>
    
    <div v-if="todos.length === 0" class="text-center text-gray-400 text-sm py-4">
      No tasks for today. Stay focused!
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
  background-color: #e5e7eb; 
  border-radius: 20px;
}
</style>
