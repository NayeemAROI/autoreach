import { useState, useEffect } from 'react'
import { ShieldCheck, ShieldAlert, Key, RefreshCw, Unplug, CheckCircle2, AlertCircle, Loader2, MessageSquare, HelpCircle } from 'lucide-react'
import { apiFetch } from '../utils/api'

export default function Integrations() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cookieInput, setCookieInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success'|'error', text: '' }
  const [showHelp, setShowHelp] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await apiFetch('/api/integrations/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Failed to fetch integration status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleConnect = async () => {
    if (!cookieInput.trim()) {
      setMessage({ type: 'error', text: 'Please paste your li_at cookie value.' })
      return
    }
    setConnecting(true)
    setMessage(null)
    try {
      const res = await apiFetch('/api/integrations/connect-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ li_at: cookieInput.trim() })
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
        setCookieInput('')
        fetchStatus()
      } else {
        setMessage({ type: 'error', text: data.error || 'Connection failed.' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Is the server running?' })
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await apiFetch('/api/integrations/disconnect', { method: 'POST' })
      setMessage({ type: 'success', text: 'LinkedIn disconnected.' })
      fetchStatus()
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to disconnect.' })
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setMessage(null)
    try {
      const res = await apiFetch('/api/integrations/sync-inbox', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed.' })
        if (res.status === 401) fetchStatus() // Cookie expired, refresh status
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error during sync.' })
    } finally {
      setSyncing(false)
    }
  }

  if (loading && !status) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const isConnected = status?.connected

  return (
    <div className="space-y-6 w-full max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Integrations</h1>
        <p className="text-sm text-text-muted mt-1">Connect your LinkedIn account to sync messages and automate outreach</p>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-success/5 border-success/30 text-success' : 'bg-error/5 border-error/30 text-error'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* LinkedIn Connection Card */}
      <div className="glass-card p-6 border border-border/50">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0077b5]/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#0077b5]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">LinkedIn Account</h2>
              <p className="text-xs text-text-muted">{status?.method === 'unipile' ? 'Connected via Unipile API' : 'Server-side connection'}</p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
            isConnected ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
          }`}>
            {isConnected ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            {isConnected ? 'Connected' : 'Not Connected'}
          </div>
        </div>

        {isConnected ? (
          /* Connected State */
          <div className="space-y-4">
            <div className="p-4 bg-bg-secondary rounded-lg border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0077b5]/20 flex items-center justify-center text-[#0077b5] font-bold text-lg">
                  {status.profileName?.charAt(0) || 'L'}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">{status.profileName}</div>
                  <div className="text-xs text-success flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                    {status.method === 'unipile' ? 'Unipile API' : 'Active Session'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-xs text-text-muted hover:text-error transition-colors flex items-center gap-1"
              >
                <Unplug className="w-3.5 h-3.5" /> Disconnect
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex-1 btn btn-primary flex justify-center items-center gap-2"
              >
                {syncing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Syncing Messages...</>
                ) : (
                  <><MessageSquare className="w-4 h-4" /> Sync Inbox Now</>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Cookie Input State */
          <div className="space-y-4">
            <div className="p-4 bg-bg-secondary rounded-lg border border-border/50">
              <label className="block text-sm font-semibold text-text-primary mb-2">
                <Key className="w-4 h-4 inline mr-1.5 text-primary" />
                LinkedIn Session Cookie (li_at)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Paste your li_at cookie value here..."
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-bg-primary rounded-lg border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={handleConnect}
                  disabled={connecting || !cookieInput.trim()}
                  className="btn btn-primary px-5 flex items-center gap-2 disabled:opacity-50"
                >
                  {connecting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Validating...</>
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
            </div>

            {/* How-to guide */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary-light transition-colors"
            >
              <HelpCircle className="w-4 h-4" /> 
              {showHelp ? 'Hide instructions' : 'How to get your li_at cookie'}
            </button>

            {showHelp && (
              <div className="p-4 bg-bg-secondary/50 rounded-lg border border-primary/20 space-y-3 text-sm text-text-secondary">
                <p className="font-semibold text-text-primary">Follow these steps:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Open <strong>LinkedIn.com</strong> in Chrome and make sure you're logged in</li>
                  <li>Press <kbd className="px-1.5 py-0.5 bg-bg-primary rounded border border-border text-xs font-mono">F12</kbd> to open DevTools</li>
                  <li>Go to the <strong>Application</strong> tab (or <strong>Storage</strong> tab in Firefox)</li>
                  <li>In the left sidebar, expand <strong>Cookies</strong> → click <strong>https://www.linkedin.com</strong></li>
                  <li>Find the cookie named <strong>li_at</strong></li>
                  <li>Double-click the <strong>Value</strong> column and copy it</li>
                  <li>Paste it in the input above and click <strong>Connect</strong></li>
                </ol>
                <div className="mt-3 p-2.5 bg-warning/5 border border-warning/20 rounded-lg text-warning text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Your cookie is stored securely on your local server only. It expires when you log out of LinkedIn or after ~1 year.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
