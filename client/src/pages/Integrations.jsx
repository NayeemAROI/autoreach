import { useState, useEffect, useRef } from 'react'
import { ShieldCheck, ShieldAlert, Key, RefreshCw, Unplug, CheckCircle2, AlertCircle, Loader2, MessageSquare, HelpCircle, Mail, Lock, Shield, Clock, Globe, ChevronDown } from 'lucide-react'
import { apiFetch } from '../utils/api'

export default function Integrations() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState(null)

  // LinkedIn login form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [proxyCountry, setProxyCountry] = useState('bd')

  // 2FA / Checkpoint
  const [checkpoint, setCheckpoint] = useState(null) // { accountId, type, message }
  const [otpCode, setOtpCode] = useState('')
  const [solvingOtp, setSolvingOtp] = useState(false)

  // Cookie fallback
  const [showCookieInput, setShowCookieInput] = useState(false)
  const [cookieInput, setCookieInput] = useState('')

  // Connection phase: 'idle' | 'connecting' | 'connected'
  const [connectionPhase, setConnectionPhase] = useState('idle')
  
  // Countdown timer for verification (5 min timeout)
  const [countdown, setCountdown] = useState(0)
  const countdownRef = useRef(null)

  const fetchStatus = async () => {
    try {
      const res = await apiFetch('/api/integrations/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
        if (data.connected) {
          setConnectionPhase('connected')
          setCheckpoint(null)
        }
      }
    } catch (err) {
      console.error('Failed to fetch integration status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000) // Reduced to 10s, SSE handles real-time
    return () => clearInterval(interval)
  }, [])

  // SSE connection for real-time webhook updates
  useEffect(() => {
    let eventSource = null
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      const baseUrl = import.meta.env.VITE_API_URL || ''
      eventSource = new EventSource(`${baseUrl}/api/integrations/status-stream?token=${token}`)
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'ping') return
          
          console.log('[SSE] Webhook event:', data)
          
          if (data.type === 'connected') {
            setConnectionPhase('connected')
            setCheckpoint(null)
            setConnecting(false)
            setMessage({ type: 'success', text: data.message || 'LinkedIn connected!' })
            fetchStatus()
            // Clear countdown
            if (countdownRef.current) clearInterval(countdownRef.current)
          } else if (data.type === 'connecting') {
            setConnectionPhase('connecting')
          } else if (data.type === 'checkpoint') {
            setConnectionPhase('idle')
            setConnecting(false)
            setCheckpoint({ 
              accountId: data.accountId, 
              type: data.checkpointType || '2FA', 
              message: data.message 
            })
            setMessage({ type: 'info', text: data.message })
            // Start 5-minute countdown
            setCountdown(300)
            if (countdownRef.current) clearInterval(countdownRef.current)
            countdownRef.current = setInterval(() => {
              setCountdown(prev => {
                if (prev <= 1) {
                  clearInterval(countdownRef.current)
                  return 0
                }
                return prev - 1
              })
            }, 1000)
          } else if (data.type === 'error') {
            setConnectionPhase('idle')
            setConnecting(false)
            setMessage({ type: 'error', text: data.message })
          } else if (data.type === 'disconnected') {
            setConnectionPhase('idle')
            setStatus(null)
            setMessage({ type: 'info', text: data.message })
            fetchStatus()
          }
        } catch {}
      }
      
      eventSource.onerror = () => {
        // SSE will auto-reconnect
      }
    } catch {}
    
    return () => {
      if (eventSource) eventSource.close()
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  const handleLinkedInLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage({ type: 'error', text: 'Please enter your LinkedIn email and password.' })
      return
    }
    setConnecting(true)
    setConnectionPhase('connecting')
    setMessage(null)
    setCheckpoint(null)
    try {
      const res = await apiFetch('/api/integrations/connect-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email.trim(), password: password.trim(), proxyCountry })
      })
      const data = await res.json()
      
      if (data.checkpoint) {
        // 2FA required
        setConnectionPhase('idle')
        setCheckpoint({ accountId: data.accountId, type: data.type, message: data.message })
        setMessage({ type: 'info', text: data.message || 'LinkedIn requires verification. Please enter the code.' })
        // Start 5-minute countdown
        setCountdown(300)
        if (countdownRef.current) clearInterval(countdownRef.current)
        countdownRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) { clearInterval(countdownRef.current); return 0 }
            return prev - 1
          })
        }, 1000)
      } else if (res.ok && data.success) {
        setConnectionPhase('connected')
        setMessage({ type: 'success', text: data.message })
        setEmail('')
        setPassword('')
        fetchStatus()
      } else {
        // Login failed — auto-show cookie input as fallback
        setConnectionPhase('idle')
        setShowCookieInput(true)
        setMessage({ type: 'error', text: (data.error || 'Login failed.') + ' Use the li_at cookie method below instead — it\'s more reliable.' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Is the server running?' })
    } finally {
      setConnecting(false)
    }
  }

  const handleSolveCheckpoint = async () => {
    if (!otpCode.trim()) {
      setMessage({ type: 'error', text: 'Please enter the verification code.' })
      return
    }
    setSolvingOtp(true)
    setMessage(null)
    try {
      const res = await apiFetch('/api/integrations/solve-checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: checkpoint.accountId, code: otpCode.trim() })
      })
      const data = await res.json()

      if (data.checkpoint) {
        // More verification needed
        setCheckpoint(prev => ({ ...prev, type: data.type, message: data.message }))
        setMessage({ type: 'info', text: data.message || 'Additional verification required.' })
        setOtpCode('')
      } else if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message || 'LinkedIn connected!' })
        setCheckpoint(null)
        setOtpCode('')
        setEmail('')
        setPassword('')
        fetchStatus()
      } else {
        // Checkpoint expired or failed — go back to login
        setMessage({ type: 'error', text: (data.error || 'Verification failed.') + ' Please login again.' })
        setCheckpoint(null)
        setOtpCode('')
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error during verification.' })
    } finally {
      setSolvingOtp(false)
    }
  }

  const handleCookieConnect = async () => {
    if (!cookieInput.trim()) return
    setConnecting(true)
    setMessage(null)
    try {
      const res = await apiFetch('/api/integrations/connect-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ li_at: cookieInput.trim(), proxyCountry })
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
      setMessage({ type: 'error', text: 'Network error.' })
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
          message.type === 'success' ? 'bg-success/5 border-success/30 text-success' 
          : message.type === 'info' ? 'bg-primary/5 border-primary/30 text-primary'
          : 'bg-error/5 border-error/30 text-error'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> 
           : message.type === 'info' ? <Shield className="w-5 h-5 shrink-0 mt-0.5" />
           : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
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
              <p className="text-xs text-text-muted">{status?.method === 'unipile' ? 'Connected via Unipile API' : 'Secure server-side connection'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLoading(true); fetchStatus() }}
              className="p-1.5 rounded-lg hover:bg-bg-secondary transition-colors text-text-muted hover:text-text-primary"
              title="Refresh connection status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              isConnected ? 'bg-success/10 text-success' 
              : connectionPhase === 'connecting' ? 'bg-primary/10 text-primary'
              : 'bg-warning/10 text-warning'
            }`}>
              {isConnected ? <ShieldCheck className="w-3.5 h-3.5" /> 
               : connectionPhase === 'connecting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
               : <ShieldAlert className="w-3.5 h-3.5" />}
              {isConnected ? 'Connected' : connectionPhase === 'connecting' ? 'Connecting...' : 'Not Connected'}
            </div>
          </div>
        </div>

        {connectionPhase === 'connecting' && !isConnected && !checkpoint ? (
          /* Connecting State */
          <div className="space-y-4">
            <div className="p-6 bg-bg-secondary rounded-lg border border-primary/20 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Connecting to LinkedIn...</h3>
              <p className="text-sm text-text-muted mb-4">We're setting up your connection. This may take a moment.</p>
              <div className="flex items-center justify-center gap-6 text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>Credentials sent</span>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span>Verifying with LinkedIn</span>
                </div>
              </div>
            </div>
          </div>
        ) : isConnected ? (
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
        ) : checkpoint ? (
          /* 2FA / Checkpoint State */
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-text-primary">Verification Required</span>
              </div>
              <p className="text-sm text-text-secondary mb-3">{checkpoint.message || 'LinkedIn sent a verification code. Please enter it below.'}</p>
              {countdown > 0 && (
                <div className="flex items-center gap-2 mb-3 text-xs text-warning">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Code expires in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
                </div>
              )}
              {countdown === 0 && countdown !== null && (
                <div className="flex items-center gap-2 mb-3 text-xs text-error">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Verification timed out. Please try again.</span>
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter verification code..."
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSolveCheckpoint()}
                  className="flex-1 px-3 py-2.5 bg-bg-primary rounded-lg border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors text-center tracking-widest font-mono text-lg"
                  autoFocus
                />
                <button
                  data-verify-btn
                  onClick={handleSolveCheckpoint}
                  disabled={solvingOtp || !otpCode.trim()}
                  className="btn btn-primary px-5 flex items-center gap-2 disabled:opacity-50"
                >
                  {solvingOtp ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-text-muted">or</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              <button
                onClick={async () => {
                  setSolvingOtp(true)
                  setMessage({ type: 'info', text: 'Checking approval status...' })
                  try {
                    const res = await apiFetch('/api/integrations/status')
                    const data = await res.json()
                    if (data.connected) {
                      setMessage({ type: 'success', text: 'LinkedIn connected!' })
                      setCheckpoint(null)
                      fetchStatus()
                    } else {
                      setMessage({ type: 'info', text: 'Not approved yet. Please approve on your phone and try again.' })
                    }
                  } catch { setMessage({ type: 'error', text: 'Network error.' }) }
                  finally { setSolvingOtp(false) }
                }}
                disabled={solvingOtp}
                className="w-full py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
              >
                📱 I approved on my phone
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={async () => {
                  setSolvingOtp(true)
                  setMessage(null)
                  try {
                    const res = await apiFetch('/api/integrations/solve-checkpoint', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ accountId: checkpoint.accountId, code: 'TRY_ANOTHER_WAY' })
                    })
                    const data = await res.json()
                    if (data.checkpoint) {
                      setCheckpoint(prev => ({ ...prev, type: data.type, message: data.message }))
                      setMessage({ type: 'info', text: data.message || 'Check your email for a verification code.' })
                    } else if (data.success) {
                      setMessage({ type: 'success', text: 'Connected!' })
                      setCheckpoint(null)
                      fetchStatus()
                    } else {
                      setMessage({ type: 'error', text: data.error || 'Failed to switch method.' })
                    }
                  } catch { setMessage({ type: 'error', text: 'Network error.' }) }
                  finally { setSolvingOtp(false) }
                }}
                disabled={solvingOtp}
                className="text-xs text-primary hover:text-primary-light transition-colors flex items-center gap-1"
              >
                <Mail className="w-3.5 h-3.5" /> Try another way (email)
              </button>
              <span className="text-border">|</span>
              <button
                onClick={() => { setCheckpoint(null); setMessage(null) }}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                ← Back to login
              </button>
            </div>
          </div>
        ) : (
          /* Login Form */
          <div className="space-y-4">
            <div className="p-4 bg-bg-secondary rounded-lg border border-border/50 space-y-3">
              <p className="text-xs text-text-muted mb-1">Sign in with your LinkedIn credentials</p>
              
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  placeholder="LinkedIn email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-bg-primary rounded-lg border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  placeholder="LinkedIn password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLinkedInLogin()}
                  className="w-full pl-10 pr-3 py-2.5 bg-bg-primary rounded-lg border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <select
                  value={proxyCountry}
                  onChange={(e) => setProxyCountry(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-bg-primary rounded-lg border border-border text-sm text-text-primary focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                >
                  <option value="bd">Bangladesh (BD)</option>
                  <option value="us">United States (US)</option>
                  <option value="gb">United Kingdom (GB)</option>
                  <option value="ca">Canada (CA)</option>
                  <option value="au">Australia (AU)</option>
                  <option value="in">India (IN)</option>
                  <option value="sg">Singapore (SG)</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>

              <button
                onClick={handleLinkedInLogin}
                disabled={connecting || !email.trim() || !password.trim()}
                className="w-full btn btn-primary py-2.5 flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {connecting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                ) : (
                  <><ShieldCheck className="w-4 h-4" /> Connect LinkedIn</>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-xs text-text-muted">or</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <button
              onClick={() => setShowCookieInput(!showCookieInput)}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              <Key className="w-4 h-4" />
              {showCookieInput ? 'Hide cookie input' : 'Connect with li_at cookie instead'}
            </button>

            {showCookieInput && (
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
                  <div className="relative w-[130px] shrink-0">
                    <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <select
                      value={proxyCountry}
                      onChange={(e) => setProxyCountry(e.target.value)}
                      className="w-full h-full pl-8 pr-7 py-2.5 bg-bg-primary rounded-lg border border-border text-sm text-text-primary focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                    >
                      <option value="bd">BD Proxy</option>
                      <option value="us">US Proxy</option>
                      <option value="gb">UK Proxy</option>
                      <option value="in">IN Proxy</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                  <button
                    onClick={handleCookieConnect}
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
            )}

            <div className="p-3 bg-bg-secondary/50 rounded-lg border border-border/30 text-xs text-text-muted flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-primary/60" />
              <span>Your credentials are securely sent to the Unipile API for authentication. We never store your password.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
