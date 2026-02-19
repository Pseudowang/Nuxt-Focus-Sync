import { computed, ref } from 'vue'

interface InsertPomodoroEventPayload {
  summary: string
  description?: string
  startAt: string
  endAt: string
}

interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
}

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const isConnected = ref(false)
const user = ref<GoogleUser | null>(null)
const hasInitializedStatus = ref(false)

const refreshAuthStatus = async () => {
  if (typeof window === 'undefined') return

  try {
    const response = await $fetch<{ connected: boolean; user?: GoogleUser }>(
      '/api/auth/google/status',
    )
    isConnected.value = Boolean(response.connected)
    user.value = response.user || null
  } catch (error) {
    isConnected.value = false
    user.value = null
    console.error('Failed to fetch Google auth status', error)
  } finally {
    hasInitializedStatus.value = true
  }
}

export const useGoogleCalendar = () => {
  if (typeof window !== 'undefined' && !hasInitializedStatus.value) {
    void refreshAuthStatus()
  }

  const isSignedIn = computed(() => isConnected.value)
  const currentUser = computed(() => user.value)

  const signInWithGoogle = async () => {
    if (typeof window === 'undefined') return

    isLoading.value = true
    errorMessage.value = null

    window.location.href = '/api/auth/google/login'
  }

  const signOutGoogle = async () => {
    isLoading.value = true
    errorMessage.value = null

    try {
      await $fetch('/api/auth/google/logout', { method: 'POST' })
      isConnected.value = false
      user.value = null
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Google sign-out failed'
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const insertPomodoroEvent = async ({
    summary,
    description,
    startAt,
    endAt,
  }: InsertPomodoroEventPayload) => {
    console.log('[useGoogleCalendar] Inserting event:', { summary, startAt, endAt })

    try {
      const response = await $fetch<{ id?: string }>('/api/calendar/events', {
        method: 'POST',
        body: {
          summary,
          description,
          startAt,
          endAt,
        },
      })

      console.log('[useGoogleCalendar] Event created successfully:', response)
      isConnected.value = true
      return response.id || null
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create Google Calendar event'
      errorMessage.value = message

      console.error('[useGoogleCalendar] Failed to create event:', error)

      if (message.includes('401') || message.toLowerCase().includes('not connected')) {
        isConnected.value = false
      }

      throw error
    }
  }

  return {
    isSignedIn,
    currentUser,
    isLoading,
    errorMessage,
    signInWithGoogle,
    signOutGoogle,
    insertPomodoroEvent,
    refreshAuthStatus,
  }
}
