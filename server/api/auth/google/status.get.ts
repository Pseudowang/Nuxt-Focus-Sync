import { clearGoogleSessionCookie, getValidGoogleSession } from '~~/server/utils/googleAuth'

export default defineEventHandler(async (event) => {
  try {
    const session = await getValidGoogleSession(event)

    if (!session) {
      return { connected: false }
    }

    return {
      connected: true,
      user: session.user,
      expiresAt: session.expiresAt,
    }
  } catch (error) {
    clearGoogleSessionCookie(event)
    console.error('Failed to resolve Google auth status', error)
    return { connected: false }
  }
})
