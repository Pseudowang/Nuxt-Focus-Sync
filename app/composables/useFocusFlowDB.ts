import Dexie, { type Table } from 'dexie'

export const GUEST_USER_ID = 'guest'

export type TaskStatus = 'todo' | 'completed'
export type FocusRecordMode = 'Pomodoro' | 'ShortBreak' | 'LongBreak' | 'Flow'
export type SyncStatus = 'synced' | 'pending'

export interface TaskItem {
  id: string
  userId: string
  title: string
  tagId: string
  status: TaskStatus
  createdAt: number
  completedAt: number | null
}

export interface FocusRecord {
  id: string
  userId: string
  taskId: string | null
  taskName: string
  tagName: string
  tagColor: string
  startTime: number
  endTime: number
  duration: number
  mode: FocusRecordMode
  syncStatus: SyncStatus
  calendarEventId: string | null
}

export interface UserSettings {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
}

export interface UserMeta {
  userId: string
  streak_count: number
  last_focus_date: string
  total_focus_time: number
  settings: UserSettings
  last_sync_timestamp: number
}

export class FocusFlowDB extends Dexie {
  tasks!: Table<TaskItem, string>
  focus_records!: Table<FocusRecord, string>
  user_meta!: Table<UserMeta, string>

  constructor() {
    super('FocusFlowDB')

    this.version(1).stores({
      tasks: '&id, userId, [userId+status], createdAt, tagId',
      focus_records:
        '&id, userId, [userId+endTime], syncStatus, [userId+syncStatus], [userId+tagName+endTime], endTime',
      user_meta: '&userId',
    })
  }
}

let dbInstance: FocusFlowDB | null = null

export const getFocusFlowDB = () => {
  if (typeof window === 'undefined') return null

  if (!dbInstance) {
    dbInstance = new FocusFlowDB()
  }

  return dbInstance
}

export const createEntityId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const normalizeTagToId = (tagName: string) => {
  const normalized = tagName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `tag-${normalized || 'general'}`
}

export const tagNameFromId = (tagId: string) => {
  const clean = tagId.replace(/^tag-/, '')
  if (!clean) return 'General'
  return clean
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const fallbackColors = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#14b8a6']

const knownTagColors: Record<string, string> = {
  'tag-coding': '#3b82f6',
  'tag-reading': '#10b981',
  'tag-design': '#8b5cf6',
  'tag-meeting': '#f59e0b',
  'tag-general': '#94a3b8',
}

export const tagColorFromId = (tagId: string) => {
  if (knownTagColors[tagId]) {
    return knownTagColors[tagId]
  }

  let hash = 0
  for (let index = 0; index < tagId.length; index++) {
    hash = (hash << 5) - hash + tagId.charCodeAt(index)
    hash |= 0
  }

  const colorIndex = Math.abs(hash) % fallbackColors.length
  return fallbackColors[colorIndex]
}

export const hexToTagClass = (hex: string) => {
  switch (hex.toLowerCase()) {
    case '#3b82f6':
      return 'text-blue-400 bg-blue-400/10'
    case '#10b981':
      return 'text-emerald-400 bg-emerald-400/10'
    case '#8b5cf6':
      return 'text-purple-400 bg-purple-400/10'
    case '#f59e0b':
      return 'text-amber-400 bg-amber-400/10'
    case '#94a3b8':
      return 'text-slate-400 bg-slate-400/10'
    case '#f43f5e':
      return 'text-rose-400 bg-rose-400/10'
    case '#6366f1':
      return 'text-indigo-400 bg-indigo-400/10'
    case '#14b8a6':
      return 'text-teal-400 bg-teal-400/10'
    default:
      return 'text-slate-400 bg-slate-400/10'
  }
}
