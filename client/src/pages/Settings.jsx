import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon, ShieldAlert, Clock,
  Globe, UserX, Save, Activity, ShieldCheck, Key, Mail
} from 'lucide-react'
import { apiFetch } from '../utils/api'

export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  useEffect(() => {
    apiFetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error("Error loading settings:", err))
  }, [])

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (res.ok) {
        showToast('Settings saved successfully', 'success')
      } else {
        showToast('Failed to save settings', 'error')
      }
    } catch (err) {
      showToast('Error saving settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const showToast = (message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  if (!settings) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  const isWarmupOn = settings.warmupMode === 'true'

  return (
    <div className="space-y-6 w-full mb-20 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-fade-in ${
          toast.type === 'success' ? 'bg-success/20 text-success border border-success/30' : 'bg-danger/20 text-danger border border-danger/30'
        }`}>
          {toast.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-sm text-text-muted mt-1">Configure automation limits and safety rules</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Settings) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Daily Limits */}
          <section className="glass-card p-6 animate-fade-in animate-fade-in-delay-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-info" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Daily Automation Limits</h2>
                <p className="text-sm text-text-muted">Maximum actions per day</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-text-secondary">Connection Requests</label>
                  <span className="text-sm font-bold text-primary-light">{settings.dailyConnectionLimit} / day</span>
                </div>
                <input 
                  type="range" 
                  min="5" max="100" step="5"
                  className="w-full accent-primary h-2 bg-bg-elevated rounded-lg appearance-none cursor-pointer"
                  value={settings.dailyConnectionLimit}
                  onChange={(e) => handleChange('dailyConnectionLimit', e.target.value)}
                />
                <div className="flex justify-between text-xs text-text-muted mt-2">
                  <span>Safe (5)</span>
                  <span className="text-warning">High Risk (100)</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-text-secondary">Direct Messages</label>
                  <span className="text-sm font-bold text-accent-light">{settings.dailyMessageLimit} / day</span>
                </div>
                <input 
                  type="range" 
                  min="10" max="150" step="10"
                  className="w-full accent-accent h-2 bg-bg-elevated rounded-lg appearance-none cursor-pointer"
                  value={settings.dailyMessageLimit}
                  onChange={(e) => handleChange('dailyMessageLimit', e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-text-secondary">Emails</label>
                  <span className="text-sm font-bold text-info">{settings.dailyEmailLimit} / day</span>
                </div>
                <input 
                  type="range" 
                  min="50" max="500" step="50"
                  className="w-full accent-info h-2 bg-bg-elevated rounded-lg appearance-none cursor-pointer"
                  value={settings.dailyEmailLimit}
                  onChange={(e) => handleChange('dailyEmailLimit', e.target.value)}
                />
                <p className="text-xs text-text-muted mt-2">Gmail limit is 500/day. Keep below 200 for best deliverability.</p>
              </div>
            </div>
          </section>

          {/* Working Hours */}
          <section className="glass-card p-6 animate-fade-in animate-fade-in-delay-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Working Hours</h2>
                <p className="text-sm text-text-muted">When should automation run?</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Start Time</label>
                <input 
                  type="time" 
                  className="input" 
                  value={settings.workingHoursStart}
                  onChange={(e) => handleChange('workingHoursStart', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">End Time</label>
                <input 
                  type="time" 
                  className="input" 
                  value={settings.workingHoursEnd}
                  onChange={(e) => handleChange('workingHoursEnd', e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border/50">
              <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-text-muted" /> Timezone
              </label>
              <select 
                className="select w-full"
                value={settings.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
              >
                <option value="UTC-8">Pacific Time (PT) — UTC-8</option>
                <option value="UTC-5">Eastern Time (ET) — UTC-5</option>
                <option value="UTC+0">London (GMT) — UTC+0</option>
                <option value="UTC+1">Central Europe (CET) — UTC+1</option>
                <option value="UTC+5.5">India (IST) — UTC+5.5</option>
                <option value="UTC+6">Dhaka (BST) — UTC+6</option>
                <option value="UTC+8">Singapore (SGT) — UTC+8</option>
              </select>
            </div>
          </section>

          {/* Email Configuration */}
          <section className="glass-card p-6 border-info/20 animate-fade-in">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-info" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Email Outreach (SMTP)</h2>
                <p className="text-sm text-text-muted">Configure your email account to send campaigns.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">SMTP Host</label>
                <input 
                  type="text" 
                  className="input text-sm" 
                  placeholder="smtp.gmail.com"
                  value={settings.smtpHost || ''}
                  onChange={(e) => handleChange('smtpHost', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">SMTP Port</label>
                <input 
                  type="number" 
                  className="input text-sm" 
                  placeholder="587"
                  value={settings.smtpPort || ''}
                  onChange={(e) => handleChange('smtpPort', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">SMTP User (Email)</label>
                <input 
                  type="text" 
                  className="input text-sm" 
                  placeholder="you@company.com"
                  value={settings.smtpUser || ''}
                  onChange={(e) => handleChange('smtpUser', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">SMTP Password</label>
                <input 
                  type="password" 
                  className="input text-sm" 
                  placeholder="App Password"
                  value={settings.smtpPass || ''}
                  onChange={(e) => handleChange('smtpPass', e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
               <input 
                  type="checkbox" 
                  id="smtpSecure"
                  checked={settings.smtpSecure === 'true'}
                  onChange={(e) => handleChange('smtpSecure', e.target.checked ? 'true' : 'false')}
                  className="w-4 h-4 accent-info rounded border-border" 
                />
               <label htmlFor="smtpSecure" className="text-sm text-text-secondary cursor-pointer">Use SSL/TLS (required for port 465)</label>
            </div>
          </section>
        </div>

        {/* Right Column (Safety Options) */}
        <div className="space-y-6">
          
          {/* Account Safety */}
          <section className="glass-card p-6 border-primary/20 animate-fade-in animate-fade-in-delay-3">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-primary-light" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Safety Engine</h2>
              </div>
            </div>

            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-bg-secondary border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-text-primary text-sm">Warm-up Mode</div>
                  <div 
                    className={`toggle ${isWarmupOn ? 'active' : ''}`}
                    onClick={() => handleChange('warmupMode', isWarmupOn ? 'false' : 'true')}
                  ></div>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Gradually increase daily limits over {settings.warmupDays || 14} days to keep your account safe.
                </p>
                
                {isWarmupOn && (
                  <div className="mt-3 pt-3 border-t border-border/50 animate-fade-in">
                    <label className="block text-xs font-medium text-text-secondary mb-1">Warm-up Duration (Days)</label>
                    <input 
                      type="number" 
                      className="input py-1.5 text-sm" 
                      min="7" max="60"
                      value={settings.warmupDays}
                      onChange={(e) => handleChange('warmupDays', e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Action Delays</label>
                <p className="text-xs text-text-muted mb-3">Random delay between actions to mimic human behavior.</p>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    className="input text-center" 
                    value={settings.minDelay}
                    onChange={(e) => handleChange('minDelay', e.target.value)}
                  />
                  <span className="text-text-muted text-sm">to</span>
                  <input 
                    type="number" 
                    className="input text-center" 
                    value={settings.maxDelay}
                    onChange={(e) => handleChange('maxDelay', e.target.value)}
                  />
                  <span className="text-text-muted text-sm shrink-0">seconds</span>
                </div>
              </div>
            </div>
          </section>

          {/* Blacklist */}
          <section className="glass-card p-6 animate-fade-in animate-fade-in-delay-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                <UserX className="w-5 h-5 text-danger" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Blacklist</h2>
              </div>
            </div>
            <p className="text-xs text-text-muted mb-4">Never contact emails or LinkedIn URLs from these domains/companies:</p>
            <textarea 
              className="input min-h-[120px] font-mono text-sm resize-none"
              placeholder="ibm.com&#10;microsoft.com&#10;examplecorp"
              value={Array.isArray(settings.blacklist) ? settings.blacklist.join('\n') : ''}
              onChange={(e) => handleChange('blacklist', e.target.value.split('\n'))}
            ></textarea>
          </section>
        </div>
      </div>
    </div>
  )
}
