import {
  clearGoogleSessionCookie,
  readGoogleSessionCookie,
  revokeGoogleToken,
} from '~~/server/utils/googleAuth'

export default defineEventHandler(async (event) => {
  const session = readGoogleSessionCookie(event)

  clearGoogleSessionCookie(event)

  if (session?.refreshToken) {
    await revokeGoogleToken(session.refreshToken)
  } else if (session?.accessToken) {
    await revokeGoogleToken(session.accessToken)
  }

  return { ok: true }
})
