import type { NextRequest } from 'next/server'
import { ChatClient } from 'dify-client'
import { v4 } from 'uuid'
import type { AppRecord } from '@/lib/apps/types'
import { BASE_PATH } from '@/config'

const createClient = (app: AppRecord) => new ChatClient(app.apiKey, app.apiUrl || undefined)
const clients = new Map<string, ReturnType<typeof createClient>>()

/**
 * One client per app (and per credential revision), so rotating a key in the
 * registry invalidates the cached instance.
 */
export const getClient = (app: AppRecord) => {
  const cacheKey = `${app.id}:${app.updatedAt}`
  const cached = clients.get(cacheKey)
  if (cached) { return cached }

  const client = createClient(app)
  clients.set(cacheKey, client)
  return client
}

export const getInfo = (request: NextRequest, app: AppRecord) => {
  const sessionId = request.cookies.get('session_id')?.value || v4()
  // Dify keeps conversations per `user`, so namespace it by app as well.
  const user = `user_${app.id}:${sessionId}`
  return {
    sessionId,
    user,
  }
}

/** Keeps the conversation cookie inside the sub-path, '/' when there is none. */
const COOKIE_PATH = BASE_PATH || '/'

export const setSession = (sessionId: string, app: AppRecord) => {
  if (app.disableSessionSameSite)
  { return { 'Set-Cookie': `session_id=${sessionId}; SameSite=None; Secure; Path=${COOKIE_PATH}` } }

  return { 'Set-Cookie': `session_id=${sessionId}; Path=${COOKIE_PATH}` }
}

export const appNotFound = () => new Response('App not found', { status: 404 })
