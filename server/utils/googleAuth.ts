import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { createError, getCookie, setCookie } from 'h3'

const GOOGLE_AUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'

const GOOGLE_SESSION_COOKIE = 'videpomo-google-session'
const GOOGLE_OAUTH_STATE_COOKIE = 'videpomo-google-oauth-state'

const ACCESS_TOKEN_TTL_BUFFER_MS = 60 * 1000

interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  token_type: string
}

export interface GoogleSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

const toBase64Url = (value: string) => Buffer.from(value, 'utf8').toString('base64url')

const signPayload = (payload: string, secret: string) => {
  const signature = createHmac('sha256', secret).update(payload).digest()
  return Buffer.from(signature).toString('base64url')
}

const createSignedValue = (payload: string, secret: string) => {
  return `${payload}.${signPayload(payload, secret)}`
}

const verifySignedValue = (signedValue: string, secret: string) => {
  const [payload, signature] = signedValue.split('.')
  if (!payload || !signature) return null

  const expected = signPayload(payload, secret)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (signatureBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null

  return payload
}

const getServerBaseUrl = (event: H3Event, runtimeConfig: ReturnType<typeof useRuntimeConfig>) => {
  if (runtimeConfig.appBaseUrl) return runtimeConfig.appBaseUrl

  const host = event.node.req.headers.host
  if (!host) {
    throw createError({ statusCode: 500, statusMessage: 'Cannot resolve app base URL' })
  }

  const protocol = host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https'
  return `${protocol}://${host}`
}

const getGoogleRedirectUri = (event: H3Event, runtimeConfig: ReturnType<typeof useRuntimeConfig>) => {
  if (runtimeConfig.googleRedirectUri) return runtimeConfig.googleRedirectUri
  return `${getServerBaseUrl(event, runtimeConfig)}/api/auth/google/callback`
}

export const getGoogleRuntimeConfig = (event: H3Event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const clientId = runtimeConfig.googleClientId
  const clientSecret = runtimeConfig.googleClientSecret
  const redirectUri = getGoogleRedirectUri(event, runtimeConfig)
  const scope = runtimeConfig.public.googleCalendarScope || 'https://www.googleapis.com/auth/calendar.events'

  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    })
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scope,
    calendarId: runtimeConfig.googleCalendarId || 'primary',
    sessionSecret: runtimeConfig.sessionSecret,
  }
}

export const createGoogleOauthState = (event: H3Event) => {
  const state = randomBytes(24).toString('hex')
  setCookie(event, GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
    path: '/',
  })

  return state
}

export const readGoogleOauthState = (event: H3Event) => {
  return getCookie(event, GOOGLE_OAUTH_STATE_COOKIE)
}

export const clearGoogleOauthState = (event: H3Event) => {
  setCookie(event, GOOGLE_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  })
}

export const createGoogleAuthUrl = (event: H3Event) => {
  const { clientId, redirectUri, scope } = getGoogleRuntimeConfig(event)
  const state = createGoogleOauthState(event)

  const url = new URL(GOOGLE_AUTH_BASE_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', `openid email profile ${scope}`)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  url.searchParams.set('include_granted_scopes', 'true')

  return url.toString()
}

const toGoogleSession = (tokens: GoogleTokenResponse, existingRefreshToken?: string): GoogleSession => {
  if (!tokens.access_token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing access token from Google' })
  }

  const refreshToken = tokens.refresh_token || existingRefreshToken
  if (!refreshToken) {
    throw createError({ statusCode: 401, statusMessage: 'Missing refresh token from Google' })
  }

  return {
    accessToken: tokens.access_token,
    refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000 - ACCESS_TOKEN_TTL_BUFFER_MS,
  }
}

export const exchangeCodeForSession = async (event: H3Event, code: string, existingRefreshToken?: string) => {
  const { clientId, clientSecret, redirectUri } = getGoogleRuntimeConfig(event)

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  })

  const raw = await response.text()
  if (!response.ok) {
    throw createError({ statusCode: response.status, statusMessage: `Failed to exchange code: ${raw}` })
  }

  return toGoogleSession(JSON.parse(raw) as GoogleTokenResponse, existingRefreshToken)
}

export const refreshGoogleSession = async (event: H3Event, session: GoogleSession) => {
  const { clientId, clientSecret } = getGoogleRuntimeConfig(event)

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: session.refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  })

  const raw = await response.text()
  if (!response.ok) {
    throw createError({ statusCode: response.status, statusMessage: `Failed to refresh token: ${raw}` })
  }

  return toGoogleSession(JSON.parse(raw) as GoogleTokenResponse, session.refreshToken)
}

export const setGoogleSessionCookie = (event: H3Event, session: GoogleSession) => {
  const { sessionSecret } = getGoogleRuntimeConfig(event)
  if (!sessionSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Missing SESSION_SECRET' })
  }

  const payload = toBase64Url(JSON.stringify(session))
  const signed = createSignedValue(payload, sessionSecret)

  setCookie(event, GOOGLE_SESSION_COOKIE, signed, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
}

export const clearGoogleSessionCookie = (event: H3Event) => {
  setCookie(event, GOOGLE_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  })
}

export const readGoogleSessionCookie = (event: H3Event): GoogleSession | null => {
  const { sessionSecret } = getGoogleRuntimeConfig(event)
  if (!sessionSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Missing SESSION_SECRET' })
  }

  const signed = getCookie(event, GOOGLE_SESSION_COOKIE)
  if (!signed) return null

  const payload = verifySignedValue(signed, sessionSecret)
  if (!payload) return null

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as GoogleSession
  } catch {
    return null
  }
}

export const getValidGoogleSession = async (event: H3Event) => {
  const session = readGoogleSessionCookie(event)
  if (!session) return null

  if (session.expiresAt > Date.now()) return session

  const refreshedSession = await refreshGoogleSession(event, session)
  setGoogleSessionCookie(event, refreshedSession)
  return refreshedSession
}

export const revokeGoogleToken = async (token: string) => {
  if (!token) return

  try {
    await fetch(GOOGLE_REVOKE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
    })
  } catch (error) {
    console.error('Failed to revoke Google token', error)
  }
}
