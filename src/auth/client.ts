const AUTH_TOKEN_KEY = 'todo-auth-token'

export interface AuthStatus {
  configured: boolean
  authenticated: boolean
}

export function getAuthToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem(AUTH_TOKEN_KEY)
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function clearAuthToken(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(AUTH_TOKEN_KEY)
}

async function readAuthResponse(response: Response): Promise<{ token?: string; error?: string }> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { error: typeof body.error === 'string' ? body.error : '请求失败' }
  }
  return body
}

function storeAuthToken(token: string): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(AUTH_TOKEN_KEY, token)
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const response = await fetch('/__auth/status', {
    headers: {
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
  })

  if (!response.ok) {
    throw new Error('无法读取登录状态')
  }

  return (await response.json()) as AuthStatus
}

export async function setupPassword(password: string): Promise<string | null> {
  const response = await fetch('/__auth/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const body = await readAuthResponse(response)
  if (body.error) return body.error
  if (body.token) storeAuthToken(body.token)
  return null
}

export async function loginWithPassword(password: string): Promise<string | null> {
  const response = await fetch('/__auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const body = await readAuthResponse(response)
  if (body.error) return body.error
  if (body.token) storeAuthToken(body.token)
  return null
}

export async function logout(): Promise<void> {
  await fetch('/__auth/logout', {
    method: 'POST',
    headers: getAuthHeaders(),
  }).catch(() => undefined)
  clearAuthToken()
}
