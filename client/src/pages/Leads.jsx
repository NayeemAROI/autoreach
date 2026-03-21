import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, Filter, Plus, Download, Upload,
  MoreVertical, Mail, Linkedin, UserX,
  CheckCircle2, Clock, AlertCircle, Loader2,
  ShieldCheck, RefreshCw, Trash2, XCircle, X, Check,
  Send, MessageSquare, ThumbsUp, Award, ChevronDown
} from 'lucide-react'
import { apiFetch } from '../utils/api'
import Papa from 'papaparse'

const verificationStatusConfig = {
  unverified: { icon: Clock, label: 'Unverified', color: 'text-text-muted', bg: 'bg-bg-elevated' },
  pending: { icon: Loader2, label: 'Verifying', color: 'text-warning', bg: 'bg-warning/10', spin: true },
  verifying: { icon: Loader2, label: 'Verifying', color: 'text-warning', bg: 'bg-warning/10', spin: true },
  verified: { icon: CheckCircle2, label: 'Verified', color: 'text-success', bg: 'bg-success/10' },
  failed: { icon: XCircle, label: 'Failed', color: 'text-danger', bg: 'bg-danger/10' },
}

const workflowStatusConfig = {
  not_invited: { icon: Clock, label: 'Not Invited', color: 'text-text-muted', bg: 'bg-bg-elevated' },
  invited: { icon: Send, label: 'Invited', color: 'text-info', bg: 'bg-info/10' },
  replied: { icon: MessageSquare, label: 'Replied', color: 'text-success', bg: 'bg-success/10' },
  liked: { icon: ThumbsUp, label: 'Liked', color: 'text-primary', bg: 'bg-primary/10' },
  endorsed: { icon: Award, label: 'Endorsed', color: 'text-accent', bg: 'bg-accent/10' }
}

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [verificationStatusFilter, setVerificationStatusFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [hasEmailFilter, setHasEmailFilter] = useState('all')
  const [selectedLeads, setSelectedLeads] = useState(new Set())
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const [importingInfo, setImportingInfo] = useState(null)
  const [importError, setImportError] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [verifyingLeadIds, setVerifyingLeadIds] = useState(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null })
  const [toastMsg, setToastMsg] = useState(null)
  const [newLeadForm, setNewLeadForm] = useState({
    firstName: '',
    lastName: '',
    company: '',
    title: '',
    linkedinUrl: ''
  })
  const menuRef = useRef(null)
  const pollRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchLeads()
  }, [search, statusFilter, verificationStatusFilter, campaignFilter, hasEmailFilter])

  useEffect(() => {
    fetchCampaigns()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Poll for verification status updates
  useEffect(() => {
    if (verifyingLeadIds.size > 0 && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        await fetchLeads()
      }, 3000)
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [verifyingLeadIds])

  // Check if any verifying leads have completed
  useEffect(() => {
    if (verifyingLeadIds.size > 0) {
      const stillVerifying = leads.some(l =>
        verifyingLeadIds.has(l.id) &&
        (l.verification_status === 'verifying' || l.verification_status === 'pending')
      )
      if (!stillVerifying) {
        setVerifyingLeadIds(new Set())
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      }
    }
  }, [leads, verifyingLeadIds])

  const fetchCampaigns = async () => {
    try {
      const res = await apiFetch('/api/campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns || [])
      if (data.campaigns && data.campaigns.length > 0) {
        setSelectedCampaignId(data.campaigns[0].id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchLeads = async () => {
    // Only show spinner on initial load, not poll updates
    if (leads.length === 0) setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (search) qs.append('search', search)
      if (statusFilter !== 'all') qs.append('status', statusFilter)
      if (verificationStatusFilter !== 'all') qs.append('verification_status', verificationStatusFilter)
      if (campaignFilter !== 'all') qs.append('campaign', campaignFilter)
      
      const res = await apiFetch(`/api/leads?${qs.toString()}`)
      const data = await res.json()
      let filtered = data.leads || []
      
      // Client-side email filter
      if (hasEmailFilter === 'yes') filtered = filtered.filter(l => l.email && l.email.trim())
      if (hasEmailFilter === 'no') filtered = filtered.filter(l => !l.email || !l.email.trim())
      
      setLeads(filtered)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (leads.length > 0 && selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)))
    }
  }

  const handleSelectOne = (id) => {
    const newSet = new Set(selectedLeads)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedLeads(newSet)
  }

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  const handleEnroll = async () => {
    if (!selectedCampaignId || selectedLeads.size === 0) return
    setEnrolling(true)
    
    try {
      const res = await apiFetch(`/api/campaigns/${selectedCampaignId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedLeads) })
      })
      
      if (res.ok) {
        showToast(`Successfully enrolled ${selectedLeads.size} leads!`, 'success')
        setSelectedLeads(new Set())
      } else {
        showToast('Failed to enroll leads.', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Error enrolling leads.', 'error')
    } finally {
      setEnrolling(false)
    }
  }

  const handleVerifyLead = async (leadId, force = false) => {
    setOpenMenuId(null)
    setVerifyingLeadIds(prev => new Set([...prev, leadId]))
    try {
      await apiFetch(`/api/leads/${leadId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      })
      await fetchLeads()
    } catch (err) {
      console.error('Failed to verify lead:', err)
      setVerifyingLeadIds(prev => {
        const s = new Set(prev)
        s.delete(leadId)
        return s
      })
    }
  }

  const handleDeleteLead = (leadId) => {
    setOpenMenuId(null)
    setConfirmModal({
      isOpen: true,
      title: 'Delete Lead',
      message: 'Are you sure you want to delete this lead? This action cannot be undone.',
      action: async () => {
        try {
          const res = await apiFetch(`/api/leads/${leadId}`, { method: 'DELETE' })
          if (res.ok) {
            setLeads(prev => prev.filter(l => l.id !== leadId))
            setSelectedLeads(prev => {
              const s = new Set(prev)
              s.delete(leadId)
              return s
            })
            showToast('Lead deleted successfully.')
          } else {
             const text = await res.text();
             let msg = text;
             try { msg = JSON.parse(text).error || text; } catch(e){}
             showToast(`Failed to delete lead: ${msg}`, 'error');
          }
        } catch (err) {
          console.error('Failed to delete lead:', err)
          showToast(`Network/JS Error: ${err.message}`, 'error')
        }
      }
    })
  }

  const handleBulkDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Selected Leads',
      message: `Are you sure you want to delete ${selectedLeads.size} leads? This action cannot be undone.`,
      action: async () => {
        try {
          const res = await apiFetch(`/api/leads/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadIds: Array.from(selectedLeads) })
          })
          if (res.ok) {
            showToast(`Leads deleted successfully.`, 'success')
            setLeads(prev => prev.filter(l => !selectedLeads.has(l.id)))
            setSelectedLeads(new Set())
          } else {
            const text = await res.text();
            let msg = text;
            try { msg = JSON.parse(text).error || text; } catch(e){}
            showToast(`Failed to delete leads: ${msg}`, 'error')
          }
        } catch (err) {
          console.error('Failed to bulk delete:', err)
          showToast(`Network/JS Error: ${err.message}`, 'error')
        }
      }
    })
  }

  const handleAddLeadSubmit = async (e) => {
    e.preventDefault()
    if (!newLeadForm.firstName || !newLeadForm.linkedinUrl) {
      showToast('First Name and LinkedIn URL are required.', 'error')
      return
    }

    try {
      const res = await apiFetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLeadForm,
          tags: ['manual_add']
        })
      })
      if (res.ok) {
        setShowAddModal(false)
        setNewLeadForm({ firstName: '', lastName: '', company: '', title: '', linkedinUrl: '' })
        fetchLeads()
        showToast('Lead added successfully.')
      } else {
        const error = await res.json()
        showToast('Failed to add lead: ' + error.error, 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Error adding lead', 'error')
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportingInfo('Reading CSV...')
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data
        if (!rows || rows.length === 0) {
          setImportError('CSV is empty!')
          setImportingInfo(null)
          if(fileInputRef.current) fileInputRef.current.value = ''
          return
        }
        // Validate Required Columns — only LinkedIn URL is mandatory
        const headers = results.meta.fields.map(h => (h || '').trim().toLowerCase())
        const hasUrl = headers.some(h => ['linkedin url', 'linkedin', 'url', 'profile url', 'linkedin profile'].includes(h))

        if (!hasUrl) {
          setImportError('Import failed. CSV must have a "LinkedIn URL" column. Other columns (First Name, Last Name, Company, Title) are optional and will be auto-enriched.')
          setImportingInfo(null)
          if(fileInputRef.current) fileInputRef.current.value = ''
          return
        }

        // Map flexible headers to our schema
        const mappedLeads = rows.map(row => {
          const r = Object.keys(row).reduce((acc, c) => {
            acc[c.trim().toLowerCase()] = row[c].trim()
            return acc
          }, {})

          const cleanStr = (str) => {
            if (!str) return '';
            // Allow alphanumeric, whitespace, hyphen, underscore, and period. Remove other special weird chars.
            return str.replace(/[^\w\s\-\.]/gi, '').trim();
          };

          return {
            firstName: cleanStr(r['first name'] || r['firstname'] || r['first'] || ''),
            lastName: cleanStr(r['last name'] || r['lastname'] || r['last'] || ''),
            company: cleanStr(r['company name'] || r['company'] || ''),
            title: cleanStr(r['title'] || r['titles'] || r['job title'] || ''),
            linkedinUrl: r['linkedin url'] || r['linkedin'] || r['url'] || '',
            email: r['email'] || r['email address'] || '',
            tags: ['csv_import']
          }
        }).filter(lead => lead.firstName || lead.linkedinUrl) 

        if (mappedLeads.length === 0) {
          setImportError('Could not find recognizable columns (First Name, Last Name, Linkedin URL, etc.)')
          setImportingInfo(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
          return
        }

        setImportingInfo(`Importing ${mappedLeads.length} leads...`)

        try {
          const res = await apiFetch('/api/leads/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leads: mappedLeads })
          })

          const data = await res.json()
          if (res.ok) {
            const imported = data.imported || 0;
            const skipped = data.skipped || 0;
            
            if (imported > 0 && skipped > 0) {
              showToast(`Successfully imported ${imported} leads. Skipped ${skipped} duplicates.`, 'success')
            } else if (imported > 0 && skipped === 0) {
              showToast(`Successfully imported ${imported} leads!`, 'success')
            } else if (imported === 0 && skipped > 0) {
              showToast(`All ${skipped} leads were skipped (already exist in database).`, 'error')
            } else {
              showToast(`Import finished. No new leads were added.`, 'info')
            }
            
            setImportError(null)
            fetchLeads()
          } else {
            setImportError('Failed to import leads: ' + data.error)
          }
        } catch (err) {
          console.error('Import error:', err)
          setImportError('Error during import. Check console for details.')
        } finally {
          setImportingInfo(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      },
      error: (error) => {
        console.error('CSV Parsing Error:', error)
        setImportError('Failed to parse CSV file.')
        setImportingInfo(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    })
  }

  return (
    <div className="space-y-6 w-full">
      {importError && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl flex items-center justify-between animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{importError}</p>
          </div>
          <button onClick={() => setImportError(null)} className="p-1 hover:bg-danger/20 rounded-lg transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Lead Management</h1>
          <p className="text-sm text-text-muted mt-1">Manage and organize your prospects</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <button 
            className="btn btn-secondary" 
            onClick={() => fileInputRef.current?.click()}
            disabled={!!importingInfo}
          >
            {importingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importingInfo ? importingInfo : 'Import CSV'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="relative z-20 glass-card p-4 lg:p-5 flex flex-col gap-4 border border-white/[0.06] shadow-lg shadow-black/10">
        {/* Row 1: Search + Status Filter + Advanced Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, company, email..."
              className="input w-full !pl-11 pr-4 py-2.5 bg-bg-primary/40 border border-border/80 hover:border-border-light focus:border-primary/50 focus:bg-bg-primary transition-all rounded-xl shadow-sm text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Funnel Stage Filter */}
          <div className="relative min-w-[170px]" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full flex items-center justify-between pl-10 pr-3 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm border
                ${isDropdownOpen 
                  ? 'bg-bg-primary border-primary/50 ring-1 ring-primary/20 text-text-primary' 
                  : 'bg-bg-primary/40 border-border/80 text-text-secondary hover:border-border-light'
                }`}
            >
              <Filter className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDropdownOpen ? 'text-primary' : 'text-text-muted'}`} />
              <span className="truncate">
                {statusFilter === 'all' ? 'Funnel Stage' : {
                  not_invited: 'Not Invited', invited: 'Invited', replied: 'Replied', liked: 'Liked', endorsed: 'Endorsed'
                }[statusFilter]}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 ml-1 text-text-muted transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-primary' : ''}`} />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 p-1.5 bg-bg-elevated border border-border/80 rounded-xl shadow-xl shadow-black/40 z-50">
                {[
                  { value: 'all', label: 'Any Funnel Stage' },
                  { value: 'not_invited', label: 'Not Invited' },
                  { value: 'invited', label: 'Invited' },
                  { value: 'replied', label: 'Replied' },
                  { value: 'liked', label: 'Liked' },
                  { value: 'endorsed', label: 'Endorsed' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { setStatusFilter(option.value); setIsDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left
                      ${statusFilter === option.value 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'}`}
                  >
                    {option.label}
                    {statusFilter === option.value && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border
              ${showAdvancedFilters
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-bg-primary/40 border-border/80 text-text-muted hover:border-border-light hover:text-text-secondary'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(verificationStatusFilter !== 'all' || campaignFilter !== 'all' || hasEmailFilter !== 'all') && (
              <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {[verificationStatusFilter !== 'all', campaignFilter !== 'all', hasEmailFilter !== 'all'].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Row 2: Advanced Filters (collapsible) */}
        {showAdvancedFilters && (
          <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-border/40 animate-fade-in">
            {/* Verification Status */}
            <select
              value={verificationStatusFilter}
              onChange={(e) => setVerificationStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-bg-primary/40 border border-border/80 text-sm text-text-secondary focus:border-primary outline-none min-w-[150px]"
            >
              <option value="all">Any Verification</option>
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
              <option value="failed">Failed</option>
            </select>

            {/* Campaign Filter */}
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-bg-primary/40 border border-border/80 text-sm text-text-secondary focus:border-primary outline-none min-w-[150px]"
            >
              <option value="all">Any Campaign</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Has Email */}
            <select
              value={hasEmailFilter}
              onChange={(e) => setHasEmailFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-bg-primary/40 border border-border/80 text-sm text-text-secondary focus:border-primary outline-none min-w-[130px]"
            >
              <option value="all">Email Status</option>
              <option value="yes">Has Email</option>
              <option value="no">No Email</option>
            </select>

            {/* Clear Filters */}
            {(verificationStatusFilter !== 'all' || campaignFilter !== 'all' || hasEmailFilter !== 'all') && (
              <button
                onClick={() => { setVerificationStatusFilter('all'); setCampaignFilter('all'); setHasEmailFilter('all'); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-visible relative z-10">
        <div className="table-container border-0 rounded-none bg-transparent overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-elevated/50">
              <tr>
                <th className="w-[40px] pl-5 pb-3">
                  <div className="flex items-center justify-center">
                    <button
                      onClick={handleSelectAll}
                      className={`w-5 h-5 flex items-center justify-center rounded-md border transition-all ${
                        leads.length > 0 && selectedLeads.size === leads.length
                          ? 'bg-primary border-primary shadow-[0_0_10px_rgba(var(--color-primary),0.3)]'
                          : 'bg-bg-surface border-border hover:border-primary/50'
                      }`}
                    >
                      {leads.length > 0 && selectedLeads.size === leads.length && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </button>
                  </div>
                </th>
                <th className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider text-left pb-3">Name</th>
                <th className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider text-left pb-3">Company</th>
                <th className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider text-left pb-3">Title</th>
                <th className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider text-left pb-3">Contact</th>
                <th className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider text-left pb-3">Campaign</th>
                <th className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider text-left pb-3">Status</th>
                <th className="text-right pr-5 font-semibold text-text-secondary text-[11px] uppercase tracking-wider pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-text-muted">
                    <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-sm">Loading leads...</p>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-text-muted">
                    <UserX className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No leads found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const wfStatus = lead.status || 'not_invited'
                  const statusInfo = workflowStatusConfig[wfStatus] || workflowStatusConfig.not_invited
                  const StatusIcon = statusInfo.icon
                  
                  const isVerified = lead.verification_status === 'verified'
                  const isVerifying = lead.verification_status === 'verifying' || lead.verification_status === 'pending' || verifyingLeadIds.has(lead.id)
                  
                  return (
                    <tr key={lead.id} className="group hover:bg-bg-hover/50 transition-colors h-[72px] border-b border-border/40 last:border-0 table-row">
                      <td className="w-[40px] pl-5">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleSelectOne(lead.id)}
                            className={`w-5 h-5 flex items-center justify-center rounded-md border transition-all ${
                              selectedLeads.has(lead.id)
                                ? 'bg-primary border-primary shadow-[0_0_10px_rgba(var(--color-primary),0.3)]'
                                : 'bg-bg-surface border-border hover:border-primary/50 group-hover:border-primary/30'
                            }`}
                          >
                            {selectedLeads.has(lead.id) && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                          </button>
                        </div>
                      </td>
                      <td className="max-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-bold text-primary-light text-sm border border-primary/20 shadow-sm">
                              {lead.firstName?.[0] || '?'}{lead.lastName?.[0] || ''}
                            </div>
                            {isVerified && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success rounded-full border-2 border-bg-surface flex items-center justify-center">
                                <CheckCircle2 className="w-2 h-2 text-white" />
                              </div>
                            )}
                            {isVerifying && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-warning rounded-full border-2 border-bg-surface flex items-center justify-center">
                                <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col justify-center min-w-0 overflow-hidden">
                            <span className="font-semibold text-text-primary text-[13px] leading-tight truncate">
                              {lead.firstName || 'Unknown'} {lead.lastName || ''}
                            </span>
                            <span className="text-[11px] text-text-muted mt-0.5 opacity-80 truncate">
                              Added {new Date(lead.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[160px]">
                        <div className="text-[13px] text-text-secondary font-medium tracking-wide truncate" title={lead.company}>{lead.company || '-'}</div>
                      </td>
                      <td className="max-w-[160px]">
                        <div className="text-[12px] text-text-muted truncate" title={lead.title}>{lead.title || '-'}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {lead.linkedinUrl && (
                            <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="w-[30px] h-[30px] rounded-lg bg-bg-elevated border border-border/50 flex items-center justify-center text-info hover:bg-info hover:text-white hover:shadow-md hover:-translate-y-0.5 transition-all tooltip" data-tooltip="LinkedIn">
                              <Linkedin className="w-4 h-4" />
                            </a>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="w-[30px] h-[30px] rounded-lg bg-bg-elevated border border-border/50 flex items-center justify-center text-text-secondary hover:bg-primary hover:text-white hover:shadow-md hover:-translate-y-0.5 transition-all tooltip" data-tooltip={lead.email}>
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="max-w-[140px]">
                        <div className="flex items-center gap-2 truncate">
                          {lead.campaignName ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-medium border border-primary/20 truncate" title={lead.campaignName}>
                              {lead.campaignName}
                            </span>
                          ) : (
                            <span className="text-[11px] text-text-muted/60 font-medium px-2 py-1 rounded-md bg-bg-surface border border-border/40">Not in a campaign</span>
                          )}
                        </div>
                      </td>
                      <td className="pr-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide ${statusInfo.bg} ${statusInfo.color} border border-current/10 shadow-sm`}>
                          <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.spin ? 'animate-spin' : ''}`} />
                          <span className="truncate max-w-[80px]">{statusInfo.label}</span>
                        </div>
                      </td>
                      <td className="text-right pr-5">
                        <div className="relative inline-block" ref={openMenuId === lead.id ? menuRef : null}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === lead.id ? null : lead.id)}
                            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuId === lead.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-bg-surface border border-border rounded-xl shadow-xl z-50 py-1.5 animate-fade-in">
                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-danger hover:bg-danger/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Selection Bar */}
      {selectedLeads.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-bg-surface/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-5 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
              {selectedLeads.size}
            </div>
            <span className="text-sm font-semibold text-text-primary">Selected</span>
          </div>
          <div className="w-px h-8 bg-border mx-1"></div>
          
          {campaigns.length > 0 ? (
            <div className="flex items-center gap-3">
              <select 
                className="select !py-2 !px-4 !text-sm !bg-bg-primary focus:ring-0 w-48"
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button 
                className="btn btn-primary shadow-lg shadow-primary/20"
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling ? 'Enrolling...' : 'Enroll in Campaign'}
              </button>
            </div>
          ) : (
            <span className="text-sm text-warning px-2">No campaigns found</span>
          )}

          <div className="w-px h-8 bg-border mx-1"></div>
          <button 
            className="p-2.5 rounded-xl bg-danger/10 hover:bg-danger/20 text-danger transition-colors tooltip"
            data-tooltip="Delete Selected Leads"
            onClick={handleBulkDelete}
          >
            <Trash2 className="w-5 h-5" />
          </button>
          
          <button 
            className="p-2.5 rounded-xl hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors ml-1 tooltip"
            data-tooltip="Clear Selection"
            onClick={() => setSelectedLeads(new Set())}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-bg-surface w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 relative">
            <h2 className="text-xl font-semibold text-text-primary mb-1">Add Lead Manually</h2>
            <p className="text-sm text-text-muted mb-6">Enter details for the new prospect.</p>
            
            <form onSubmit={handleAddLeadSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">First Name *</label>
                  <input required type="text" className="input bg-bg-primary" value={newLeadForm.firstName} onChange={(e) => setNewLeadForm({...newLeadForm, firstName: e.target.value})} placeholder="Walter" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Last Name</label>
                  <input type="text" className="input bg-bg-primary" value={newLeadForm.lastName} onChange={(e) => setNewLeadForm({...newLeadForm, lastName: e.target.value})} placeholder="White" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">LinkedIn URL *</label>
                <input required type="url" className="input bg-bg-primary" value={newLeadForm.linkedinUrl} onChange={(e) => setNewLeadForm({...newLeadForm, linkedinUrl: e.target.value})} placeholder="https://linkedin.com/in/..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Company</label>
                  <input type="text" className="input bg-bg-primary" value={newLeadForm.company} onChange={(e) => setNewLeadForm({...newLeadForm, company: e.target.value})} placeholder="Los Pollos Hermanos" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Job Title</label>
                  <input type="text" className="input bg-bg-primary" value={newLeadForm.title} onChange={(e) => setNewLeadForm({...newLeadForm, title: e.target.value})} placeholder="Owner" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-fade-in">
          <div className="bg-bg-surface w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6 relative">
            <h2 className="text-xl font-bold text-text-primary mb-2">{confirmModal.title}</h2>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                className="btn btn-secondary !py-2 !px-4"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
              >
                Cancel
              </button>
              <button 
                className="btn !bg-danger hover:!bg-danger/90 !text-white !py-2 !px-4 border-0"
                onClick={async () => {
                  try {
                    await confirmModal.action()
                  } finally {
                    setConfirmModal({ ...confirmModal, isOpen: false })
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[250] px-5 py-3.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex items-center gap-3 animate-fade-in border ${toastMsg.type === 'success' ? 'bg-bg-surface border-success/30 text-text-primary' : 'bg-bg-surface border-danger/30 text-text-primary'}`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-success" /> : <AlertCircle className="w-5 h-5 text-danger" />}
          <span className="text-sm font-semibold">{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="ml-3 text-text-muted hover:text-text-primary outline-none transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
