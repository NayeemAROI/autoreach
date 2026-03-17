import { useState, useEffect } from 'preact/hooks'
import './app.css'

export function App() {
  const [token, setToken] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    chrome.storage.local.get(['outreach_token'], (res) => {
      if (res.outreach_token) {
        setToken(res.outreach_token)
      }
    })
  }, [])

  const saveToken = () => {
    chrome.storage.local.set({ outreach_token: token }, () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      // notify background script
      chrome.runtime.sendMessage({ type: 'TOKEN_UPDATED' })
    })
  }

  return (
    <div style={{ padding: '20px', width: '320px', fontFamily: 'system-ui', background: '#0a0a0f', color: '#fff', margin: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <div style={{ width: '36px', height: '36px', background: 'linear-gradient(to bottom right, #6366f1, #8b5cf6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><path d="M20 12h-4v-4"/><path d="M4 16v4h4"/><path d="M16 20v-4h4"/><path d="m9 15-4 4"/><path d="m15 9 4-4"/><path d="m9 9-4-4"/><path d="m15 15 4 4"/></svg>
        </div>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Outreach Node</h2>
      </div>
      
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '20px', lineHeight: '1.5' }}>
        Connect this browser to your local dashboard by pasting your API Key from the settings page.
      </p>
      
      <div style={{ marginBottom: '15px' }}>
        <input 
          type="password"
          value={token}
          onInput={(e) => setToken(e.target.value)}
          placeholder="Paste your API Key here"
          style={{ 
            width: '100%', boxSizing: 'border-box', padding: '12px', 
            background: '#1e1e2e', border: '1px solid #31314e', 
            color: '#fff', borderRadius: '8px', outline: 'none',
            fontSize: '13px'
          }}
        />
      </div>
      
      <button 
        onClick={saveToken}
        style={{ 
          width: '100%', padding: '12px', background: '#6366f1', 
          color: 'white', border: 'none', borderRadius: '8px', 
          cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
          boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
          transition: 'all 0.2s ease',
          opacity: saved ? 0.8 : 1
        }}
      >
        {saved ? '✓ Connected & Saved!' : 'Connect to Dashboard'}
      </button>

      <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#6b7280' }}>
        <span>Status: {token ? <span style={{color: '#10b981', fontWeight: 'bold'}}>Active</span> : <span style={{color: '#ef4444', fontWeight: 'bold'}}>Disconnected</span>}</span>
        <span>Local Execution</span>
      </div>
    </div>
  )
}
