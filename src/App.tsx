import { useAuth, useUser, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'
import { useState, useCallback } from 'react'
import './App.css'

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1]
    const padded = part + '='.repeat((4 - (part.length % 4)) % 4)
    return JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')))
  } catch { return null }
}

function formatValue(key: string, value: unknown): string {
  if ((key === 'exp' || key === 'iat' || key === 'nbf') && typeof value === 'number') {
    return new Date(value * 1000).toLocaleString()
  }
  return JSON.stringify(value)
}

function getTTL(decoded: Record<string, unknown> | null): number | null {
  if (!decoded || typeof decoded.exp !== 'number') return null
  return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
}

function LandingView() {
  return (
    <div className="landing">
      <div className="glow" />
      <div className="landing-inner">
        <div className="hero-icon">🔑</div>
        <h1 className="landing-title">Clerk Token Generator</h1>
        <p className="landing-sub">
          Generate real Clerk JWT tokens instantly for API testing and Swagger UI.
        </p>
        <div className="btn-row">
          <SignInButton><button className="btn-primary">Sign in</button></SignInButton>
          <SignUpButton><button className="btn-secondary">Create account</button></SignUpButton>
        </div>
        <div className="chip-row">
          {['Real Clerk JWT', 'One-click copy', 'Decoded payload', 'Swagger ready'].map(f => (
            <span key={f} className="chip">{f}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function TokenGeneratorView() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [token, setToken] = useState<string | null>(null)
  const [decoded, setDecoded] = useState<Record<string, unknown> | null>(null)
  const [showDecoded, setShowDecoded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const t = await getToken({ skipCache: true })
      if (!t) throw new Error('No token returned.')
      setToken(t); setDecoded(decodePayload(t))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate token.')
    } finally { setLoading(false) }
  }, [getToken])

  const copy = useCallback(async () => {
    if (!token) return
    await navigator.clipboard.writeText(token)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }, [token])

  const ttl = getTTL(decoded)

  return (
    <div className="generator-wrap">
      <div className="card">
        <div className="card-header">
          <div className="card-title-row">
            <div className="card-icon">🔑</div>
            <div>
              <div className="card-title">Clerk Token Generator</div>
              <div className="card-email">{user?.primaryEmailAddress?.emailAddress}</div>
            </div>
          </div>
          {ttl !== null && (
            <span className={`ttl-badge ${ttl > 30 ? 'ttl-green' : 'ttl-amber'}`}>
              {ttl}s remaining
            </span>
          )}
        </div>

        <div className="card-body">
          <button onClick={generate} disabled={loading} className="btn-generate">
            {loading ? '⟳  Generating…' : token ? '↻  Regenerate Token' : '⚡  Generate Token'}
          </button>

          {error && <div className="error-box">✕ &nbsp;{error}</div>}

          {token && (
            <div className="token-box">
              <div className="token-toolbar">
                <div className="token-status">
                  <span className="status-dot" />
                  <span className="status-label">JWT Token</span>
                </div>
                <div className="toolbar-actions">
                  <button onClick={() => setShowDecoded(!showDecoded)} className="btn-ghost">
                    {showDecoded ? 'Hide payload' : 'Decode payload'}
                  </button>
                  <button onClick={copy} className={copied ? 'btn-copied' : 'btn-copy'}>
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="token-text-wrap">
                <p className="token-text">{token}</p>
              </div>

              {showDecoded && decoded && (
                <div className="decoded-box">
                  <p className="section-label">Payload</p>
                  {Object.entries(decoded).map(([key, value]) => (
                    <div key={key} className="decoded-row">
                      <span className="decoded-key">{key}</span>
                      <span className="decoded-val">{formatValue(key, value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {token && (
        <div className="usage-box">
          <p className="section-label">How to use</p>
          {[
            { label: 'Swagger UI', text: 'Click Authorize → paste as', code: 'Bearer <token>' },
            { label: 'curl', text: 'Add header', code: '-H "Authorization: Bearer <token>"' },
          ].map(({ label, text, code }) => (
            <div key={label} className="usage-row">
              <span className="label-chip">{label}</span>
              <p className="usage-text">{text} <code className="inline-code">{code}</code></p>
            </div>
          ))}
          <p className="usage-warn">⚠ Clerk tokens expire in ~60 seconds. Click Regenerate before it expires.</p>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="root">
      <header className="app-header">
        <span className="app-logo">Token Generator</span>
        <div className="header-actions">
          {!isSignedIn ? (
            <>
              <SignInButton><button className="btn-ghost-nav">Sign in</button></SignInButton>
              <SignUpButton><button className="btn-primary-sm">Sign up</button></SignUpButton>
            </>
          ) : <UserButton />}
        </div>
      </header>
      {isSignedIn ? <TokenGeneratorView /> : <LandingView />}
    </div>
  )
}
