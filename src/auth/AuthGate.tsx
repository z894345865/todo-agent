import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { fetchAuthStatus, loginWithPassword, logout, setupPassword } from './client.ts'

interface AuthGateProps {
  children: ReactNode
}

type AuthMode = 'checking' | 'setup' | 'login' | 'authenticated' | 'unavailable'

export function AuthGate({ children }: AuthGateProps) {
  const skipAuth = isTauri()
  const [mode, setMode] = useState<AuthMode>(skipAuth ? 'authenticated' : 'checking')

  useEffect(() => {
    if (skipAuth) return

    let cancelled = false
    async function refreshStatus() {
      try {
        const status = await fetchAuthStatus()
        if (cancelled) return
        if (!status.configured) {
          setMode('setup')
          return
        }
        setMode(status.authenticated ? 'authenticated' : 'login')
      } catch {
        if (!cancelled) setMode('unavailable')
      }
    }

    void refreshStatus()
    return () => {
      cancelled = true
    }
  }, [skipAuth])

  if (mode === 'authenticated') {
    return (
      <>
        {skipAuth ? null : (
          <button
            className="auth-logout-button"
            type="button"
            onClick={() => {
              void logout().finally(() => setMode('login'))
            }}
          >
            退出登录
          </button>
        )}
        {children}
      </>
    )
  }

  if (mode === 'checking') {
    return <AuthShell title="正在检查访问权限" description="正在连接本地 TODO 服务..." />
  }

  if (mode === 'unavailable') {
    return (
      <AuthShell
        title="认证服务不可用"
        description="请确认开发服务器已经重启，并且当前访问的是 Vite 服务地址。"
      />
    )
  }

  return (
    <PasswordForm
      mode={mode}
      onAuthenticated={() => setMode('authenticated')}
    />
  )
}

function PasswordForm({ mode, onAuthenticated }: { mode: 'setup' | 'login'; onAuthenticated: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isSetup = mode === 'setup'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (isSetup && password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setSubmitting(true)
    try {
      const requestError = isSetup ? await setupPassword(password) : await loginWithPassword(password)
      if (requestError) {
        setError(requestError)
        return
      }
      onAuthenticated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title={isSetup ? '设置访问密码' : '输入访问密码'}
      description={isSetup ? '首次启用内网访问保护，密码会以哈希形式保存在本机。' : '登录后才能读取和修改 TODO 数据。'}
    >
      <form className="auth-card__form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>密码</span>
          <input
            autoFocus
            minLength={isSetup ? 8 : undefined}
            maxLength={128}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {isSetup ? (
          <label className="auth-field">
            <span>确认密码</span>
            <input
              minLength={8}
              maxLength={128}
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
        ) : null}

        {error ? <p className="auth-card__error">{error}</p> : null}

        <button className="auth-card__submit" type="submit" disabled={submitting}>
          {submitting ? '处理中...' : isSetup ? '启用保护' : '登录'}
        </button>
      </form>
    </AuthShell>
  )
}

function AuthShell({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-card__mark">TODO</div>
        <h1 id="auth-title">{title}</h1>
        <p>{description}</p>
        {children}
      </section>
    </main>
  )
}
