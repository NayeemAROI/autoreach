import { useState } from 'react'
import { PageHeader, SectionHeader } from '@/components/shared/PageHeader'
import { PageTabs } from '@/components/shared/PageTabs'
import { QuickActionButton } from '@/components/shared/AlertStrip'
import { Save } from 'lucide-react'

const settingsSections = [
  { id: 'branding', label: 'Branding' },
  { id: 'plans', label: 'Default Plans' },
  { id: 'features', label: 'Feature Flags' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'retention', label: 'Data Retention' },
]

function SettingsInput({ label, value, placeholder, type = 'text' }: { label: string; value: string; placeholder?: string; type?: string }) {
  const [val, setVal] = useState(value)
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-500 mb-1.5">{label}</label>
      <input type={type} value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors" />
    </div>
  )
}

function SettingsToggle({ label, description, defaultChecked }: { label: string; description?: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked)
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/40 last:border-0">
      <div><p className="text-sm text-zinc-300">{label}</p>{description && <p className="text-[11px] text-zinc-600 mt-0.5">{description}</p>}</div>
      <button onClick={() => setChecked(!checked)} className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-amber-500' : 'bg-zinc-700'}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState('branding')

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Platform-wide configuration">
        <QuickActionButton icon={<Save className="w-4 h-4" />} label="Save Changes" onClick={() => {}} variant="primary" />
      </PageHeader>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="px-5 pt-4">
          <PageTabs tabs={settingsSections} activeTab={tab} onChange={setTab} />
        </div>
        <div className="p-6 space-y-5">
          {tab === 'branding' && (
            <div className="space-y-4 max-w-lg">
              <SettingsInput label="Platform Name" value="Autoreach" />
              <SettingsInput label="Support Email" value="support@autoreach.io" type="email" />
              <SettingsInput label="Default Timezone" value="UTC" />
            </div>
          )}
          {tab === 'features' && (
            <div className="max-w-lg">
              <SettingsToggle label="Campaign Engine" description="Enable automated campaign execution" defaultChecked={true} />
              <SettingsToggle label="Lead Enrichment" description="Enable background LinkedIn enrichment" defaultChecked={true} />
              <SettingsToggle label="Email Verification" description="Enable email bounce checking" defaultChecked={false} />
              <SettingsToggle label="Team Invitations" description="Allow workspace owners to invite members" defaultChecked={true} />
              <SettingsToggle label="Stripe Billing" description="Enable subscription management" defaultChecked={true} />
            </div>
          )}
          {tab === 'notifications' && (
            <div className="max-w-lg">
              <SettingsToggle label="Payment failure alerts" defaultChecked={true} />
              <SettingsToggle label="Campaign failure alerts" defaultChecked={true} />
              <SettingsToggle label="New user notifications" defaultChecked={false} />
              <SettingsToggle label="Integration health alerts" defaultChecked={true} />
            </div>
          )}
          {(tab === 'plans' || tab === 'retention') && (
            <div className="text-sm text-zinc-500 py-8 text-center">Configuration for {tab}</div>
          )}
        </div>
      </div>
    </div>
  )
}
