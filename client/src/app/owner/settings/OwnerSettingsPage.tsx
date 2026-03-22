import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageTabs } from '@/components/shared/PageTabs'
import { QuickActionButton } from '@/components/shared/AlertStrip'
import { Save } from 'lucide-react'

function Input({ label, value: initialValue, type = 'text' }: { label: string; value: string; type?: string }) {
  const [v, setV] = useState(initialValue)
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-500 mb-1.5">{label}</label>
      <input type={type} value={v} onChange={e => setV(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors" />
    </div>
  )
}

function Toggle({ label, description, defaultChecked }: { label: string; description?: string; defaultChecked: boolean }) {
  const [c, setC] = useState(defaultChecked)
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/40 last:border-0">
      <div><p className="text-sm text-zinc-300">{label}</p>{description && <p className="text-[11px] text-zinc-600 mt-0.5">{description}</p>}</div>
      <button onClick={() => setC(!c)} className={`w-10 h-6 rounded-full transition-colors ${c ? 'bg-violet-500' : 'bg-zinc-700'}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${c ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

const tabs = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'campaign_defaults', label: 'Campaign Defaults' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'api', label: 'API / Webhooks' },
]

export default function OwnerSettingsPage() {
  const [tab, setTab] = useState('workspace')

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Workspace configuration">
        <QuickActionButton icon={<Save className="w-4 h-4" />} label="Save Changes" onClick={() => {}} variant="primary" />
      </PageHeader>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="px-5 pt-4">
          <PageTabs tabs={tabs} activeTab={tab} onChange={setTab} />
        </div>
        <div className="p-6 space-y-5">
          {tab === 'workspace' && (
            <div className="space-y-4 max-w-lg">
              <Input label="Workspace Name" value="Autoreach Main" />
              <Input label="Timezone" value="Asia/Dhaka" />
              <Input label="Default Sender Name" value="Nayeemur Rahman" />
            </div>
          )}
          {tab === 'notifications' && (
            <div className="max-w-lg">
              <Toggle label="Daily Summary" description="Receive a daily email summary of workspace activity" defaultChecked={true} />
              <Toggle label="Campaign Paused Alerts" description="Get notified when campaigns are automatically paused" defaultChecked={true} />
              <Toggle label="Webhook Failure Alerts" description="Alert when webhook deliveries fail" defaultChecked={true} />
              <Toggle label="Billing Alerts" description="Payment reminders and limit warnings" defaultChecked={true} />
            </div>
          )}
          {tab === 'campaign_defaults' && (
            <div className="space-y-4 max-w-lg">
              <Input label="Default Daily Invite Cap" value="50" type="number" />
              <Input label="Default Daily Message Cap" value="100" type="number" />
              <Input label="Default Delay Between Steps (days)" value="3" type="number" />
              <Toggle label="Stop on Reply (Default)" defaultChecked={true} />
            </div>
          )}
          {tab === 'api' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Webhook Endpoint</label>
                <div className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 font-mono">https://api.autoreach.io/webhooks/ws-001</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Webhook Secret</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 font-mono">whsec_•••••••••••••••</div>
                  <QuickActionButton icon={<span className="text-xs">Reveal</span>} label="" onClick={() => {}} />
                </div>
              </div>
              <QuickActionButton icon={<span className="text-xs">🧪</span>} label="Send Test Webhook" onClick={() => {}} variant="primary" />
            </div>
          )}
          {tab === 'permissions' && (
            <div className="text-sm text-zinc-500 py-8 text-center">Role permissions are managed on the Team page</div>
          )}
        </div>
      </div>
    </div>
  )
}
