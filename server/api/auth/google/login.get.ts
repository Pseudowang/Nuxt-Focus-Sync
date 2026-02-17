import { sendRedirect } from 'h3'
import { createGoogleAuthUrl } from '~~/server/utils/googleAuth'

export default defineEventHandler((event) => {
  const authUrl = createGoogleAuthUrl(event)
  return sendRedirect(event, authUrl)
})
