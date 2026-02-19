<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useFocusFlowDAO } from '~/composables/useFocusFlowDAO'
import { useGoogleCalendar } from '~/composables/useGoogleCalendar'
import { getFocusFlowDB, type FocusRecord } from '~/composables/useFocusFlowDB'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

const { userMeta, currentUserId, getTagPresentation } = useFocusFlowDAO()
const { currentUser, isSignedIn, signOutGoogle } = useGoogleCalendar()

const recentRecords = ref<FocusRecord[]>([])
const isLoading = ref(false)

// Aggregated Data
const tagStats = ref<{ name: string; color: string; duration: number }[]>([])
const dailyStats = ref<Record<string, number>>({})

const fetchProfileData = async () => {
  const db = getFocusFlowDB()
  if (!db || !currentUserId.value) return

  isLoading.value = true
  try {
    // Fetch all records for statistics
    const allRecords = await db.focus_records
      .where('userId')
      .equals(currentUserId.value)
      .toArray()

    // Recent records for timeline (last 10)
    recentRecords.value = [...allRecords]
      .sort((a, b) => b.endTime - a.endTime)
      .slice(0, 10)

    // Tag distribution (Donut Chart Data)
    const tagMap = new Map<string, number>()
    allRecords.forEach(record => {
      if (record.mode === 'Pomodoro' || record.mode === 'Flow') {
        const duration = record.duration
        tagMap.set(record.tagName, (tagMap.get(record.tagName) || 0) + duration)
      }
    })
    
    tagStats.value = Array.from(tagMap.entries()).map(([name, duration]) => {
      const recordWithTag = allRecords.find(r => r.tagName === name)
      return {
        name,
        color: recordWithTag?.tagColor || '#888',
        duration
      }
    }).sort((a, b) => b.duration - a.duration)

    // Heatmap data (last 365 days)
    const dayMap: Record<string, number> = {}
    allRecords.forEach(record => {
      const date = new Date(record.endTime).toISOString().split('T')[0]
      dayMap[date] = (dayMap[date] || 0) + record.duration
    })
    dailyStats.value = dayMap

  } finally {
    isLoading.value = false
  }
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    fetchProfileData()
  }
})

const totalFocusTimeFormatted = computed(() => {
  const totalSeconds = userMeta.value?.total_focus_time || 0
  const hours = (totalSeconds / 3600).toFixed(1)
  return `${hours}h`
})

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hours = (mins / 60).toFixed(1)
  return `${hours}h`
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Heatmap Grid Generation
const heatmapDays = computed(() => {
  const days = []
  const today = new Date()
  for (let i = 364; i >= 0; i--) {
    const d = new Date()
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const seconds = dailyStats.value[dateStr] || 0
    days.push({
      date: dateStr,
      seconds,
      level: seconds === 0 ? 0 : seconds < 3600 ? 1 : seconds < 7200 ? 2 : 3
    })
  }
  return days
})

const heatmapLevelClass = (level: number) => {
  switch (level) {
    case 0: return 'bg-white/5'
    case 1: return 'bg-focus/20'
    case 2: return 'bg-focus/50'
    case 3: return 'bg-focus shadow-[0_0_8px_rgba(163,66,60,0.4)]'
    default: return 'bg-white/5'
  }
}

const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

const todayProgress = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const todaySeconds = dailyStats.value[today] || 0
  const targetSeconds = 8 * 25 * 60 // 8 Pomodoros target
  const percentage = Math.min((todaySeconds / targetSeconds) * 100, 100)
  const pomodoros = (todaySeconds / (25 * 60)).toFixed(1)
  
  return {
    pomodoros,
    percentage: percentage.toFixed(0),
    isComplete: percentage >= 100
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleEsc)
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-500 ease-out"
    enter-from-class="opacity-0 translate-y-10 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-400 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-10 scale-95"
  >
    <div 
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-white/[0.02] backdrop-blur-xl"
    >
      <div class="w-full max-w-5xl h-[85vh] bg-glass/80 border border-glass-border rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative">
        
        <!-- Header: Identity & Streaks -->
        <header class="p-8 border-b border-glass-border flex items-center justify-between bg-white/5">
          <div class="flex items-center gap-6">
            <div class="relative">
              <img 
                v-if="currentUser?.picture" 
                :src="currentUser.picture" 
                class="w-16 h-16 rounded-2xl border-2 border-white/20 shadow-xl"
              />
              <div v-else class="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-bold border-2 border-white/20">
                {{ currentUser?.name?.charAt(0) || 'U' }}
              </div>
              <div class="absolute -bottom-2 -right-2 bg-slate-900 border border-glass-border rounded-lg px-2 py-1 flex items-center gap-1 shadow-lg">
                <span class="text-xs">🔥</span>
                <span class="text-xs font-bold">{{ userMeta?.streak_count || 0 }}</span>
              </div>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-text-primary">Hi, {{ currentUser?.name || 'Explorer' }}</h1>
              <p class="text-text-muted text-sm opacity-60">Ready for another deep work session?</p>
            </div>
          </div>
          
          <button 
            @click="$emit('close')"
            class="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main class="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <!-- Grid: Key Metrics -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div class="bg-white/5 border border-glass-border p-6 rounded-3xl flex flex-col">
              <span class="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-50 mb-4">Total Focus Time</span>
              <div class="flex items-end gap-2">
                <span class="text-3xl font-bold">{{ totalFocusTimeFormatted }}</span>
                <span class="text-xs text-green-400 font-medium mb-1">↑ 12%</span>
              </div>
            </div>
            
            <div class="bg-white/5 border border-glass-border p-6 rounded-3xl flex flex-col">
              <span class="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-50 mb-4">Today's Progress</span>
              <div class="flex flex-col gap-3">
                 <div class="flex items-center justify-between text-xs font-medium">
                   <span>{{ todayProgress.pomodoros }} / 8 Pomodoros</span>
                   <span :class="todayProgress.isComplete ? 'text-green-400' : ''">{{ todayProgress.percentage }}%</span>
                 </div>
                 <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                   <div 
                     class="h-full bg-focus rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(163,66,60,0.5)]" 
                     :style="{ width: todayProgress.percentage + '%' }"
                   ></div>
                 </div>
              </div>
            </div>

            <div class="bg-white/5 border border-glass-border p-6 rounded-3xl flex flex-col justify-between">
              <span class="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-50 mb-4">Cloud Status</span>
              <div class="flex items-center gap-3">
                <div 
                  class="w-8 h-8 rounded-lg flex items-center justify-center"
                  :class="isSignedIn ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-text-muted'"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <div>
                  <div class="text-sm font-bold">{{ isSignedIn ? 'Connected' : 'Offline' }}</div>
                  <div class="text-[10px] opacity-60">{{ isSignedIn ? currentUser?.email : 'Local storage only' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Insight Core: Donut & Heatmap -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <!-- Left: Allocation -->
            <div class="bg-white/5 border border-glass-border p-8 rounded-3xl">
              <h3 class="text-sm font-bold text-text-primary mb-6">Energy Allocation</h3>
              <div class="flex items-center gap-8">
                <!-- SVG Donut Chart -->
                <div class="relative w-44 h-44 flex items-center justify-center">
                   <svg class="w-full h-full -rotate-90 drop-shadow-[0_0_8px_rgba(0,0,0,0.3)]" viewBox="0 0 40 40">
                     <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="4" />
                     <circle 
                        v-for="(stat, i) in tagStats" :key="stat.name"
                        cx="20" cy="20" r="16" fill="none" 
                        :stroke="stat.color" 
                        stroke-width="4"
                        stroke-linecap="round"
                        :stroke-dasharray="`${(stat.duration / Math.max(userMeta?.total_focus_time || 1, 1)) * 100.53} 100.53`"
                        :stroke-dashoffset="-tagStats.slice(0, i).reduce((acc, s) => acc + (s.duration / Math.max(userMeta?.total_focus_time || 1, 1)) * 100.53, 0)"
                        class="transition-all duration-1000 ease-out"
                     />
                   </svg>
                   <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                     <span class="text-[10px] text-text-muted uppercase tracking-[0.2em] opacity-50 mb-1">Deepest</span>
                     <span class="text-xs font-bold text-text-primary truncate max-w-[90px] px-2">{{ tagStats[0]?.name || 'N/A' }}</span>
                   </div>
                </div>
                
                <div class="flex-1 flex flex-col gap-3">
                  <div v-for="stat in tagStats.slice(0, 4)" :key="stat.name" class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                      <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: stat.color }"></div>
                      <span class="opacity-80">{{ stat.name }}</span>
                    </div>
                    <span class="font-bold">{{ formatDuration(stat.duration) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Productivity Map -->
            <div class="bg-white/5 border border-glass-border p-8 rounded-3xl overflow-hidden">
               <h3 class="text-sm font-bold text-text-primary mb-6">Productivity Map</h3>
               <div class="flex gap-1 flex-wrap content-start h-32 overflow-hidden">
                  <div 
                    v-for="day in heatmapDays" 
                    :key="day.date"
                    class="w-3 h-3 rounded-sm transition-all duration-300 hover:scale-150 hover:z-10"
                    :class="heatmapLevelClass(day.level)"
                    :title="`${day.date}: ${formatDuration(day.seconds)}`"
                  ></div>
               </div>
               <div class="mt-4 flex items-center justify-end gap-2 text-[10px] text-text-muted">
                 <span>Less</span>
                 <div class="flex gap-1">
                   <div class="w-2 h-2 rounded-sm bg-white/5"></div>
                   <div class="w-2 h-2 rounded-sm bg-focus/30"></div>
                   <div class="w-2 h-2 rounded-sm bg-focus/60"></div>
                   <div class="w-2 h-2 rounded-sm bg-focus"></div>
                 </div>
                 <span>More</span>
               </div>
            </div>
          </div>

          <!-- Timeline -->
          <div class="bg-white/5 border border-glass-border rounded-3xl overflow-hidden">
            <div class="p-6 border-b border-glass-border flex justify-between items-center">
              <h3 class="text-sm font-bold text-text-primary">Recent Activity</h3>
              <button class="text-xs text-focus font-bold hover:underline">View All</button>
            </div>
            <div class="divide-y divide-glass-border/30">
              <div v-for="record in recentRecords" :key="record.id" class="p-4 hover:bg-white/5 flex items-center justify-between transition-colors">
                 <div class="flex items-center gap-4">
                    <div class="w-2 h-10 rounded-full" :style="{ backgroundColor: record.tagColor }"></div>
                    <div>
                      <div class="text-sm font-medium">{{ record.taskName }}</div>
                      <div class="text-[10px] text-text-muted flex items-center gap-2">
                        <span>{{ formatDate(record.endTime) }}</span>
                        <span>•</span>
                        <span class="px-1.5 py-0.5 bg-white/5 rounded-md">{{ record.mode }}</span>
                      </div>
                    </div>
                 </div>
                 <div class="flex items-center gap-4">
                    <span class="text-sm font-mono font-bold">{{ formatDuration(record.duration) }}</span>
                    <div :title="record.syncStatus === 'synced' ? 'Synced to Calendar' : 'Pending sync'">
                       <svg v-if="record.syncStatus === 'synced'" class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                       </svg>
                       <svg v-else class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                    </div>
                 </div>
              </div>
              <div v-if="recentRecords.length === 0" class="p-12 text-center text-text-muted text-sm italic">
                No sessions recorded yet. Start your first session to see it here!
              </div>
            </div>
          </div>
        </main>

        <!-- Footer: Settings & Info -->
        <footer class="p-6 border-t border-glass-border bg-white/5 flex justify-between items-center">
          <div class="flex gap-4">
            <button class="text-[11px] font-bold text-text-muted hover:text-text-primary transition-colors flex items-center gap-2">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export Data
            </button>
            <button class="text-[11px] font-bold text-text-muted hover:text-red-400 transition-colors flex items-center gap-2">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Clear Storage
            </button>
          </div>
          
          <div class="flex items-center gap-4">
            <span class="text-[10px] text-text-muted opacity-40">videPomo v1.0.0</span>
            <button 
              @click="signOutGoogle"
              class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl transition-all border border-red-500/20"
            >
              Log out
            </button>
          </div>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
