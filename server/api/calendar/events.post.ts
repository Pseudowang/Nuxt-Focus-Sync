import { createError, readBody } from 'h3'
import { getValidGoogleSession, getGoogleRuntimeConfig } from '~~/server/utils/googleAuth'

interface CreateCalendarEventBody {
  summary?: string
  description?: string
  startAt?: string
  endAt?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateCalendarEventBody>(event)
  const summary = body?.summary?.trim()
  const startAt = body?.startAt
  const endAt = body?.endAt

  console.log('[calendar/events.post] Received request:', { summary, startAt, endAt })

  if (!summary || !startAt || !endAt) {
    throw createError({ statusCode: 400, statusMessage: 'summary, startAt, and endAt are required' })
  }

  const session = await getValidGoogleSession(event)
  if (!session) {
    console.warn('[calendar/events.post] No valid Google session found')
    throw createError({ statusCode: 401, statusMessage: 'Google account is not connected' })
  }

  console.log('[calendar/events.post] Valid session found for user:', session.user.email)

  const { calendarId } = getGoogleRuntimeConfig(event)
  console.log('[calendar/events.post] Target calendar ID:', calendarId)

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary,
      description: body?.description || 'Created by videPomo.',
      start: { dateTime: startAt },
      end: { dateTime: endAt },
    }),
  })

  const raw = await response.text()
  if (!response.ok) {
    console.error('[calendar/events.post] Google Calendar API error:', raw)
    throw createError({ statusCode: response.status, statusMessage: `Google Calendar API error: ${raw}` })
  }

  try {
    const data = JSON.parse(raw) as { id?: string; htmlLink?: string }
    console.log('[calendar/events.post] Event created successfully:', { id: data.id, htmlLink: data.htmlLink })
    return {
      ok: true,
      id: data.id,
      htmlLink: data.htmlLink,
    }
  } catch {
    return { ok: true }
  }
})
