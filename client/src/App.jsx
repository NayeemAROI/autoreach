import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Campaigns from './pages/Campaigns'
import CampaignBuilder from './pages/CampaignBuilder'
import CampaignDetails from './pages/CampaignDetails'
import Settings from './pages/Settings'
import Billing from './pages/Billing'
import Inbox from './pages/Inbox'
import Integrations from './pages/Integrations'
import Analytics from './pages/Analytics'
import ActivityLog from './pages/ActivityLog'
import Profile from './pages/Profile'
import WorkspaceMembers from './pages/WorkspaceMembers'
import AdminPanel from './pages/AdminPanel'
import WorkspaceSettings from './pages/WorkspaceSettings'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Onboarding from './pages/Onboarding'

// ─── New Dashboard System ───
import AdminLayout from './app/admin/AdminLayout'
import AdminOverviewPage from './app/admin/overview/AdminOverviewPage'
import AdminUsersPage from './app/admin/users/AdminUsersPage'
import AdminWorkspacesPage from './app/admin/workspaces/AdminWorkspacesPage'
import AdminCampaignMonitorPage from './app/admin/campaign-monitor/AdminCampaignMonitorPage'
import AdminBillingPage from './app/admin/billing/AdminBillingPage'
import AdminIntegrationsPage from './app/admin/integrations/AdminIntegrationsPage'
import AdminSystemHealthPage from './app/admin/system-health/AdminSystemHealthPage'
import AdminAuditLogsPage from './app/admin/audit-logs/AdminAuditLogsPage'
import AdminSettingsPage from './app/admin/settings/AdminSettingsPage'
import OwnerLayout from './app/owner/OwnerLayout'
import OwnerDashboardPage from './app/owner/dashboard/OwnerDashboardPage'
import OwnerCampaignsPage from './app/owner/campaigns/OwnerCampaignsPage'
import OwnerCampaignDetailPage from './app/owner/campaigns/OwnerCampaignDetailPage'
import OwnerLeadsPage from './app/owner/leads/OwnerLeadsPage'
import OwnerInboxPage from './app/owner/inbox/OwnerInboxPage'
import OwnerTeamPage from './app/owner/team/OwnerTeamPage'
import OwnerLinkedInPage from './app/owner/linkedin/OwnerLinkedInPage'
import OwnerBillingPage from './app/owner/billing/OwnerBillingPage'
import OwnerSettingsPage from './app/owner/settings/OwnerSettingsPage'

// Layout wrapper for authenticated pages to include the Sidebar
function DashboardLayout({ children }) {
  return (
    <div className="flex w-full min-h-screen bg-bg-primary">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
        {/* Top header row — workspace dropdown aligned right */}
        <div className="shrink-0 flex items-center justify-end px-8 pt-5 pb-0">
          <TopBar />
        </div>
        {/* Page content */}
        <main className="flex-1 p-8 pt-4 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Onboarding (Protected, no sidebar) */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />

          {/* ═══════ NEW: Super Admin Panel ═══════ */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview" element={<AdminOverviewPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="workspaces" element={<AdminWorkspacesPage />} />
            <Route path="campaign-monitor" element={<AdminCampaignMonitorPage />} />
            <Route path="billing" element={<AdminBillingPage />} />
            <Route path="integrations" element={<AdminIntegrationsPage />} />
            <Route path="system-health" element={<AdminSystemHealthPage />} />
            <Route path="audit-logs" element={<AdminAuditLogsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>

          {/* ═══════ NEW: Owner Panel ═══════ */}
          <Route path="/owner" element={<OwnerLayout />}>
            <Route index element={<Navigate to="/owner/dashboard" replace />} />
            <Route path="dashboard" element={<OwnerDashboardPage />} />
            <Route path="campaigns" element={<OwnerCampaignsPage />} />
            <Route path="campaigns/:id" element={<OwnerCampaignDetailPage />} />
            <Route path="leads" element={<OwnerLeadsPage />} />
            <Route path="inbox" element={<OwnerInboxPage />} />
            <Route path="team" element={<OwnerTeamPage />} />
            <Route path="linkedin" element={<OwnerLinkedInPage />} />
            <Route path="billing" element={<OwnerBillingPage />} />
            <Route path="settings" element={<OwnerSettingsPage />} />
          </Route>

          {/* ═══════ Legacy Protected Routes ═══════ */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout><Dashboard /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/leads" element={
            <ProtectedRoute>
              <DashboardLayout><Leads /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/campaigns" element={
            <ProtectedRoute>
              <DashboardLayout><Campaigns /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/campaigns/:id" element={
            <ProtectedRoute>
              <DashboardLayout><CampaignDetails /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/campaigns/:id/builder" element={
            <ProtectedRoute>
              <DashboardLayout><CampaignBuilder /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <DashboardLayout><Settings /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/billing" element={
            <ProtectedRoute>
              <DashboardLayout><Billing /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/inbox" element={
            <ProtectedRoute>
              <DashboardLayout><Inbox /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/integrations" element={
            <ProtectedRoute>
              <DashboardLayout><Integrations /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <DashboardLayout><Analytics /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/activity-log" element={
            <ProtectedRoute>
              <DashboardLayout><ActivityLog /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <DashboardLayout><Profile /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/workspace/members" element={
            <ProtectedRoute>
              <DashboardLayout><WorkspaceMembers /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/workspace/settings" element={
            <ProtectedRoute>
              <DashboardLayout><WorkspaceSettings /></DashboardLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
