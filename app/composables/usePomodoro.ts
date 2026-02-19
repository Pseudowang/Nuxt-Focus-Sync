import { onMounted, ref, watch } from 'vue'
import { useFocusFlowDAO } from '~/composables/useFocusFlowDAO'
import { hexToTagClass } from '~/composables/useFocusFlowDB'
import { useGoogleCalendar } from '~/composables/useGoogleCalendar'

export type TimerMode = 'focus' | 'short-break' | 'long-break' | 'flow'

interface Stats {
  todayFocusTime: number
  streak: number
  lastDate: string
}

export interface FocusTask {
  id: string
  title: string
  tagId: string
  tagName: string
  tagColor: string
  tagClass: string
}

const currentMode = ref<TimerMode>('focus')
const timeLeft = ref(25 * 60)
const isRunning = ref(false)
const timerInterval = ref<ReturnType<typeof setInterval> | null>(null)

const stats = ref<Stats>({
  todayFocusTime: 0,
  streak: 0,
  lastDate: new Date().toISOString().split('T')[0],
})

export const DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  'short-break': 5 * 60,
  'long-break': 15 * 60,
  flow: 0,
}

const currentFocusTask = ref<FocusTask | null>(null)
const sessionFocusTaskTitle = ref<string | null>(null)
let hasInitializedStatsWatcher = false

export const usePomodoro = () => {
  const { insertPomodoroEvent } = useGoogleCalendar()
  const {
    userMeta,
    getTodayFocusTime,
    addFocusRecord,
    markFocusRecordSynced,
    getTagPresentation,
    resolveMode,
  } = useFocusFlowDAO()

  const refreshStats = async () => {
    const today = new Date().toISOString().split('T')[0]
    const todayFocusTime = await getTodayFocusTime()
    stats.value = {
      todayFocusTime,
      streak: userMeta.value?.streak_count || 0,
      lastDate: userMeta.value?.last_focus_date || today,
    }
  }

  if (!hasInitializedStatsWatcher) {
    hasInitializedStatsWatcher = true
    watch(
      userMeta,
      () => {
        void refreshStats()
      },
      { deep: true },
    )
  }

  onMounted(() => {
    void refreshStats()
  })

  const createAndSyncFocusRecord = async (durationSeconds: number, mode: TimerMode) => {
    if (durationSeconds <= 0) return

    const endTime = Date.now()
    const startTime = endTime - durationSeconds * 1000
    const fallback = getTagPresentation('tag-general')

    const isFocusLikeMode = mode === 'focus' || mode === 'flow'

    const taskName =
      mode === 'short-break'
        ? 'Short Break'
        : mode === 'long-break'
          ? 'Long Break'
          : sessionFocusTaskTitle.value ||
            currentFocusTask.value?.title ||
            (mode === 'flow' ? 'Flow Session' : 'Pomodoro Focus Session')

    const tagInfo = isFocusLikeMode && currentFocusTask.value
      ? getTagPresentation(currentFocusTask.value.tagId)
      : {
          tagName: fallback.tagName,
          tagColor: fallback.tagColor,
        }

    const record = await addFocusRecord({
      taskId: isFocusLikeMode ? currentFocusTask.value?.id || null : null,
      taskName,
      tagName: tagInfo.tagName,
      tagColor: tagInfo.tagColor,
      startTime,
      endTime,
      duration: durationSeconds,
      mode: resolveMode(mode),
    })

    await refreshStats()

    if (!record) return

    try {
      const calendarEventId = await insertPomodoroEvent({
        summary: taskName,
        description: 'Created by videPomo.',
        startAt: new Date(startTime).toISOString(),
        endAt: new Date(endTime).toISOString(),
      })

      if (calendarEventId) {
        await markFocusRecordSynced(record.id, calendarEventId)
      }
    } catch (error) {
      console.error('Failed to sync focus session to Google Calendar', error)
    }
  }

  const completeAndSaveFlowSession = async () => {
    if (currentMode.value !== 'flow') return

    const duration = timeLeft.value
    resetTimer()

    if (duration <= 0) return

    try {
      await createAndSyncFocusRecord(duration, 'flow')
    } catch (error) {
      console.error('Failed to complete and save flow session', error)
    }
  }

  const switchMode = (mode: TimerMode) => {
    currentMode.value = mode
    resetTimer()
  }

  const toggleTimer = () => {
    if (isRunning.value) {
      pauseTimer()
    } else {
      startTimer()
    }
  }

  const startTimer = () => {
    if (isRunning.value) return

    if (currentMode.value === 'focus' && sessionFocusTaskTitle.value === null) {
      sessionFocusTaskTitle.value = currentFocusTask.value?.title || null
    }

    isRunning.value = true

    timerInterval.value = setInterval(() => {
      if (currentMode.value === 'flow') {
        timeLeft.value++
      } else if (timeLeft.value > 0) {
        timeLeft.value--
      } else {
        pauseTimer()
        const completedMode = currentMode.value
        const duration = DURATIONS[completedMode]

        if (duration > 0 && completedMode !== 'flow') {
          void createAndSyncFocusRecord(duration, completedMode)
        }

        if (completedMode === 'focus') {
          sessionFocusTaskTitle.value = null
        }
      }
    }, 1000)
  }

  const pauseTimer = () => {
    isRunning.value = false
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
      timerInterval.value = null
    }
  }

  const resetTimer = () => {
    pauseTimer()
    sessionFocusTaskTitle.value = null

    if (currentMode.value === 'flow') {
      timeLeft.value = 0
    } else {
      timeLeft.value = DURATIONS[currentMode.value]
    }
  }

  const formattedTime = () => {
    const minutes = Math.floor(timeLeft.value / 60)
    const seconds = timeLeft.value % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const setFocusTask = (task: FocusTask | null) => {
    currentFocusTask.value = task
  }

  const hydrateFocusTaskFromTask = (task: {
    id: string
    title: string
    tagId: string
  }): FocusTask => {
    const { tagName, tagColor } = getTagPresentation(task.tagId)

    return {
      id: task.id,
      title: task.title,
      tagId: task.tagId,
      tagName,
      tagColor,
      tagClass: hexToTagClass(tagColor),
    }
  }

  return {
    currentMode,
    timeLeft,
    isRunning,
    stats,
    currentFocusTask,
    switchMode,
    toggleTimer,
    resetTimer,
    formattedTime,
    setFocusTask,
    completeAndSaveFlowSession,
    hydrateFocusTaskFromTask,
  }
}
