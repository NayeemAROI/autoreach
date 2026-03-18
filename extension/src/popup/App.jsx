import { useState, useEffect } from 'preact/hooks'
import { MonitorSmartphone, ShieldCheck, ShieldAlert, Activity, User, Rocket, Key, CheckCircle2, Plug } from 'lucide-preact'

export function App() {
  const [sessionInfo, setSessionInfo] = useState({ state: 'checking' }) // checking, logged_in, logged_out
  const [wsStatus, setWsStatus] = useState('connecting') // connected, disconnected, connecting
  const [apiKey, setApiKey] = useState('')
  const [isSaved, setIsSaved] = useState(false)
  const [showManual, setShowManual] = useState(false)

  const handleSaveToken = () => {
    if (apiKey.trim()) {
      chrome.runtime.sendMessage({ type: 'TOKEN_UPDATED', token: apiKey.trim() });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      setWsStatus('connecting'); // Reset status to connecting after sending new token
      setShowManual(false); // Hide manual input after saving
    }
  }

  useEffect(() => {
    // 1. Check local session (cookies) by sending message to background
    const checkCookies = async () => {
      try {
        const cookies = await chrome.cookies.getAll({ domain: 'linkedin.com' })
        const hasLiAt = cookies.some(c => c.name === 'li_at')
        setSessionInfo({ state: hasLiAt ? 'logged_in' : 'logged_out' })
      } catch (e) {
        setSessionInfo({ state: 'error' })
      }
    }
    
    checkCookies()

    // 3. Status Polling Loop
    const pollStatus = () => {
      chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
        if (chrome.runtime.lastError) {
          // background might not be ready yet
          return;
        }
        if (res && res.wsStatus) {
          setWsStatus(res.wsStatus)
        } else {
          setWsStatus('disconnected')
        }
      })
    }
    
    pollStatus() // initial check
    const statusInterval = setInterval(pollStatus, 500)
    
    return () => clearInterval(statusInterval)
  }, [])

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-bg-surface to-bg-elevated flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold text-sm text-text-primary">Automation Bridge</h1>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-4">

        {/* Desktop App Status (replaces Backend Connect Status) */}
        <div className="glass-card p-4">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowManual(!showManual)}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                wsStatus === 'connected' ? 'bg-success/10' : 'bg-warning/10'
              }`}>
                <MonitorSmartphone className={`w-4 h-4 ${wsStatus === 'connected' ? 'text-success' : 'text-warning'}`} />
              </div>
              <div className="text-left leading-tight">
                <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  Desktop App
                  <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-success' : 'bg-warning animate-pulse'}`}></span>
                </p>
                <p className="text-[11px] text-text-muted capitalize">
                  {wsStatus === 'disconnected' ? 'Action Required' : wsStatus}
                </p>
              </div>
            </div>
            <Key className="w-4 h-4 text-text-secondary" />
          </div>

          {showManual && wsStatus !== 'connected' && (
            <div className="mt-3 p-3 bg-black/20 rounded border border-white/10 space-y-2">
              <label className="text-xs text-text-muted text-left block">Manual Auth Token (Fallback)</label>
              <div className="flex gap-2">
                <input 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste JWT Token from Dashboard"
                  className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-primary"
                />
                <button 
                  onClick={handleSaveToken}
                  className="bg-primary hover:bg-primary-hover text-white px-3 py-1 rounded text-xs transition-colors"
                >
                  {isSaved ? 'Saved' : 'Connect'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* LinkedIn Auth Status */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              sessionInfo.state === 'logged_in' ? 'bg-primary/10' : 'bg-danger/10'
            }`}>
              {sessionInfo.state === 'logged_in' ? (
                <ShieldCheck className="w-4 h-4 text-primary-light" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-danger" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">LinkedIn Session</h2>
              <p className={`text-[11px] mt-0.5 ${sessionInfo.state === 'logged_in' ? 'text-success' : 'text-danger'}`}>
                {sessionInfo.state === 'logged_in' ? 'Tokens extracted and synced' : 'Not logged in to LinkedIn'}
              </p>
            </div>
          </div>
          
          {sessionInfo.state === 'logged_in' ? (
            <div className="bg-bg-elevated rounded-lg p-3 flex items-center gap-3 border border-border mt-3">
              <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center">
                <User className="w-4 h-4 text-text-secondary" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-text-secondary">Session Active</p>
                <p className="text-[10px] text-text-muted mt-0.5">Ready for automation commands</p>
              </div>
            </div>
          ) : (
             <button className="w-full py-2 bg-primary/20 text-primary-light hover:bg-primary hover:text-white transition-colors text-xs font-semibold rounded-lg mt-3" 
               onClick={() => window.open('https://linkedin.com')}>
               Login to LinkedIn
             </button>
          )}
        </div>

        {/* Info */}
        <div className="bg-bg-surface border border-border/50 rounded-xl p-3 flex items-start gap-2.5">
          <Activity className="w-4 h-4 text-info mt-0.5 shrink-0" />
          <p className="text-[11px] text-text-muted leading-relaxed">
            Keep Chrome open to allow the desktop app to send connection requests and messages on your behalf.
          </p>
        </div>
      </div>
      
      {/* Footer */}
      <div className="py-2.5 bg-bg-surface border-t border-border text-center">
        <p className="text-[10px] text-text-muted font-medium">Running securely in background</p>
      </div>
    </div>
  )
}
