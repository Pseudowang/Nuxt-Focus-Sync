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

  if (!summary || !startAt || !endAt) {
    throw createError({ statusCode: 400, statusMessage: 'summary, startAt, and endAt are required' })
  }

  const session = await getValidGoogleSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Google account is not connected' })
  }

  const { calendarId } = getGoogleRuntimeConfig(event)

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
    throw createError({ statusCode: response.status, statusMessage: `Google Calendar API error: ${raw}` })
  }

  try {
    const data = JSON.parse(raw) as { id?: string; htmlLink?: string }
    return {
      ok: true,
      id: data.id,
      htmlLink: data.htmlLink,
    }
  } catch {
    return { ok: true }
  }
})
