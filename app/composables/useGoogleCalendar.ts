import { computed, ref } from 'vue'

interface InsertPomodoroEventPayload {
  summary: string
  description?: string
  startAt: string
  endAt: string
}

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const isConnected = ref(false)
const hasInitializedStatus = ref(false)

const refreshAuthStatus = async () => {
  if (typeof window === 'undefined') return

  try {
    const response = await $fetch<{ connected: boolean }>('/api/auth/google/status')
    isConnected.value = Boolean(response.connected)
  } catch (error) {
    isConnected.value = false
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
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Google sign-out failed'
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const insertPomodoroEvent = async ({ summary, description, startAt, endAt }: InsertPomodoroEventPayload) => {
    try {
      await $fetch('/api/calendar/events', {
        method: 'POST',
        body: {
          summary,
          description,
          startAt,
          endAt,
        },
      })
      isConnected.value = true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create Google Calendar event'
      errorMessage.value = message

      if (message.includes('401') || message.toLowerCase().includes('not connected')) {
        isConnected.value = false
      }

      throw error
    }
  }

  return {
    isSignedIn,
    isLoading,
    errorMessage,
    signInWithGoogle,
    signOutGoogle,
    insertPomodoroEvent,
    refreshAuthStatus,
  }
}
