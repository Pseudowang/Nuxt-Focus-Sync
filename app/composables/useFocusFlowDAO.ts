import { computed, onMounted, ref, watch } from 'vue'
import { useGoogleCalendar } from '~/composables/useGoogleCalendar'
import {
  createEntityId,
  getFocusFlowDB,
  GUEST_USER_ID,
  normalizeTagToId,
  tagColorFromId,
  tagNameFromId,
  type FocusRecord,
  type FocusRecordMode,
  type TaskItem,
  type UserMeta,
} from '~/composables/useFocusFlowDB'

const DEFAULT_SETTINGS = {
  focusDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
}

const GUEST_MIGRATION_FLAG = 'focusflow-migrate-guest-on-login'

const tasks = ref<TaskItem[]>([])
const userMeta = ref<UserMeta | null>(null)
const activeUserId = ref<string>(GUEST_USER_ID)
const hasHydrated = ref(false)
const isHydrating = ref(false)
let hasInitializedWatchers = false

const buildDefaultMeta = (userId: string): UserMeta => ({
  userId,
  streak_count: 0,
  last_focus_date: '',
  total_focus_time: 0,
  settings: DEFAULT_SETTINGS,
  last_sync_timestamp: 0,
})

const todayDate = () => new Date().toISOString().split('T')[0]

const getDateDiffDays = (fromDate: string, toDate: string) => {
  const from = new Date(fromDate)
  const to = new Date(toDate)
  const diff = to.getTime() - from.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

const getCurrentUserId = (user: { id?: string; email?: string } | null) => {
  if (user?.id) return user.id
  if (user?.email) return user.email
  return GUEST_USER_ID
}

const migrateGuestDataToUser = async (targetUserId: string) => {
  const db = getFocusFlowDB()
  if (!db) return

  const guestTasks = await db.tasks.where('userId').equals(GUEST_USER_ID).toArray()
  const guestRecords = await db.focus_records.where('userId').equals(GUEST_USER_ID).toArray()
  const guestMeta = await db.user_meta.get(GUEST_USER_ID)

  await db.transaction('rw', db.tasks, db.focus_records, db.user_meta, async () => {
    if (guestTasks.length > 0) {
      await Promise.all(
        guestTasks.map((item) => db.tasks.update(item.id, { userId: targetUserId })),
      )
    }

    if (guestRecords.length > 0) {
      await Promise.all(
        guestRecords.map((item) => db.focus_records.update(item.id, { userId: targetUserId })),
      )
    }

    if (guestMeta) {
      const existing = await db.user_meta.get(targetUserId)
      const existingOrDefault = existing || buildDefaultMeta(targetUserId)
      
      // Create a clean, serializable merged object
      const merged: UserMeta = {
        userId: targetUserId,
        streak_count: Math.max(existing?.streak_count || 0, guestMeta.streak_count || 0),
        total_focus_time: (existing?.total_focus_time || 0) + (guestMeta.total_focus_time || 0),
        last_focus_date:
          existing?.last_focus_date && guestMeta.last_focus_date
            ? (existing.last_focus_date > guestMeta.last_focus_date
                ? existing.last_focus_date
                : guestMeta.last_focus_date)
            : existing?.last_focus_date || guestMeta.last_focus_date || '',
        settings: {
          focusDuration: (existing?.settings || guestMeta.settings || DEFAULT_SETTINGS).focusDuration,
          shortBreakDuration: (existing?.settings || guestMeta.settings || DEFAULT_SETTINGS).shortBreakDuration,
          longBreakDuration: (existing?.settings || guestMeta.settings || DEFAULT_SETTINGS).longBreakDuration,
        },
        last_sync_timestamp:
          Math.max(existing?.last_sync_timestamp || 0, guestMeta.last_sync_timestamp || 0),
      }

      await db.user_meta.put(merged)
    }
  })
}

const ensureUserMeta = async (userId: string) => {
  const db = getFocusFlowDB()
  if (!db) return buildDefaultMeta(userId)

  const existing = await db.user_meta.get(userId)
  if (existing) {
    if (!existing.settings) {
      // Create a clean object with settings
      const updated: UserMeta = {
        userId: existing.userId,
        streak_count: existing.streak_count,
        last_focus_date: existing.last_focus_date,
        total_focus_time: existing.total_focus_time,
        settings: {
          focusDuration: DEFAULT_SETTINGS.focusDuration,
          shortBreakDuration: DEFAULT_SETTINGS.shortBreakDuration,
          longBreakDuration: DEFAULT_SETTINGS.longBreakDuration,
        },
        last_sync_timestamp: existing.last_sync_timestamp,
      }
      await db.user_meta.put(updated)
      return updated
    }

    return existing
  }

  // Create initial meta with clean settings object
  const initial: UserMeta = {
    userId,
    streak_count: 0,
    last_focus_date: '',
    total_focus_time: 0,
    settings: {
      focusDuration: DEFAULT_SETTINGS.focusDuration,
      shortBreakDuration: DEFAULT_SETTINGS.shortBreakDuration,
      longBreakDuration: DEFAULT_SETTINGS.longBreakDuration,
    },
    last_sync_timestamp: 0,
  }
  await db.user_meta.put(initial)
  return initial
}

const loadUserData = async (userId: string) => {
  const db = getFocusFlowDB()
  if (!db) return

  isHydrating.value = true
  activeUserId.value = userId

  try {
    const [rows, meta] = await Promise.all([
      db.tasks.where('userId').equals(userId).toArray(),
      ensureUserMeta(userId),
    ])

    tasks.value = rows.sort((left, right) => right.createdAt - left.createdAt)
    userMeta.value = meta
    hasHydrated.value = true
  } finally {
    isHydrating.value = false
  }
}

const getTodayFocusDurationSeconds = async (userId: string) => {
  const db = getFocusFlowDB()
  if (!db) return 0

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1

  const rows = await db.focus_records
    .where('[userId+endTime]')
    .between([userId, startOfDay], [userId, endOfDay], true, true)
    .toArray()

  return rows.reduce((total, row) => {
    if (row.mode !== 'Pomodoro' && row.mode !== 'Flow') {
      return total
    }

    return total + row.duration
  }, 0)
}

export const useFocusFlowDAO = () => {
  const { currentUser } = useGoogleCalendar()

  const currentUserId = computed(() => getCurrentUserId(currentUser.value))

  const refresh = async () => {
    await loadUserData(currentUserId.value)
  }

  if (!hasInitializedWatchers && typeof window !== 'undefined') {
    hasInitializedWatchers = true

    watch(
      currentUserId,
      async (nextUserId, previousUserId) => {
        hasHydrated.value = false
        tasks.value = []
        userMeta.value = null

        const shouldMigrateGuest = localStorage.getItem(GUEST_MIGRATION_FLAG) === 'yes'
        if (
          shouldMigrateGuest &&
          previousUserId === GUEST_USER_ID &&
          nextUserId !== GUEST_USER_ID
        ) {
          await migrateGuestDataToUser(nextUserId)
        }
        localStorage.removeItem(GUEST_MIGRATION_FLAG)

        await loadUserData(nextUserId)
      },
      { immediate: true },
    )
  }

  onMounted(() => {
    if (!hasHydrated.value && !isHydrating.value) {
      void loadUserData(currentUserId.value)
    }
  })

  const activeTasks = computed(() => tasks.value.filter((item) => item.status === 'todo'))
  const completedTasks = computed(() => tasks.value.filter((item) => item.status === 'completed'))

  const addTask = async (title: string, tagName?: string) => {
    const db = getFocusFlowDB()
    if (!db) return null

    const cleanTitle = title.trim()
    if (!cleanTitle) return null

    const now = Date.now()
    const record: TaskItem = {
      id: createEntityId('task'),
      userId: currentUserId.value,
      title: cleanTitle,
      tagId: normalizeTagToId(tagName || 'General'),
      status: 'todo',
      createdAt: now,
      completedAt: null,
    }

    await db.tasks.add(record)
    tasks.value = [record, ...tasks.value]
    return record
  }

  const updateTask = async (taskId: string, title: string, tagName?: string) => {
    const db = getFocusFlowDB()
    if (!db) return

    const cleanTitle = title.trim()
    if (!cleanTitle) return

    await db.tasks.update(taskId, {
      title: cleanTitle,
      tagId: normalizeTagToId(tagName || 'General'),
    })

    tasks.value = tasks.value.map((item) => {
      if (item.id !== taskId) return item
      return {
        ...item,
        title: cleanTitle,
        tagId: normalizeTagToId(tagName || 'General'),
      }
    })
  }

  const toggleTaskStatus = async (taskId: string) => {
    const db = getFocusFlowDB()
    if (!db) return

    const task = tasks.value.find((item) => item.id === taskId)
    if (!task) return

    const nextStatus = task.status === 'todo' ? 'completed' : 'todo'
    const completedAt = nextStatus === 'completed' ? Date.now() : null

    await db.tasks.update(taskId, {
      status: nextStatus,
      completedAt,
    })

    tasks.value = tasks.value.map((item) => {
      if (item.id !== taskId) return item
      return {
        ...item,
        status: nextStatus,
        completedAt,
      }
    })
  }

  const removeTask = async (taskId: string) => {
    const db = getFocusFlowDB()
    if (!db) return

    await db.tasks.delete(taskId)
    tasks.value = tasks.value.filter((item) => item.id !== taskId)
  }

  const ensureMetaLoaded = async () => {
    if (!userMeta.value) {
      await loadUserData(currentUserId.value)
    }

    if (!userMeta.value) {
      userMeta.value = buildDefaultMeta(currentUserId.value)
    }
  }

  const trackFocusCompletion = async (
    durationSeconds: number,
    endedAt: number,
    mode: FocusRecordMode,
  ) => {
    const db = getFocusFlowDB()
    if (!db) return
    if (durationSeconds <= 0) return
    if (mode !== 'Pomodoro' && mode !== 'Flow') return

    await ensureMetaLoaded()

    const meta = userMeta.value || buildDefaultMeta(currentUserId.value)
    const date = new Date(endedAt).toISOString().split('T')[0]
    const previousDate = meta.last_focus_date

    let streakCount = meta.streak_count

    if (!previousDate) {
      streakCount = 1
    } else if (date !== previousDate) {
      const diff = getDateDiffDays(previousDate, date)
      if (diff === 1) {
        streakCount += 1
      } else if (diff > 1) {
        streakCount = 1
      }
    }

    // Create a clean, serializable meta object
    const nextMeta: UserMeta = {
      userId: meta.userId,
      streak_count: streakCount,
      last_focus_date: date,
      total_focus_time: meta.total_focus_time + durationSeconds,
      settings: {
        focusDuration: meta.settings.focusDuration,
        shortBreakDuration: meta.settings.shortBreakDuration,
        longBreakDuration: meta.settings.longBreakDuration,
      },
      last_sync_timestamp: meta.last_sync_timestamp,
    }

    try {
      await db.user_meta.put(nextMeta)
      userMeta.value = nextMeta
    } catch (error) {
      console.error('[useFocusFlowDAO] Failed to update user_meta:', error)
      // Update in-memory state even if DB write fails
      userMeta.value = nextMeta
    }
  }

  const setLastSyncTimestamp = async (timestamp: number) => {
    const db = getFocusFlowDB()
    if (!db) return

    await ensureMetaLoaded()
    const meta = userMeta.value || buildDefaultMeta(currentUserId.value)
    
    // Create a clean, serializable meta object
    const nextMeta: UserMeta = {
      userId: meta.userId,
      streak_count: meta.streak_count,
      last_focus_date: meta.last_focus_date,
      total_focus_time: meta.total_focus_time,
      settings: {
        focusDuration: meta.settings.focusDuration,
        shortBreakDuration: meta.settings.shortBreakDuration,
        longBreakDuration: meta.settings.longBreakDuration,
      },
      last_sync_timestamp: timestamp,
    }

    try {
      await db.user_meta.put(nextMeta)
      userMeta.value = nextMeta
    } catch (error) {
      console.error('[useFocusFlowDAO] Failed to update user_meta sync timestamp:', error)
      // Update in-memory state even if DB write fails
      userMeta.value = nextMeta
    }
  }

  const recalculateFocusMeta = async () => {
    const db = getFocusFlowDB()
    if (!db) return

    await ensureMetaLoaded()

    const userId = currentUserId.value
    const meta = userMeta.value || buildDefaultMeta(userId)
    const rows = await db.focus_records.where('userId').equals(userId).toArray()

    const focusRows = rows.filter((row) => {
      if (row.duration <= 0) return false
      return row.mode === 'Pomodoro' || row.mode === 'Flow'
    })

    const totalFocusTime = focusRows.reduce((total, row) => total + row.duration, 0)
    const uniqueDays = Array.from(
      new Set(focusRows.map((row) => new Date(row.endTime).toISOString().split('T')[0])),
    ).sort()

    const lastFocusDate = uniqueDays[uniqueDays.length - 1] || ''
    let streakCount = 0

    if (uniqueDays.length > 0) {
      streakCount = 1
      for (let index = uniqueDays.length - 1; index > 0; index--) {
        if (getDateDiffDays(uniqueDays[index - 1], uniqueDays[index]) === 1) {
          streakCount += 1
          continue
        }
        break
      }
    }

    const nextMeta: UserMeta = {
      userId: meta.userId,
      streak_count: streakCount,
      last_focus_date: lastFocusDate,
      total_focus_time: totalFocusTime,
      settings: {
        focusDuration: meta.settings.focusDuration,
        shortBreakDuration: meta.settings.shortBreakDuration,
        longBreakDuration: meta.settings.longBreakDuration,
      },
      last_sync_timestamp: meta.last_sync_timestamp,
    }

    await db.user_meta.put(nextMeta)
    userMeta.value = nextMeta
  }

  const addFocusRecord = async (
    payload: Omit<FocusRecord, 'id' | 'userId' | 'syncStatus' | 'calendarEventId'>,
  ) => {
    const db = getFocusFlowDB()
    if (!db) return null

    console.log('[useFocusFlowDAO] Adding focus record, payload:', payload)
    console.log('[useFocusFlowDAO] currentUserId.value:', currentUserId.value)
    console.log('[useFocusFlowDAO] typeof currentUserId.value:', typeof currentUserId.value)

    const userIdStr = String(currentUserId.value)
    console.log('[useFocusFlowDAO] userIdStr:', userIdStr)
    console.log('[useFocusFlowDAO] typeof userIdStr:', typeof userIdStr)

    console.log('[useFocusFlowDAO] Payload types:', {
      taskId: typeof payload.taskId,
      taskName: typeof payload.taskName,
      tagName: typeof payload.tagName,
      tagColor: typeof payload.tagColor,
      startTime: typeof payload.startTime,
      endTime: typeof payload.endTime,
      duration: typeof payload.duration,
      mode: typeof payload.mode,
    })

    const recordId = createEntityId('record')
    
    // Create a completely fresh object with no references
    const cleanRecord: FocusRecord = {
      id: recordId,
      userId: userIdStr,
      taskId: payload.taskId,
      taskName: payload.taskName,
      tagName: payload.tagName,
      tagColor: payload.tagColor,
      startTime: payload.startTime,
      endTime: payload.endTime,
      duration: payload.duration,
      mode: payload.mode,
      syncStatus: 'pending',
      calendarEventId: null,
    }

    console.log('[useFocusFlowDAO] Clean record before save:', cleanRecord)
    console.log('[useFocusFlowDAO] Clean record stringified:', JSON.stringify(cleanRecord))

    try {
      // Try using put instead of add
      await db.focus_records.put(cleanRecord)
      console.log('[useFocusFlowDAO] Successfully saved record with put()')
      await trackFocusCompletion(cleanRecord.duration, cleanRecord.endTime, cleanRecord.mode)
      return cleanRecord
    } catch (putError) {
      console.warn('[useFocusFlowDAO] put() threw error, but data may have been saved:', putError)
      
      // Check if the record actually exists (put() may have succeeded despite the error)
      try {
        const existingRecord = await db.focus_records.get(cleanRecord.id)
        if (existingRecord) {
          console.log('[useFocusFlowDAO] Record was actually saved despite error! Using existing record.')
          await trackFocusCompletion(cleanRecord.duration, cleanRecord.endTime, cleanRecord.mode)
          return cleanRecord
        }
      } catch (checkError) {
        console.error('[useFocusFlowDAO] Failed to check if record exists:', checkError)
      }
      
      // If record doesn't exist, the put really failed
      console.error('[useFocusFlowDAO] Record was not saved, IndexedDB may have issues')
      console.log('[useFocusFlowDAO] Continuing without IndexedDB record (Calendar sync will still work)')
      return null
    }
  }

  const markFocusRecordSynced = async (recordId: string, calendarEventId: string) => {
    const db = getFocusFlowDB()
    if (!db) return

    try {
      await db.focus_records.update(recordId, {
        syncStatus: 'synced',
        calendarEventId,
      })

      await setLastSyncTimestamp(Date.now())
    } catch (error) {
      console.error('[useFocusFlowDAO] Failed to mark focus record synced:', error)
    }
  }

  const removeFocusRecord = async (recordId: string) => {
    const db = getFocusFlowDB()
    if (!db) return false

    const record = await db.focus_records.get(recordId)
    if (!record || record.userId !== currentUserId.value) return false

    await db.focus_records.delete(recordId)
    await recalculateFocusMeta()
    return true
  }

  const getTodayFocusTime = async () => {
    return getTodayFocusDurationSeconds(currentUserId.value)
  }

  const hasGuestData = async () => {
    const db = getFocusFlowDB()
    if (!db) return false

    const [taskCount, recordCount, guestMeta] = await Promise.all([
      db.tasks.where('userId').equals(GUEST_USER_ID).count(),
      db.focus_records.where('userId').equals(GUEST_USER_ID).count(),
      db.user_meta.get(GUEST_USER_ID),
    ])

    return Boolean(
      taskCount > 0 ||
        recordCount > 0 ||
        (guestMeta && (guestMeta.total_focus_time > 0 || guestMeta.streak_count > 0)),
    )
  }

  const setShouldMigrateGuestOnLogin = (shouldMigrate: boolean) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(GUEST_MIGRATION_FLAG, shouldMigrate ? 'yes' : 'no')
  }

  const getTagPresentation = (tagId: string) => {
    const tagName = tagNameFromId(tagId)
    const tagColor = tagColorFromId(tagId)

    return {
      tagName,
      tagColor,
    }
  }

  const resolveMode = (mode: 'focus' | 'short-break' | 'long-break' | 'flow'): FocusRecordMode => {
    switch (mode) {
      case 'focus':
        return 'Pomodoro'
      case 'short-break':
        return 'ShortBreak'
      case 'long-break':
        return 'LongBreak'
      case 'flow':
        return 'Flow'
      default:
        return 'Pomodoro'
    }
  }

  return {
    currentUserId,
    tasks,
    userMeta,
    activeTasks,
    completedTasks,
    hasHydrated,
    refresh,
    addTask,
    updateTask,
    toggleTaskStatus,
    removeTask,
    addFocusRecord,
    markFocusRecordSynced,
    removeFocusRecord,
    getTodayFocusTime,
    getTagPresentation,
    resolveMode,
    hasGuestData,
    setShouldMigrateGuestOnLogin,
  }
}
