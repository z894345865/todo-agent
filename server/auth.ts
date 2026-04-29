import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname } from 'node:path'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const AUTH_VERSION = 1
const HASH_BYTES = 64
const MAX_PASSWORD_LENGTH = 128
const MIN_PASSWORD_LENGTH = 8
const MAX_BODY_BYTES = 16 * 1024
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

interface AuthFile {
  version: number
  salt: string
  passwordHash: string
}

interface AuthBody {
  password?: unknown
}

interface Session {
  createdAt: number
  lastSeenAt: number
}

export interface AuthStatus {
  configured: boolean
  authenticated: boolean
}

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): AuthFile {
  const passwordHash = scryptSync(password, salt, HASH_BYTES).toString('hex')
  return { version: AUTH_VERSION, salt, passwordHash }
}

export function verifyPassword(password: string, authFile: AuthFile): boolean {
  const expected = Buffer.from(authFile.passwordHash, 'hex')
  const actual = scryptSync(password, authFile.salt, expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return '请输入密码'
  if (password.length < MIN_PASSWORD_LENGTH) return `密码至少需要 ${MIN_PASSWORD_LENGTH} 个字符`
  if (password.length > MAX_PASSWORD_LENGTH) return `密码不能超过 ${MAX_PASSWORD_LENGTH} 个字符`
  return null
}

export function createAuthController(file: string) {
  let cachedAuth: AuthFile | null | undefined
  const sessions = new Map<string, Session>()

  async function readAuthFile(): Promise<AuthFile | null> {
    if (cachedAuth !== undefined) return cachedAuth

    try {
      const parsed = JSON.parse(await readFile(file, 'utf-8')) as Partial<AuthFile>
      if (
        parsed.version !== AUTH_VERSION ||
        typeof parsed.salt !== 'string' ||
        typeof parsed.passwordHash !== 'string'
      ) {
        cachedAuth = null
        return cachedAuth
      }
      cachedAuth = parsed as AuthFile
      return cachedAuth
    } catch {
      cachedAuth = null
      return cachedAuth
    }
  }

  async function writeAuthFile(authFile: AuthFile): Promise<void> {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, `${JSON.stringify(authFile, null, 2)}\n`, 'utf-8')
    cachedAuth = authFile
  }

  function json(res: ServerResponse<IncomingMessage>, statusCode: number, body: unknown): void {
    res.statusCode = statusCode
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }

  function createSession(): string {
    const token = randomBytes(32).toString('base64url')
    const now = Date.now()
    sessions.set(token, { createdAt: now, lastSeenAt: now })
    return token
  }

  function deleteExpiredSessions(): void {
    const now = Date.now()
    for (const [token, session] of sessions) {
      if (now - session.lastSeenAt > SESSION_TTL_MS) {
        sessions.delete(token)
      }
    }
  }

  function getBearerToken(req: IncomingMessage): string | null {
    const authorization = req.headers.authorization
    if (!authorization?.startsWith('Bearer ')) return null
    return authorization.slice('Bearer '.length).trim() || null
  }

  function isAuthenticated(req: IncomingMessage): boolean {
    deleteExpiredSessions()
    const token = getBearerToken(req)
    if (!token) return false
    const session = sessions.get(token)
    if (!session) return false
    session.lastSeenAt = Date.now()
    return true
  }

  async function readJsonBody(req: IncomingMessage): Promise<AuthBody> {
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.byteLength
      if (size > MAX_BODY_BYTES) {
        throw new Error('请求内容过大')
      }
      chunks.push(buffer)
    }

    if (chunks.length === 0) return {}
    const text = Buffer.concat(chunks).toString('utf-8')
    const parsed = JSON.parse(text) as AuthBody
    return parsed && typeof parsed === 'object' ? parsed : {}
  }

  async function handleStatus(req: IncomingMessage, res: ServerResponse<IncomingMessage>): Promise<void> {
    if (req.method !== 'GET') {
      json(res, 405, { error: 'Method not allowed' })
      return
    }

    const authFile = await readAuthFile()
    json(res, 200, { configured: Boolean(authFile), authenticated: Boolean(authFile) && isAuthenticated(req) })
  }

  async function handleSetup(req: IncomingMessage, res: ServerResponse<IncomingMessage>): Promise<void> {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' })
      return
    }

    if (await readAuthFile()) {
      json(res, 409, { error: '访问密码已经设置' })
      return
    }

    try {
      const body = await readJsonBody(req)
      const validationError = validatePassword(body.password)
      if (validationError) {
        json(res, 400, { error: validationError })
        return
      }

      await writeAuthFile(hashPassword(body.password as string))
      json(res, 200, { token: createSession() })
    } catch (error) {
      json(res, 400, { error: error instanceof Error ? error.message : '无法设置访问密码' })
    }
  }

  async function handleLogin(req: IncomingMessage, res: ServerResponse<IncomingMessage>): Promise<void> {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' })
      return
    }

    const authFile = await readAuthFile()
    if (!authFile) {
      json(res, 409, { error: '请先设置访问密码' })
      return
    }

    try {
      const body = await readJsonBody(req)
      if (typeof body.password !== 'string' || !verifyPassword(body.password, authFile)) {
        json(res, 401, { error: '密码不正确' })
        return
      }

      json(res, 200, { token: createSession() })
    } catch {
      json(res, 400, { error: '无法登录' })
    }
  }

  async function handleLogout(req: IncomingMessage, res: ServerResponse<IncomingMessage>): Promise<void> {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' })
      return
    }

    const token = getBearerToken(req)
    if (token) sessions.delete(token)
    res.statusCode = 204
    res.end()
  }

  async function requireAuth(req: IncomingMessage, res: ServerResponse<IncomingMessage>): Promise<boolean> {
    const authFile = await readAuthFile()
    if (!authFile) {
      json(res, 401, { error: 'Password setup required' })
      return false
    }

    if (!isAuthenticated(req)) {
      json(res, 401, { error: 'Unauthorized' })
      return false
    }

    return true
  }

  return {
    handleLogin,
    handleLogout,
    handleSetup,
    handleStatus,
    requireAuth,
  }
}
