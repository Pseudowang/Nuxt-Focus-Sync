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
      const merged: UserMeta = {
        ...(existing || buildDefaultMeta(targetUserId)),
        streak_count: Math.max(existing?.streak_count || 0, guestMeta.streak_count || 0),
        total_focus_time: (existing?.total_focus_time || 0) + (guestMeta.total_focus_time || 0),
        last_focus_date:
          existing?.last_focus_date && guestMeta.last_focus_date
            ? (existing.last_focus_date > guestMeta.last_focus_date
                ? existing.last_focus_date
                : guestMeta.last_focus_date)
            : existing?.last_focus_date || guestMeta.last_focus_date || '',
        settings: existing?.settings || guestMeta.settings || DEFAULT_SETTINGS,
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
      const updated = { ...existing, settings: DEFAULT_SETTINGS }
      await db.user_meta.put(updated)
      return updated
    }

    return existing
  }

  const initial = buildDefaultMeta(userId)
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

    const nextMeta: UserMeta = {
      ...meta,
      streak_count: streakCount,
      last_focus_date: date,
      total_focus_time: meta.total_focus_time + durationSeconds,
    }

    await db.user_meta.put(nextMeta)
    userMeta.value = nextMeta
  }

  const setLastSyncTimestamp = async (timestamp: number) => {
    const db = getFocusFlowDB()
    if (!db) return

    await ensureMetaLoaded()
    const nextMeta = {
      ...(userMeta.value || buildDefaultMeta(currentUserId.value)),
      last_sync_timestamp: timestamp,
    }

    await db.user_meta.put(nextMeta)
    userMeta.value = nextMeta
  }

  const addFocusRecord = async (
    payload: Omit<FocusRecord, 'id' | 'userId' | 'syncStatus' | 'calendarEventId'>,
  ) => {
    const db = getFocusFlowDB()
    if (!db) return null

    const record: FocusRecord = {
      ...payload,
      id: createEntityId('record'),
      userId: currentUserId.value,
      syncStatus: 'pending',
      calendarEventId: null,
    }

    await db.focus_records.add(record)
    await trackFocusCompletion(record.duration, record.endTime, record.mode)
    return record
  }

  const markFocusRecordSynced = async (recordId: string, calendarEventId: string) => {
    const db = getFocusFlowDB()
    if (!db) return

    await db.focus_records.update(recordId, {
      syncStatus: 'synced',
      calendarEventId,
    })

    await setLastSyncTimestamp(Date.now())
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
    getTodayFocusTime,
    getTagPresentation,
    resolveMode,
    hasGuestData,
    setShouldMigrateGuestOnLogin,
  }
}
