import { useState, useEffect } from 'preact/hooks'
import { MonitorSmartphone, ShieldCheck, ShieldAlert, Activity, User, Rocket, Key, CheckCircle2 } from 'lucide-preact'

export function App() {
  const [sessionInfo, setSessionInfo] = useState({ state: 'checking' }) // checking, logged_in, logged_out
  const [wsStatus, setWsStatus] = useState('connecting') // connected, disconnected, connecting
  const [apiKey, setApiKey] = useState('')
  const [isSaved, setIsSaved] = useState(false)

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

    // 2. Load API Key
    chrome.storage.local.get(['outreach_token'], (res) => {
      if (res.outreach_token) {
        setApiKey(res.outreach_token)
      }
    })

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

  const handleSaveApiKey = () => {
    chrome.storage.local.set({ outreach_token: apiKey }, () => {
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
      
      // Notify background script to reconnect
      chrome.runtime.sendMessage({ type: 'TOKEN_UPDATED' })
    })
  }

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
        {/* API Connection */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="w-4 h-4 text-primary-light" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">API Connection</h2>
              <p className="text-[11px] text-text-muted mt-0.5">Enter your token to connect</p>
            </div>
          </div>
          <div className="space-y-2">
            <input 
              type="password" 
              placeholder="Paste your API Token here..." 
              value={apiKey}
              onInput={(e) => setApiKey(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
            <button 
              onClick={handleSaveApiKey}
              className="w-full py-2 bg-primary/20 hover:bg-primary text-primary-light hover:text-white transition-colors text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved & Connected!
                </>
              ) : 'Save & Connect'}
            </button>
          </div>
        </div>

        {/* Backend Connect Status */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              wsStatus === 'connected' ? 'bg-success/10' : 'bg-warning/10'
            }`}>
              <MonitorSmartphone className={`w-4 h-4 ${wsStatus === 'connected' ? 'text-success' : 'text-warning'}`} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Desktop App</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-success animate-pulse' : 'bg-warning'}`}></div>
                <p className="text-[11px] text-text-muted capitalize">{wsStatus}</p>
              </div>
            </div>
          </div>
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
