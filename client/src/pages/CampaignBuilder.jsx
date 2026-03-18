import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Plus, Trash2, UserPlus, Eye, ThumbsUp,
  Award, MessageCircle, MessageSquare, Clock, XCircle, X,
  AlertCircle, Rocket, Play, Pause, UserMinus, Check,
  Zap, Calendar, Users
} from 'lucide-react'
import { apiFetch } from '../utils/api'

// ─── Constants ───────────────────────────────────────────────────
const NODE_W = 240
const NODE_H = 88
const V_GAP = 90
const H_GAP = 56

const COLORS = {
  start: '#6366f1', send_invite: '#8b5cf6', view_profile: '#a78bfa',
  like_post: '#3b82f6', endorse: '#f59e0b', comment: '#10b981',
  send_message: '#06b6d4', withdraw_invite: '#ef4444',
  delay: '#64748b', end: '#374151'
}

const ACTION_TYPES = {
  start:          { label: 'Start', icon: Rocket,         branching: false, terminal: false, fields: [] },
  send_invite:    { label: 'Send Invite', icon: UserPlus,  branching: true,  conditionLabel: 'Accepted?', terminal: false,
    fields: [
      { key: 'withNote', type: 'toggle', label: 'Include Note' },
      { key: 'note',     type: 'textarea', label: 'Connection Note', placeholder: "Hi {{firstName}}, I'd love to connect!", showIf: 'withNote' }
    ]
  },
  view_profile:   { label: 'View Profile', icon: Eye,      branching: false, terminal: false, fields: [] },
  like_post:      { label: 'Like Post', icon: ThumbsUp,    branching: false, terminal: false, fields: [] },
  endorse:        { label: 'Endorse Skills', icon: Award,  branching: false, terminal: false, fields: [] },
  comment:        { label: 'Comment', icon: MessageCircle, branching: false, terminal: false,
    fields: [{ key: 'message', type: 'textarea', label: 'Comment Text', placeholder: 'Great insight! Thanks for sharing...' }]
  },
  send_message:   { label: 'Send Message', icon: MessageSquare, branching: false, terminal: false,
    fields: [{ key: 'message', type: 'textarea', label: 'Message Content', placeholder: 'Hi {{firstName}}, reaching out about...' }]
  },
  withdraw_invite: { label: 'Withdraw Invite', icon: UserMinus, branching: false, terminal: false, fields: [] },
  delay:          { label: 'Wait / Delay', icon: Clock,   branching: false, terminal: false,
    fields: [{ key: 'days', type: 'number', label: 'Days to wait', default: 1, min: 1, max: 90 }]
  },
  end:            { label: 'End', icon: XCircle,          branching: false, terminal: true,  fields: [] }
}

let _ctr = 0
const uid = () => `n_${Date.now()}_${++_ctr}`

function mkTree() {
  const rootId = uid()
  return { rootId, nodes: { [rootId]: { id: rootId, type: 'start', config: {}, yesChild: null, noChild: null } } }
}

// ─── Layout Engine ────────────────────────────────────────────────
function layout(tree) {
  if (!tree?.rootId) return { nodes: [], edges: [], w: 800, h: 600 }
  const nodes = tree.nodes
  const widths = {}
  const pos = {}
  const edges = []

  const measure = (id) => {
    if (!id || !nodes[id]) return 0
    const n = nodes[id]
    const td = ACTION_TYPES[n.type]
    if (td?.branching) {
      const lw = measure(n.noChild) || NODE_W
      const rw = measure(n.yesChild) || NODE_W
      widths[id] = { total: lw + rw + H_GAP, lw, rw }
      return widths[id].total
    } else {
      const cw = measure(n.yesChild) || NODE_W
      widths[id] = { total: Math.max(NODE_W, cw), lw: 0, rw: cw }
      return widths[id].total
    }
  }

  const place = (id, cx, y) => {
    if (!id || !nodes[id]) return
    const n = nodes[id]
    const td = ACTION_TYPES[n.type]
    pos[id] = { x: cx, y }
    const ny = y + NODE_H + V_GAP
    if (td?.branching) {
      const w = widths[id] || { lw: NODE_W, rw: NODE_W }
      const noX = cx - (w.lw / 2) - (H_GAP / 2)
      const yesX = cx + (w.rw / 2) + (H_GAP / 2)
      if (n.noChild)  { edges.push({ from: id, to: n.noChild,  label: 'NO',  color: '#ef4444' }); place(n.noChild, noX, ny) }
      if (n.yesChild) { edges.push({ from: id, to: n.yesChild, label: 'YES', color: '#10b981' }); place(n.yesChild, yesX, ny) }
    } else {
      if (n.yesChild) { edges.push({ from: id, to: n.yesChild, label: '', color: '#6366f1' }); place(n.yesChild, cx, ny) }
    }
  }

  measure(tree.rootId)
  place(tree.rootId, 0, 0)

  const xs = Object.values(pos).map(p => p.x)
  const ys = Object.values(pos).map(p => p.y)
  const minX = Math.min(...(xs.length ? xs : [0]))
  const maxX = Math.max(...(xs.length ? xs : [0]))
  const maxY = Math.max(...(ys.length ? ys : [0]))
  
  const pad = 160
  const treeW = maxX - minX + NODE_W
  const finalW = Math.max(treeW + pad * 2, 1000)

  // Align tree bounds exactly with final canvas width so margin: 0 auto correctly centers it
  const offsetX = (finalW / 2) - ((minX + maxX) / 2)

  const placedNodes = Object.entries(pos).map(([id, p]) => ({
    id, ...nodes[id], px: p.x + offsetX, py: p.y + 80
  }))
  const placedEdges = edges.map(e => ({
    ...e,
    sx: pos[e.from].x + offsetX, sy: pos[e.from].y + 80,
    tx: pos[e.to].x + offsetX,   ty: pos[e.to].y + 80,
    branching: ACTION_TYPES[nodes[e.from].type]?.branching
  }))

  return {
    nodes: placedNodes, edges: placedEdges,
    w: finalW,
    h: Math.max(maxY + NODE_H + 200, 600)
  }
}

// ─── Dropdown Picker (inline below + button) ─────────────────────
function DropdownPicker({ tree, pickerFor, addNode, setPickerFor }) {
  // Determine if we're under a send_invite YES path
  let isUnderSendInviteYes = false
  if (tree?.nodes) {
    const searchPath = (id, inYesPath) => {
      if (!id) return
      if (id === pickerFor.parentId) {
        if (tree.nodes[id].type === 'send_invite' && pickerFor.branch === 'yes') inYesPath = true
        isUnderSendInviteYes = inYesPath
        return
      }
      const n = tree.nodes[id]
      if (n.yesChild) searchPath(n.yesChild, n.type === 'send_invite' ? true : inYesPath)
      if (n.noChild) searchPath(n.noChild, n.type === 'send_invite' ? false : inYesPath)
    }
    searchPath(tree.rootId, false)
  }

  const hasSendInvite = Object.values(tree?.nodes || {}).some(n => n.type === 'send_invite')

  const items = Object.entries(ACTION_TYPES)
    .filter(([k]) => k !== 'start' && k !== 'delay' && !(k === 'send_message' && pickerFor.branch !== 'yes'))
    .filter(([k]) => !(k === 'send_invite' && hasSendInvite))

  return (
    <div data-interactive="true" className="absolute left-1/2 top-full mt-2 z-50" style={{ transform: 'translateX(-50%)' }}>
      <div className="rounded-2xl py-2 shadow-2xl min-w-[200px]"
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-light)' }}>
        {items.map(([key, td]) => {
          const color = COLORS[key]
          const isWithdrawDisabled = !hasSendInvite || isUnderSendInviteYes
          const isDisabled = (key === 'withdraw_invite' && isWithdrawDisabled)

          return (
            <button key={key}
              onClick={() => { if (!isDisabled) addNode(key) }}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${isDisabled ? 'opacity-35 cursor-not-allowed' : 'hover:bg-white/[.04]'}`}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}>
                <td.icon className="w-3.5 h-3.5" style={{ color: isDisabled ? 'var(--color-text-muted)' : color }} />
              </div>
              <span className={`text-[12px] font-semibold ${isDisabled ? 'text-text-muted' : 'text-text-primary'}`}>{td.label}</span>
              {td.branching && !isDisabled && (
                <span className="ml-auto text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(99,102,241,.12)', color: 'var(--color-primary-light)' }}>Split</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────
export default function CampaignBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [tab, setTab] = useState('sequence')
  const [campaign, setCampaign] = useState(null)
  const [tree, setTree] = useState(null)
  const [leads, setLeads] = useState([])
  const [schedule, setSchedule] = useState({ days: ['mon','tue','wed','thu','fri'], startTime: '09:00', endTime: '17:00', timezone: 'UTC' })
  const [configModal, setConfigModal] = useState(null) // { nodeId }
  const [pickerFor, setPickerFor] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [pipeline, setPipeline] = useState([])
  const [nodeLeadCounts, setNodeLeadCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const canvasRef = useRef(null)
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const scrollStart = useRef({ x: 0, y: 0 })

  const showToast = (text, type = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(`/api/campaigns/${id}`)
        const data = await res.json()
        setCampaign(data)
        setTree(data.sequence?.rootId ? data.sequence : mkTree())
        if (data.schedule?.startTime) setSchedule(data.schedule)
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    load()
    apiFetch(`/api/campaigns/${id}/leads`).then(r => r.json()).then(d => setLeads(d.leads || [])).catch(() => {})
    fetchPipeline()
  }, [id])

  const save = async () => {
    setSaving(true)
    try {
      await apiFetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: tree, schedule })
      })
      showToast('Saved successfully!')
    } catch { showToast('Save failed', 'error') } finally { setSaving(false) }
  }

  const toggleStatus = async () => {
    const next = campaign.status === 'active' ? 'paused' : 'active'
    await apiFetch(`/api/campaigns/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) })
    setCampaign(p => ({ ...p, status: next }))
  }

  const fetchPipeline = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        apiFetch(`/api/campaigns/${id}/pipeline`).then(r => r.json()),
        apiFetch(`/api/campaigns/${id}/stats`).then(r => r.json())
      ])
      setPipeline(pRes.pipeline || [])
      setNodeLeadCounts(sRes.nodeLeadCounts || {})
    } catch (e) { console.error('Pipeline fetch:', e) }
  }

  const unenrollLead = async (leadId) => {
    try {
      await apiFetch(`/api/campaigns/${id}/unenroll`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: [leadId] })
      })
      setPipeline(p => p.filter(l => l.lead_id !== leadId))
      setLeads(l => l.filter(x => x.id !== leadId))
      showToast('Lead unenrolled')
    } catch { showToast('Failed to unenroll', 'error') }
  }

  const updateConfig = (nodeId, key, val) =>
    setTree(t => ({ ...t, nodes: { ...t.nodes, [nodeId]: { ...t.nodes[nodeId], config: { ...t.nodes[nodeId].config, [key]: val } } } }))

  const addNode = (type) => {
    if (!pickerFor) return
    const { parentId, branch } = pickerFor
    const td = ACTION_TYPES[type]
    const newId = uid()
    // Auto-append a delay after this node (unless it's a delay or terminal itself)
    const shouldAutoDelay = type !== 'delay' && !td.terminal
    const delayId = shouldAutoDelay ? uid() : null
    setTree(t => {
      const ns = { ...t.nodes }
      ns[newId] = { id: newId, type, config: td.fields.reduce((a, f) => ({ ...a, [f.key]: f.default ?? '' }), {}), yesChild: delayId, noChild: null }
      if (delayId) ns[delayId] = { id: delayId, type: 'delay', config: { days: 1 }, yesChild: null, noChild: null }
      const p = { ...ns[parentId] }
      if (branch === 'no') p.noChild = newId; else p.yesChild = newId
      ns[parentId] = p
      return { ...t, nodes: ns }
    })
    setPickerFor(null)
    // Open config modal for nodes that have configurable fields
    if (td.fields.length > 0) setConfigModal({ nodeId: newId })
  }

  const deleteSubtree = (nodeId) => {
    setTree(t => {
      const ns = { ...t.nodes }
      const purge = (nid) => { if (!ns[nid]) return; const n = ns[nid]; if (n.yesChild) purge(n.yesChild); if (n.noChild) purge(n.noChild); delete ns[nid] }
      Object.values(ns).forEach(n => {
        if (n.yesChild === nodeId) ns[n.id] = { ...n, yesChild: null }
        if (n.noChild === nodeId)  ns[n.id] = { ...n, noChild: null }
      })
      purge(nodeId)
      return { ...t, nodes: ns }
    })
    if (configModal?.nodeId === nodeId) setConfigModal(null)
    setDeleteTarget(null)
  }

  const tryDelete = (nodeId) => {
    const n = tree.nodes[nodeId]
    if (n?.yesChild || n?.noChild) setDeleteTarget(nodeId)
    else deleteSubtree(nodeId)
  }

  const lyt = useMemo(() => layout(tree), [tree])

  // Pan handlers
  const panDown = (e) => {
    if (e.target.closest('[data-interactive]')) return
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    scrollStart.current = { x: canvasRef.current.scrollLeft, y: canvasRef.current.scrollTop }
    canvasRef.current.style.cursor = 'grabbing'
  }
  const panMove = (e) => {
    if (!dragging.current) return
    canvasRef.current.scrollLeft = scrollStart.current.x - (e.clientX - dragStart.current.x)
    canvasRef.current.scrollTop  = scrollStart.current.y - (e.clientY - dragStart.current.y)
  }
  const panUp = () => { dragging.current = false; if (canvasRef.current) canvasRef.current.style.cursor = 'grab' }

  const configNode = configModal?.nodeId && tree?.nodes[configModal.nodeId] ? tree.nodes[configModal.nodeId] : null
  const configDef  = configNode ? ACTION_TYPES[configNode.type] : null

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-bg-primary">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted text-sm font-medium">Loading campaign...</p>
      </div>
    </div>
  )

  return (
    <div className="flex-1 w-full min-h-0 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>

      {/* ── HEADER ── */}

      <header style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}
        className="h-[68px] shrink-0 flex items-center justify-between px-5 z-30">

        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/campaigns')}
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-[10px] font-black text-text-muted uppercase tracking-[.18em]">Campaign Builder</div>
            <h1 className="text-[16px] font-bold text-text-primary flex items-center gap-2 leading-tight">
              {campaign?.name}
              {campaign?.status === 'active' && <span className="w-2 h-2 rounded-full bg-success pulse-dot" />}
            </h1>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          {[['sequence', Zap, 'Sequence'], ['leads', Users, 'Leads'], ['schedule', Calendar, 'Schedule']].map(([key, Icon, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
              style={tab === key
                ? { background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-light)' }
                : { color: 'var(--color-text-muted)', border: '1px solid transparent' }}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleStatus}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all"
            style={campaign?.status === 'active'
              ? { background: 'rgba(245,158,11,.08)', color: 'var(--color-warning)', borderColor: 'rgba(245,158,11,.2)' }
              : { background: 'rgba(16,185,129,.08)', color: 'var(--color-success)', borderColor: 'rgba(16,185,129,.2)' }}>
            {campaign?.status === 'active' ? <><Pause className="w-3.5 h-3.5" />Pause</> : <><Play className="w-3.5 h-3.5" />Activate</>}
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
            <Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">

        {/* ══ SEQUENCE TAB ══ */}
        {tab === 'sequence' && (
          <div className="flex flex-1 min-h-0 overflow-hidden relative">

            {/* Canvas */}
            <div ref={canvasRef}
              className="flex-1 overflow-auto"
              style={{
                cursor: 'grab',
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                background: '#07070f'
              }}
              onMouseDown={panDown} onMouseMove={panMove} onMouseUp={panUp} onMouseLeave={panUp}>

              <div className="relative mx-auto my-0" style={{ width: lyt.w, height: lyt.h }}>

                {/* SVG Edges */}
                <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    {['yes','no','def'].map(k => (
                      <marker key={k} id={`arr-${k}`} viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M0 0 L8 4 L0 8z" fill={k==='yes'?'#10b981':k==='no'?'#ef4444':'#6366f1'} />
                      </marker>
                    ))}
                  </defs>
                  {lyt.edges.map((e, i) => {
                    let sx, sy, tx, ty, d
                    const r = 12 // corner radius

                    if (e.branching) {
                      // Elbow: exit side → go horizontal to tx → turn 90° down to target
                      sx = e.label === 'NO' ? e.sx - NODE_W / 2 : e.sx + NODE_W / 2
                      sy = e.sy
                      tx = e.tx
                      ty = e.ty - NODE_H / 2 - 4
                      const dir = tx > sx ? 1 : -1
                      // Horizontal line, rounded corner, then vertical line down
                      d = `M${sx},${sy} L${tx - dir * r},${sy} Q${tx},${sy} ${tx},${sy + r} L${tx},${ty}`
                    } else {
                      // Straight: bottom center to top center
                      sx = e.sx
                      sy = e.sy + NODE_H / 2
                      tx = e.tx
                      ty = e.ty - NODE_H / 2 - 4
                      const my = sy + (ty - sy) * 0.5
                      d = `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`
                    }

                    const mk = e.label === 'YES' ? 'url(#arr-yes)' : e.label === 'NO' ? 'url(#arr-no)' : 'url(#arr-def)'
                    // Label position: on the horizontal segment
                    const lx = sx + (tx - sx) * 0.35
                    const ly = sy - 12
                    return (
                      <g key={i}>
                        <path d={d} fill="none" stroke={e.color} strokeWidth="2" opacity={e.label ? 0.9 : 0.5}
                          markerEnd={mk} strokeDasharray={e.label ? undefined : '5,4'} />
                        {e.label && (
                          <g transform={`translate(${lx},${ly})`}>
                            <rect x="-16" y="-9" width="32" height="18" rx="5" fill="#0a0a14" />
                            <text textAnchor="middle" dy="4" fontSize="8" fontWeight="800" fill={e.color}>{e.label}</text>
                          </g>
                        )}
                      </g>
                    )
                  })}
                </svg>

                {/* Nodes */}
                {lyt.nodes.map(node => {
                  const td = ACTION_TYPES[node.type] || ACTION_TYPES.end
                  const Icon = td.icon
                  const color = COLORS[node.type] || '#6b7280'
                  const isConfigOpen = configModal?.nodeId === node.id
                  const rn = tree.nodes[node.id]

                  return (
                    <div key={node.id} data-interactive="true"
                      className="absolute group"
                      style={{ left: node.px, top: node.py, transform: 'translate(-50%,-50%)', width: NODE_W }}>

                      {/* Card */}
                      <div onClick={() => { if (td.fields.length > 0) setConfigModal({ nodeId: node.id }) }}
                        className={`relative rounded-2xl transition-all duration-200 overflow-hidden ${td.fields.length > 0 ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                        style={{
                          background: 'var(--color-bg-surface)',
                          border: `1.5px solid ${isConfigOpen ? color : 'var(--color-border)'}`,
                          boxShadow: isConfigOpen ? `0 0 0 3px ${color}22, 0 8px 32px #00000060` : '0 4px 20px #00000040',
                          height: NODE_H
                        }}>
                        {/* color strip */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: color }} />
                        <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: `${color}08` }} />

                        <div className="relative z-10 h-full flex items-center gap-3 px-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                            style={{ background: `${color}14`, borderColor: `${color}30` }}>
                            <Icon className="w-4.5 h-4.5" style={{ color, width: 18, height: 18 }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[9px] font-black uppercase tracking-[.18em] mb-0.5"
                              style={{ color: `${color}99` }}>{node.type.replace(/_/g, ' ')}</div>
                            <div className="text-[13px] font-bold text-text-primary truncate">{td.label}</div>
                            {node.type === 'delay' && node.config?.days && (
                              <div className="text-[10px] text-text-muted mt-0.5">{node.config.days} day{node.config.days !== 1 ? 's' : ''} wait</div>
                            )}
                          </div>
                          {td.fields.length > 0 && (
                            <div className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              style={{ background: `${color}18`, color }}>
                              Edit
                            </div>
                          )}
                        </div>

                        {/* Delete btn - shown on hover */}
                        {node.type !== 'start' && node.type !== 'delay' && (
                          <button data-interactive="true"
                            onClick={e => { e.stopPropagation(); tryDelete(node.id) }}
                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center
                              opacity-0 group-hover:opacity-100 transition-all z-20"
                            style={{ background: 'rgba(239,68,68,.15)', border: '1.5px solid rgba(239,68,68,.3)', color: '#ef4444' }}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}

                        {/* Lead count badge */}
                        {nodeLeadCounts[node.id] > 0 && (
                          <div className="absolute -top-2 -left-2 min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5 text-[9px] font-black z-20"
                            style={{ background: 'var(--color-primary)', color: 'white', boxShadow: '0 2px 8px rgba(99,102,241,.4)' }}>
                            {nodeLeadCounts[node.id]}
                          </div>
                        )}
                      </div>

                      {/* Branching add buttons on sides */}
                      {td.branching && (
                        <>
                          {/* NO branch - left side */}
                          {!rn?.noChild && (
                            <div className="absolute z-30" style={{ left: -48, top: NODE_H / 2, transform: 'translateY(-50%)' }}>
                              <div className="relative">
                                <button data-interactive="true"
                                  onClick={() => setPickerFor(pickerFor?.parentId === node.id && pickerFor?.branch === 'no' ? null : { parentId: node.id, branch: 'no' })}
                                  className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:scale-110"
                                  style={{ background: 'rgba(239,68,68,.1)', borderColor: 'rgba(239,68,68,.3)', color: '#ef4444' }}>
                                  <Plus className="w-4 h-4" />
                                </button>
                                {pickerFor?.parentId === node.id && pickerFor?.branch === 'no' && (
                                  <DropdownPicker tree={tree} pickerFor={pickerFor} addNode={addNode} setPickerFor={setPickerFor} />
                                )}
                              </div>
                            </div>
                          )}
                          {/* YES branch - right side */}
                          {!rn?.yesChild && (
                            <div className="absolute z-30" style={{ right: -48, top: NODE_H / 2, transform: 'translateY(-50%)' }}>
                              <div className="relative">
                                <button data-interactive="true"
                                  onClick={() => setPickerFor(pickerFor?.parentId === node.id && pickerFor?.branch === 'yes' ? null : { parentId: node.id, branch: 'yes' })}
                                  className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:scale-110"
                                  style={{ background: 'rgba(16,185,129,.1)', borderColor: 'rgba(16,185,129,.3)', color: '#10b981' }}>
                                  <Plus className="w-4 h-4" />
                                </button>
                                {pickerFor?.parentId === node.id && pickerFor?.branch === 'yes' && (
                                  <DropdownPicker tree={tree} pickerFor={pickerFor} addNode={addNode} setPickerFor={setPickerFor} />
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Non-branching add button below node */}
                      {!td.terminal && !td.branching && !rn?.yesChild && (
                        <div className="absolute left-0 right-0 flex justify-center mt-3" style={{ top: NODE_H }}>
                          <div className="relative">
                            <button data-interactive="true"
                              onClick={() => setPickerFor(pickerFor?.parentId === node.id ? null : { parentId: node.id, branch: 'yes' })}
                              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:scale-110"
                              style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-light)', color: 'var(--color-text-muted)' }}>
                              <Plus className="w-4 h-4" />
                            </button>
                            {pickerFor?.parentId === node.id && (
                              <DropdownPicker tree={tree} pickerFor={pickerFor} addNode={addNode} setPickerFor={setPickerFor} />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Confirm delete popup */}
                      {deleteTarget === node.id && (
                        <div data-interactive="true" className="absolute z-50 rounded-2xl p-4 shadow-2xl"
                          style={{ top: 0, left: NODE_W + 16, width: 240, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                            <span className="text-sm font-bold text-text-primary">Delete branch?</span>
                          </div>
                          <p className="text-[11px] text-text-muted mb-4">All downstream nodes will be permanently removed.</p>
                          <div className="flex gap-2">
                            <button onClick={e => { e.stopPropagation(); setDeleteTarget(null) }}
                              className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
                              style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                              Cancel
                            </button>
                            <button onClick={e => { e.stopPropagation(); deleteSubtree(node.id) }}
                              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                              style={{ background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', color: '#ef4444' }}>
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>


          </div>
        )}

        {/* ══ CONFIG POPUP MODAL ══ */}
        {configNode && configDef && (
          <div className="fixed inset-0 flex items-center justify-center z-[60]"
            style={{ background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)' }}
            onClick={() => setConfigModal(null)}>
            <div className="rounded-3xl shadow-2xl w-full max-w-md animate-fade-in"
              style={{ background: 'var(--color-bg-surface)', border: `1px solid ${COLORS[configNode.type]}30` }}
              onClick={e => e.stopPropagation()}>

              {/* Modal Header */}
              <div className="p-6 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
                    style={{ background: `${COLORS[configNode.type]}14`, borderColor: `${COLORS[configNode.type]}30` }}>
                    <configDef.icon className="w-5 h-5" style={{ color: COLORS[configNode.type] }} />
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[.18em] text-text-muted">Configure</div>
                    <div className="text-base font-bold text-text-primary">{configDef.label}</div>
                  </div>
                </div>
                <button onClick={() => setConfigModal(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                  style={{ background: 'var(--color-bg-elevated)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Fields */}
              <div className="p-6 space-y-5">
                {configDef.fields.map(f => {
                  if (f.showIf && !configNode.config?.[f.showIf]) return null

                  if (f.type === 'toggle') return (
                    <div key={f.key}>
                      <button className="w-full flex items-center justify-between p-4 rounded-xl transition-all"
                        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                        onClick={() => updateConfig(configModal.nodeId, f.key, !configNode.config?.[f.key])}>
                        <span className="text-sm font-semibold text-text-primary">{f.label}</span>
                        <div className="rounded-full transition-all relative shrink-0"
                          style={{ background: configNode.config?.[f.key] ? COLORS[configNode.type] : 'var(--color-bg-elevated)', width: 44, height: 24 }}>
                          <div className="absolute top-[3px] rounded-full bg-white transition-all shadow-sm"
                            style={{ width: 18, height: 18, left: configNode.config?.[f.key] ? 23 : 3 }} />
                        </div>
                      </button>
                    </div>
                  )

                  if (f.type === 'textarea') return (
                    <div key={f.key}>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block mb-2">{f.label}</label>
                      <textarea rows={5}
                        className="w-full rounded-xl p-3.5 text-sm resize-none outline-none transition-all"
                        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                        placeholder={f.placeholder}
                        value={configNode.config?.[f.key] || ''}
                        onChange={e => updateConfig(configModal.nodeId, f.key, e.target.value)}
                        onFocus={e => e.target.style.borderColor = COLORS[configNode.type]}
                        onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {['firstName','lastName','company','title'].map(tag => (
                          <button key={tag}
                            onClick={() => updateConfig(configModal.nodeId, f.key, (configNode.config?.[f.key] || '') + ` {{${tag}}}`)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all"
                            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                            +{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )

                  if (f.type === 'number') return (
                    <div key={f.key}>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block mb-2">{f.label}</label>
                      <div className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                        <button onClick={() => updateConfig(configModal.nodeId, f.key, Math.max(f.min||1, (configNode.config?.[f.key]||f.default||1) - 1))}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xl font-bold transition-colors"
                          style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}>−</button>
                        <input type="number" min={f.min} max={f.max}
                          className="flex-1 text-center font-bold text-xl outline-none bg-transparent text-text-primary"
                          value={configNode.config?.[f.key] ?? f.default}
                          onChange={e => updateConfig(configModal.nodeId, f.key, parseInt(e.target.value) || f.default)} />
                        <button onClick={() => updateConfig(configModal.nodeId, f.key, Math.min(f.max||90, (configNode.config?.[f.key]||f.default||1) + 1))}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xl font-bold transition-colors"
                          style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}>+</button>
                      </div>
                    </div>
                  )
                  return null
                })}
              </div>

              {/* Modal Footer */}
              <div className="px-6 pb-6 flex gap-3">
                {configNode.type !== 'start' && (
                  <button onClick={() => { tryDelete(configModal.nodeId); setConfigModal(null) }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#ef4444' }}>
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
                <button onClick={() => setConfigModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: `linear-gradient(135deg, ${COLORS[configNode.type]}, ${COLORS[configNode.type]}bb)` }}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}



        {/* ══ LEADS TAB (Pipeline View) ══ */}
        {tab === 'leads' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary">Lead Pipeline</h2>
                  <p className="text-sm text-text-muted mt-1">{pipeline.length} leads enrolled · Track their progress through the campaign</p>
                </div>
                <button onClick={fetchPipeline}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  ↻ Refresh
                </button>
              </div>

              {pipeline.length === 0 ? (
                <div className="text-center py-20 rounded-3xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                  <UserMinus className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-30" />
                  <p className="font-bold text-text-muted">No leads enrolled yet</p>
                  <p className="text-sm text-text-muted mt-1 opacity-60">Enroll leads from the Contacts page to start automation</p>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted"
                    style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                    <div className="col-span-4">Lead</div>
                    <div className="col-span-3">Current Step</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Next Run</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Table Body */}
                  {pipeline.map(pl => {
                    const nodeName = pl.current_node_id && tree?.nodes?.[pl.current_node_id]
                      ? (ACTION_TYPES[tree.nodes[pl.current_node_id].type]?.label || pl.current_node_id)
                      : 'Queued'
                    const statusColors = {
                      active: { bg: 'rgba(16,185,129,.1)', color: '#10b981' },
                      completed: { bg: 'rgba(99,102,241,.1)', color: '#6366f1' },
                      error: { bg: 'rgba(239,68,68,.1)', color: '#ef4444' },
                      paused: { bg: 'rgba(245,158,11,.1)', color: '#f59e0b' }
                    }
                    const sc = statusColors[pl.status] || statusColors.active

                    return (
                      <div key={pl.lead_id} className="grid grid-cols-12 gap-2 items-center px-5 py-3 hover:bg-white/[.02] transition-colors"
                        style={{ borderBottom: '1px solid var(--color-border)' }}>
                        {/* Lead info */}
                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0"
                            style={{ background: 'var(--color-primary)', opacity: 0.8, color: 'white' }}>
                            {pl.firstName?.[0]}{pl.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-text-primary truncate">{pl.firstName} {pl.lastName}</div>
                            <div className="text-[11px] text-text-muted truncate">{pl.title}{pl.company ? ` · ${pl.company}` : ''}</div>
                          </div>
                        </div>
                        {/* Current step */}
                        <div className="col-span-3">
                          <span className="text-xs font-semibold text-text-secondary">{nodeName}</span>
                        </div>
                        {/* Status */}
                        <div className="col-span-2">
                          <span className="text-[10px] px-2.5 py-1 rounded-lg font-black uppercase"
                            style={{ background: sc.bg, color: sc.color }}>{pl.status}</span>
                          {pl.error_message && (
                            <div className="text-[9px] text-danger mt-1 truncate" title={pl.error_message}>⚠ {pl.error_message}</div>
                          )}
                        </div>
                        {/* Next run */}
                        <div className="col-span-2 text-[11px] text-text-muted">
                          {pl.next_execution_at ? new Date(pl.next_execution_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                        {/* Actions */}
                        <div className="col-span-1 flex justify-end">
                          <button onClick={() => unenrollLead(pl.lead_id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Unenroll lead">
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ SCHEDULE TAB ══ */}
        {tab === 'schedule' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Execution Schedule</h2>
                <p className="text-sm text-text-muted mt-1">Control when the engine is allowed to run actions for this campaign.</p>
              </div>

              <div className="rounded-3xl p-7 space-y-7" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                {/* Active days */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[.18em] text-text-muted block mb-3">Active Days</label>
                  <div className="grid grid-cols-7 gap-2">
                    {['mon','tue','wed','thu','fri','sat','sun'].map(d => {
                      const on = schedule.days?.includes(d)
                      return (
                        <button key={d}
                          onClick={() => {
                            const days = on ? schedule.days.filter(x => x !== d) : [...(schedule.days || []), d]
                            setSchedule(s => ({ ...s, days }))
                          }}
                          className="py-3 rounded-xl text-[11px] font-black uppercase transition-all"
                          style={on
                            ? { background: 'var(--color-primary)', color: 'white', boxShadow: '0 4px 14px rgba(99,102,241,.3)' }
                            : { background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                          {d}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-text-muted mt-2">{schedule.days?.length || 0} days selected</p>
                </div>

                {/* Time window */}
                <div className="grid grid-cols-2 gap-4 pt-5" style={{ borderTop: '1px solid var(--color-border)' }}>
                  {[['startTime', 'Start Time'], ['endTime', 'End Time']].map(([key, lbl]) => (
                    <div key={key}>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block mb-2">{lbl}</label>
                      <input type="time"
                        className="w-full rounded-xl p-3.5 text-sm font-bold outline-none transition-all"
                        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                        value={schedule[key] || ''}
                        onChange={e => setSchedule(s => ({ ...s, [key]: e.target.value }))} />
                    </div>
                  ))}
                </div>

                {/* Timezone */}
                <div className="pt-5" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block mb-2">Timezone</label>
                  <select className="w-full rounded-xl p-3.5 text-sm font-medium outline-none appearance-none"
                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    value={schedule.timezone || 'UTC'}
                    onChange={e => setSchedule(s => ({ ...s, timezone: e.target.value }))}>
                    <option value="UTC">UTC (GMT+0)</option>
                    <option value="UTC-5">EST (UTC-5)</option>
                    <option value="UTC-6">CST (UTC-6)</option>
                    <option value="UTC-7">MST (UTC-7)</option>
                    <option value="UTC-8">PST (UTC-8)</option>
                    <option value="UTC+1">CET (UTC+1)</option>
                    <option value="UTC+2">EET (UTC+2)</option>
                    <option value="UTC+5:30">IST (UTC+5:30)</option>
                    <option value="UTC+6">BST Dhaka (UTC+6)</option>
                    <option value="UTC+8">CST Asia (UTC+8)</option>
                    <option value="UTC+9">JST (UTC+9)</option>
                  </select>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-2xl flex items-start gap-3"
                  style={{ background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.15)' }}>
                  <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-primary-light)' }} />
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-primary-light)' }}>
                    Engine will run on <strong>{schedule.days?.join(', ') || 'no days'}</strong> between <strong>{schedule.startTime}</strong> and <strong>{schedule.endTime}</strong> ({schedule.timezone}).
                    Remember to hit <strong>Save</strong> to persist these settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] animate-fade-in pointer-events-none">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md"
            style={{
              background: toast.type === 'error' ? 'rgba(239,68,68,.12)' : 'rgba(16,185,129,.12)',
              border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,.3)' : 'rgba(16,185,129,.3)'}`,
              color: toast.type === 'error' ? '#ef4444' : '#10b981'
            }}>
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            <span className="text-sm font-bold">{toast.text}</span>
          </div>
        </div>
      )}
    </div>
  )
}
