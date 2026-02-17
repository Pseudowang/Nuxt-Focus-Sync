import { createError, getQuery, sendRedirect } from 'h3'
import {
  clearGoogleOauthState,
  exchangeCodeForSession,
  readGoogleOauthState,
  readGoogleSessionCookie,
  setGoogleSessionCookie,
} from '~~/server/utils/googleAuth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  const oauthError = typeof query.error === 'string' ? query.error : ''

  if (oauthError) {
    return sendRedirect(event, `/?googleAuthError=${encodeURIComponent(oauthError)}`)
  }

  if (!code || !state) {
    throw createError({ statusCode: 400, statusMessage: 'Missing OAuth code or state' })
  }

  const storedState = readGoogleOauthState(event)
  clearGoogleOauthState(event)

  if (!storedState || storedState !== state) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid OAuth state' })
  }

  const existingSession = readGoogleSessionCookie(event)
  const session = await exchangeCodeForSession(event, code, existingSession?.refreshToken)
  setGoogleSessionCookie(event, session)

  return sendRedirect(event, '/?googleConnected=1')
})
