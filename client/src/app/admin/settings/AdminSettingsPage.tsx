import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageTabs } from '@/components/shared/PageTabs'
import { useApi, useMutation } from '@/hooks/useApi'
import { Save } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

export default function AdminSettingsPage() {
  const [tab, setTab] = useState('branding')
  const { data: settingsData, refetch } = useApi<any>('/api/admin/settings')
  const { mutate, loading: saving } = useMutation()
  const settings = settingsData?.settings || {}

  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setForm(settings)
    }
  }, [settingsData])

  const handleSave = async () => {
    await mutate('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings: form }),
    })
    refetch()
  }

  const updateField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Platform-wide configuration">
        <QuickActionButton icon={<Save className="w-4 h-4" />} label={saving ? 'Saving...' : 'Save Changes'} onClick={handleSave} variant="primary" />
      </PageHeader>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="px-5 pt-4">
          <PageTabs
            tabs={[
              { id: 'branding', label: 'Branding' },
              { id: 'features', label: 'Feature Flags' },
              { id: 'notifications', label: 'Notifications' },
            ]}
            activeTab={tab} onChange={setTab}
          />
        </div>
        <div className="p-6 space-y-5">
          {tab === 'branding' && (
            <div className="space-y-4 max-w-lg">
              <SettingsInput label="Platform Name" value={form.platformName || ''} onChange={(v) => updateField('platformName', v)} />
              <SettingsInput label="Support Email" value={form.supportEmail || ''} onChange={(v) => updateField('supportEmail', v)} type="email" />
              <SettingsInput label="Default Timezone" value={form.defaultTimezone || ''} onChange={(v) => updateField('defaultTimezone', v)} />
            </div>
          )}
          {tab === 'features' && (
            <div className="max-w-lg">
              <SettingsToggle label="Campaign Engine" description="Enable automated campaign execution" checked={!!form.campaignEngine} onChange={(v) => updateField('campaignEngine', v)} />
              <SettingsToggle label="Lead Enrichment" description="Enable background LinkedIn enrichment" checked={!!form.leadEnrichment} onChange={(v) => updateField('leadEnrichment', v)} />
              <SettingsToggle label="Email Verification" description="Enable email bounce checking" checked={!!form.emailVerification} onChange={(v) => updateField('emailVerification', v)} />
              <SettingsToggle label="Team Invitations" description="Allow workspace owners to invite members" checked={!!form.teamInvitations} onChange={(v) => updateField('teamInvitations', v)} />
              <SettingsToggle label="Stripe Billing" description="Enable subscription management" checked={!!form.stripeBilling} onChange={(v) => updateField('stripeBilling', v)} />
            </div>
          )}
          {tab === 'notifications' && (
            <div className="max-w-lg">
              <SettingsToggle label="Payment failure alerts" checked={!!form.paymentFailureAlerts} onChange={(v) => updateField('paymentFailureAlerts', v)} />
              <SettingsToggle label="Campaign failure alerts" checked={!!form.campaignFailureAlerts} onChange={(v) => updateField('campaignFailureAlerts', v)} />
              <SettingsToggle label="New user notifications" checked={!!form.newUserNotifications} onChange={(v) => updateField('newUserNotifications', v)} />
              <SettingsToggle label="Integration health alerts" checked={!!form.integrationHealthAlerts} onChange={(v) => updateField('integrationHealthAlerts', v)} />
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
      <button onClick={() => onChange(!checked)} className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-amber-500' : 'bg-zinc-700'}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}
