import { useState, useEffect } from 'react'
import { Rocket, ShieldCheck, ShieldAlert, MonitorSmartphone, Plug } from 'lucide-react'
import { apiFetch } from '../utils/api'

export default function Integrations() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

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
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [])

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
        <p className="text-sm text-text-muted mt-1">Connect your accounts to power your automations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* LinkedIn Extension Integration Card */}
        <div className="glass-card p-6 flex flex-col justify-between h-full border border-border/50 hover:border-primary/30 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#0077b5]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#0077b5]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                isConnected ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              }`}>
                {isConnected ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                {isConnected ? 'Connected' : 'Action Required'}
              </div>
            </div>
            
            <h2 className="text-lg font-bold text-text-primary">LinkedIn Account</h2>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              Connect your personal LinkedIn profile so AutoReach can automatically send requests, reply to messages, and sync your network.
            </p>
            
            {isConnected ? (
              <div className="mt-4 p-3 bg-bg-secondary rounded-lg border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {status.profileName.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">{status.profileName}</div>
                  <div className="text-xs text-success flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-success"></div> Active Session
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-bg-secondary rounded-lg border border-border border-dashed space-y-3">
                <div className="text-sm font-medium text-text-secondary flex items-start gap-2">
                  <MonitorSmartphone className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-text-primary">Desktop Extension Not Connected</span>
                    <span className="text-xs text-text-muted mt-1 block">Ensure the Chrome Extension is installed and you are logged into LinkedIn.</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-border/50 flex justify-between items-center">
                  <span className="text-xs text-text-muted">Need a manual connection?</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(localStorage.getItem('token') || '');
                      alert('Token copied! Paste it in the extension popup.');
                    }}
                    className="text-xs font-semibold text-primary hover:text-primary-light transition-colors"
                  >
                    Copy API Token
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t border-border">
            {!isConnected ? (
               <button 
                 onClick={() => window.open('https://linkedin.com', '_blank')}
                 className="w-full btn btn-primary flex justify-center items-center gap-2"
               >
                 <Plug className="w-4 h-4" /> Connect LinkedIn
               </button>
            ) : (
               <button 
                 disabled
                 className="w-full py-2 px-4 rounded-lg bg-success/10 text-success font-semibold text-sm flex justify-center items-center gap-2 cursor-default"
               >
                 Integration Active
               </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
