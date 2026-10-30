import { endpoints, LoginInput, RegisterInput, Session } from '@/contracts'
import { createSalt, hashPassword, verifyPassword } from '@/mocks/db/password'
import { getDb, nextId, persist } from '@/mocks/db/store'
import type { DbUser } from '@/mocks/db/types'
import { toUser } from '@/mocks/db/views'
import { fail, json, noContent, parseBody, requireUser, route, sessionToken } from '@/mocks/handlers/http'
import { activeScenario } from '@/mocks/scenarios'

function createSession(user: DbUser): Session {
  const db = getDb()
  const session = {
    token: crypto.randomUUID(),
    userId: user.id,
    expiresAt: Date.now() + activeScenario().sessionTtlMs,
  }
  db.sessions.push(session)
  persist()
  return { token: session.token, expiresAt: new Date(session.expiresAt).toISOString(), user: toUser(user) }
}

export const authHandlers = [
  route('POST', endpoints.auth.register, async ({ request }) => {
    const input = await parseBody(request, RegisterInput)
    const db = getDb()
    const fieldErrors: Record<string, string> = {}
    if (db.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
      fieldErrors.email = 'Este e-mail já está cadastrado.'
    }
    if (db.users.some((user) => user.username === input.username)) {
      fieldErrors.username = 'Este nome de usuário já está em uso.'
    }
    if (Object.keys(fieldErrors).length) throw fail.conflict('Já existe uma conta com estes dados.', fieldErrors)

    const salt = createSalt()
    const user: DbUser = {
      id: nextId('usr'),
      email: input.email,
      username: input.username,
      displayName: input.username,
      ensName: null,
      walletAlias: null,
      avatarUrl: null,
      passwordSalt: salt,
      passwordHash: await hashPassword(input.password, salt),
    }
    db.users.push(user)
    return json(Session, createSession(user), 201)
  }),

  route('POST', endpoints.auth.login, async ({ request }) => {
    const input = await parseBody(request, LoginInput)
    const user = getDb().users.find((candidate) => candidate.email.toLowerCase() === input.email.toLowerCase())
    if (!user || !(await verifyPassword(input.password, user.passwordSalt, user.passwordHash))) {
      throw fail.unauthorized('E-mail ou senha inválidos.')
    }
    return json(Session, createSession(user))
  }),

  route('GET', endpoints.auth.session, ({ request }) => {
    const user = requireUser(request)
    const session = getDb().sessions.find((candidate) => candidate.token === sessionToken(request))
    if (!session) throw fail.unauthorized()
    return json(Session, {
      token: session.token,
      expiresAt: new Date(session.expiresAt).toISOString(),
      user: toUser(user),
    })
  }),

  route('POST', endpoints.auth.logout, ({ request }) => {
    const db = getDb()
    db.sessions = db.sessions.filter((session) => session.token !== sessionToken(request))
    persist()
    return noContent()
  }),
]
