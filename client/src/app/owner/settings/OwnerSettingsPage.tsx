import { useState, useEffect } from 'react'
import { PageHeader, SectionHeader } from '@/components/shared/PageHeader'
import { PageTabs } from '@/components/shared/PageTabs'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/utils/api'
import { Save } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

export default function OwnerSettingsPage() {
  const [tab, setTab] = useState('general')
  const { data: settingsData, refetch } = useApi<any>('/api/settings')
  const settings = settingsData?.settings || settingsData || {}

  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings && typeof settings === 'object') {
      setForm(settings)
    }
  }, [settingsData])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      refetch()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Workspace configuration and preferences">
        <QuickActionButton icon={<Save className="w-4 h-4" />} label={saving ? 'Saving...' : 'Save Changes'} onClick={handleSave} variant="primary" />
      </PageHeader>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="px-5 pt-4">
          <PageTabs
            tabs={[
              { id: 'general', label: 'General' },
              { id: 'limits', label: 'Daily Limits' },
              { id: 'schedule', label: 'Schedule' },
            ]}
            activeTab={tab} onChange={setTab}
          />
        </div>
        <div className="p-6 space-y-5">
          {tab === 'general' && (
            <div className="space-y-4 max-w-lg">
              <SettingsInput label="Timezone" value={form.timezone || 'UTC+6'} onChange={(v) => updateField('timezone', v)} />
              <SettingsToggle label="Warmup Mode" description="Gradually increase daily limits over time" checked={form.warmupMode === 'true'} onChange={(v) => updateField('warmupMode', v ? 'true' : 'false')} />
              {form.warmupMode === 'true' && (
                <SettingsInput label="Warmup Days" value={form.warmupDays || '14'} onChange={(v) => updateField('warmupDays', v)} type="number" />
              )}
            </div>
          )}
          {tab === 'limits' && (
            <div className="space-y-4 max-w-lg">
              <SettingsInput label="Daily Connection Limit" value={form.dailyConnectionLimit || '25'} onChange={(v) => updateField('dailyConnectionLimit', v)} type="number" />
              <SettingsInput label="Daily Message Limit" value={form.dailyMessageLimit || '50'} onChange={(v) => updateField('dailyMessageLimit', v)} type="number" />
              <SettingsInput label="Daily Email Limit" value={form.dailyEmailLimit || '100'} onChange={(v) => updateField('dailyEmailLimit', v)} type="number" />
              <SettingsInput label="Min Delay (seconds)" value={form.minDelay || '30'} onChange={(v) => updateField('minDelay', v)} type="number" />
              <SettingsInput label="Max Delay (seconds)" value={form.maxDelay || '120'} onChange={(v) => updateField('maxDelay', v)} type="number" />
            </div>
          )}
          {tab === 'schedule' && (
            <div className="space-y-4 max-w-lg">
              <SettingsInput label="Working Hours Start" value={form.workingHoursStart || '09:00'} onChange={(v) => updateField('workingHoursStart', v)} type="time" />
              <SettingsInput label="Working Hours End" value={form.workingHoursEnd || '18:00'} onChange={(v) => updateField('workingHoursEnd', v)} type="time" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-500 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors" />
    </div>
  )
}

function SettingsToggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/40 last:border-0">
      <div><p className="text-sm text-zinc-300">{label}</p>{description && <p className="text-[11px] text-zinc-600 mt-0.5">{description}</p>}</div>
      <button onClick={() => onChange(!checked)} className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-violet-500' : 'bg-zinc-700'}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}
