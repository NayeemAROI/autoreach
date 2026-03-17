import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Save, Plus, Trash2,
  UserPlus, Eye, ThumbsUp, Award, MessageCircle,
  MessageSquare, Clock, XCircle, X,
  AlertCircle, Rocket, Hash,
  Play, Pause, Menu, UserMinus, PlusCircle
} from 'lucide-react'
import { apiFetch } from '../utils/api'

// ─── Action Type Definitions ───
const ACTION_TYPES = {
  start: {
    label: 'Start Execution',
    icon: Rocket,
    color: '#3b82f6',
    bgClass: 'from-blue-500/20 to-blue-600/10',
    borderClass: 'border-blue-500/30',
    hasBranching: false,
    configFields: []
  },
  send_invite: {
    label: 'Send Invite',
    icon: UserPlus,
    color: '#6366f1',
    bgClass: 'from-indigo-500/20 to-indigo-600/10',
    borderClass: 'border-indigo-500/30',
    hasBranching: true,
    conditionLabel: 'Invite Accepted?',
    configFields: [
      { key: 'withNote', type: 'toggle', label: 'Include Note (Premium)', default: false },
      { key: 'note', type: 'textarea', label: 'Connection Note', placeholder: 'Hi {{firstName}}, I\\'d love to connect...', showIf: 'withNote' },
    ]
  },
  view_profile: {
    label: 'View Profile',
    icon: Eye,
    color: '#8b5cf6',
    bgClass: 'from-violet-500/20 to-violet-600/10',
    borderClass: 'border-violet-500/30',
    hasBranching: false,
    configFields: []
  },
  like_post: {
    label: 'Like Recent Post',
    icon: ThumbsUp,
    color: '#3b82f6',
    bgClass: 'from-blue-500/20 to-blue-600/10',
    borderClass: 'border-blue-500/30',
    hasBranching: false,
    configFields: []
  },
  endorse: {
    label: 'Endorse Skills',
    icon: Award,
    color: '#f59e0b',
    bgClass: 'from-amber-500/20 to-amber-600/10',
    borderClass: 'border-amber-500/30',
    hasBranching: false,
    configFields: []
  },
  comment: {
    label: 'Comment on Post',
    icon: MessageCircle,
    color: '#10b981',
    bgClass: 'from-emerald-500/20 to-emerald-600/10',
    borderClass: 'border-emerald-500/30',
    hasBranching: false,
    configFields: [
      { key: 'message', type: 'textarea', label: 'Comment Text', placeholder: 'Great insight! Thanks for sharing...' }
    ]
  },
  send_message: {
    label: 'Send Message',
    icon: MessageSquare,
    color: '#06b6d4',
    bgClass: 'from-cyan-500/20 to-cyan-600/10',
    borderClass: 'border-cyan-500/30',
    hasBranching: true,
    conditionLabel: 'Replied?',
    configFields: [
      { key: 'message', type: 'textarea', label: 'Message Content', placeholder: 'Hi {{firstName}}, I wanted to reach out about...' }
    ]
  },
  withdraw_invite: {
    label: 'Withdraw Invite',
    icon: UserMinus,
    color: '#ef4444',
    bgClass: 'from-red-500/20 to-red-600/10',
    borderClass: 'border-red-500/30',
    hasBranching: false,
    configFields: []
  },
  delay: {
    label: 'Delay',
    icon: Clock,
    color: '#9ca3af',
    bgClass: 'from-gray-500/20 to-gray-600/10',
    borderClass: 'border-gray-500/30',
    hasBranching: false,
    configFields: [
      { key: 'days', type: 'number', label: 'Wait (days)', default: 1, min: 1, max: 90 }
    ]
  },
  end: {
    label: 'End',
    icon: XCircle,
    color: '#6b7280',
    bgClass: 'from-gray-600/20 to-gray-700/10',
    borderClass: 'border-gray-600/30',
    hasBranching: false,
    configFields: [],
    isTerminal: true
  }
}

let nodeCounter = 0
function makeNodeId() {
  return `node_${Date.now()}_${++nodeCounter}`
}

function createDefaultTree() {
  const startId = makeNodeId()
  return {
    rootId: startId,
    nodes: {
      [startId]: {
        id: startId,
        type: 'start',
        config: {},
        yesChild: null,
        noChild: null,
      }
    }
  }
}

// Layout Constants
const NODE_W = 260
const NODE_H = 100
const COND_H = 40  // Additional height for branch split UI
const GAP_X = 60
const GAP_Y = 80

/**
 * Calculates tree layout with bottom-up width accumulation and top-down positioning.
 */
function calculateLayout(tree) {
  if (!tree || !tree.rootId || !tree.nodes[tree.rootId]) return { nodes: [], edges: [], width: 0, height: 0 }

  const widths = {}
  const positions = {}
  const edges = []
  let maxX = -Infinity
  let maxY = -Infinity
  let minX = Infinity

  // Pass 1: recursive compute subtree total width required
  const measureWidth = (nodeId) => {
    if (!nodeId || !tree.nodes[nodeId]) return 0
    const node = tree.nodes[nodeId]
    const typeDef = ACTION_TYPES[node.type]

    let width = NODE_W
    let leftW = 0
    let rightW = 0

    if (typeDef?.hasBranching) {
      leftW = measureWidth(node.noChild)
      rightW = measureWidth(node.yesChild)
      // For branching nodes, we need enough horizontal space to fit both subtrees + gap
      const branchReqW = (leftW > 0 ? leftW : NODE_W) + (rightW > 0 ? rightW : NODE_W) + GAP_X
      width = Math.max(width, branchReqW)
    } else {
      // Linear node, width is just the max of us and our single child subtree
      rightW = measureWidth(node.yesChild) // for linear, we store it in yesChild
      width = Math.max(width, rightW > 0 ? rightW : NODE_W)
    }

    widths[nodeId] = { w: width, leftW, rightW }
    return width
  }

  measureWidth(tree.rootId)

  // Pass 2: assign absolute x/y
  const assignPositions = (nodeId, x, y) => {
    if (!nodeId || !tree.nodes[nodeId]) return
    const node = tree.nodes[nodeId]
    const typeDef = ACTION_TYPES[node.type]
    const wData = widths[nodeId]

    positions[nodeId] = { x, y }
    
    // Tracking bounds
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y

    const nextY = y + NODE_H + GAP_Y + (typeDef?.hasBranching ? COND_H : 0)

    if (typeDef?.hasBranching) {
      // Center branching logic proportionally based on child widths
      const leftSubW = wData.leftW > 0 ? wData.leftW : NODE_W
      const rightSubW = wData.rightW > 0 ? wData.rightW : NODE_W
      
      const leftCenter = x - (leftSubW / 2) - (GAP_X / 2)
      const rightCenter = x + (rightSubW / 2) + (GAP_X / 2)

      if (node.noChild) {
        edges.push({ source: nodeId, target: node.noChild, label: 'NO', color: '#ef4444' })
        assignPositions(node.noChild, leftCenter, nextY)
      }
      if (node.yesChild) {
        edges.push({ source: nodeId, target: node.yesChild, label: 'YES', color: '#10b981' })
        assignPositions(node.yesChild, rightCenter, nextY)
      }
    } else {
      if (node.yesChild) {
        edges.push({ source: nodeId, target: node.yesChild, label: '', color: '#3b82f6' })
        assignPositions(node.yesChild, x, nextY)
      }
    }
  }

  assignPositions(tree.rootId, 0, 0)

  // Normalize all coordinates so minX is around 0
  const offsetX = -minX + (NODE_W/2) + 100 // Extra padding
  const nodes = Object.entries(positions).map(([id, pos]) => ({
    id,
    ...tree.nodes[id],
    x: pos.x + offsetX,
    y: pos.y + 100 // Top padding
  }))

  edges.forEach(e => {
    e.sourcePos = { x: positions[e.source].x + offsetX, y: positions[e.source].y + 100 }
    e.targetPos = { x: positions[e.target].x + offsetX, y: positions[e.target].y + 100 }
    e.sourceHasBranching = ACTION_TYPES[tree.nodes[e.source].type]?.hasBranching || false
  })

  return {
    nodes,
    edges,
    bounds: {
      width: (maxX - minX) + NODE_W + 200,
      height: maxY + NODE_H + 300
    }
  }
}


// ─── Main Component ───
export default function CampaignBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('sequence') // sequence | leads | schedule
  const [campaign, setCampaign] = useState(null)
  
  const [tree, setTree] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [showPicker, setShowPicker] = useState(null) // { parentId, branch: 'yes'|'no' }
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  
  const [enrolledLeads, setEnrolledLeads] = useState([])
  
  const [schedule, setSchedule] = useState({
    timezone: 'UTC',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startTime: '09:00',
    endTime: '17:00'
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Load campaign
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(`/api/campaigns/${id}`)
        const data = await res.json()
        setCampaign(data)

        if (data.sequence && typeof data.sequence === 'object' && data.sequence.rootId) {
          setTree(data.sequence)
        } else {
          setTree(createDefaultTree())
        }

        if (data.schedule && data.schedule.startTime) {
          setSchedule(data.schedule)
        }

        fetchEnrolledLeads()
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const fetchEnrolledLeads = async () => {
    try {
      const res = await apiFetch(`/api/campaigns/${id}/leads`)
      const data = await res.json()
      setEnrolledLeads(data.leads || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: tree, schedule })
      })
      showToast('Campaign Settings Saved!')
    } catch (err) {
      console.error(err)
      showToast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleCampaignStatus = async () => {
    if (!campaign) return
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    try {
      await apiFetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      setCampaign(prev => ({ ...prev, status: newStatus }))
    } catch (err) {
      console.error(err)
    }
  }

  // ——— Tree Mutations ———
  const handleUpdateConfig = (nodeId, key, value) => {
    setTree(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: {
          ...prev.nodes[nodeId],
          config: { ...prev.nodes[nodeId].config, [key]: value }
        }
      }
    }))
  }

  const handleAddAction = (actionType) => {
    if (!showPicker) return
    const { parentId, branch } = showPicker
    const newId = makeNodeId()
    const typeDef = ACTION_TYPES[actionType]

    setTree(prev => {
      const nextNodes = { ...prev.nodes }
      // Add new node
      nextNodes[newId] = {
        id: newId,
        type: actionType,
        config: typeDef.configFields.reduce((acc, f) => ({...acc, [f.key]: f.default !== undefined ? f.default : ''}), {}),
        yesChild: null,
        noChild: null
      }
      
      // Link parent
      const parent = { ...nextNodes[parentId] }
      if (branch === 'no') {
        parent.noChild = newId
      } else {
        parent.yesChild = newId // also used for non-branching linear flow
      }
      nextNodes[parentId] = parent

      return { ...prev, nodes: nextNodes }
    })
    
    setShowPicker(null)
    setSelectedNodeId(newId)
  }

  const handleDeleteSubtree = (nodeId) => {
    if (nodeId === tree.rootId) return // Cannot delete start node

    setTree(prev => {
      const nextNodes = { ...prev.nodes }
      
      // 1. Remove reference from parent
      Object.values(nextNodes).forEach(n => {
        if (n.yesChild === nodeId) nextNodes[n.id] = { ...n, yesChild: null }
        if (n.noChild === nodeId) nextNodes[n.id] = { ...n, noChild: null }
      })

      // 2. Recursive delete children to prevent memory leaks in JSON
      const purge = (id) => {
        if (!nextNodes[id]) return
        const node = nextNodes[id]
        if (node.yesChild) purge(node.yesChild)
        if (node.noChild) purge(node.noChild)
        delete nextNodes[id]
      }
      purge(nodeId)

      return { ...prev, nodes: nextNodes }
    })
    
    if (selectedNodeId === nodeId) setSelectedNodeId(null)
    setConfirmDeleteId(null)
  }

  const attemptDelete = (nodeId) => {
    const node = tree.nodes[nodeId]
    if (node.yesChild || node.noChild) {
      setConfirmDeleteId(nodeId) // Show warning if deleting branch
    } else {
      handleDeleteSubtree(nodeId)
    }
  }


  // ——— Render Parts ———
  const layout = useMemo(() => calculateLayout(tree), [tree])
  
  // Pan and Zoom logic
  const panRef = useRef(null)
  const isDragging = useRef(false)
  const startPos = useRef({x: 0, y: 0})
  const currentScroll = useRef({x: 0, y: 0})

  const onMouseDownPan = (e) => {
    if (e.target.closest('.node-interactive')) return // Don't drag if clicking nodes
    isDragging.current = true
    startPos.current = { x: e.clientX, y: e.clientY }
    currentScroll.current = { x: panRef.current.scrollLeft, y: panRef.current.scrollTop }
    panRef.current.style.cursor = 'grabbing'
  }
  const onMouseMovePan = (e) => {
    if (!isDragging.current) return
    const dx = e.clientX - startPos.current.x
    const dy = e.clientY - startPos.current.y
    panRef.current.scrollLeft = currentScroll.current.x - dx
    panRef.current.scrollTop = currentScroll.current.y - dy
  }
  const onMouseUpPan = () => {
    isDragging.current = false
    if(panRef.current) panRef.current.style.cursor = 'grab'
  }

  // Define colors directly in case custom classes are removed
  const typeColors = {
    start: '#3b82f6',
    send_invite: '#6366f1',
    view_profile: '#8b5cf6',
    like_post: '#3b82f6',
    endorse: '#f59e0b',
    comment: '#10b981',
    send_message: '#06b6d4',
    withdraw_invite: '#ef4444',
    delay: '#9ca3af',
    end: '#6b7280'
  }


  if (loading) return <div className="p-8 text-primary">Loading Editor...</div>

  return (
    <div className="w-full h-screen max-h-[100vh] overflow-hidden flex flex-col bg-bg-primary" style={{ padding: '0 !important' }}>
      {/* HEADER */}
      <header className="h-[76px] shrink-0 border-b border-border/50 bg-bg-surface flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/campaigns')} className="w-10 h-10 rounded-xl flex items-center justify-center bg-bg-secondary hover:bg-bg-elevated text-text-primary transition-all border border-border/50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">Campaign Builder</div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-3">
              {campaign?.name}
              {campaign?.status === 'active' && <div className="w-2 h-2 rounded-full bg-success pulse-dot" />}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-bg-secondary p-1.5 rounded-xl border border-border/50">
          {['sequence', 'leads', 'schedule'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-xs font-bold capitalize transition-all duration-200 ${
                activeTab === tab 
                  ? 'bg-bg-surface text-text-primary shadow border border-border/50' 
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleCampaignStatus}
            className={`btn btn-sm ${campaign?.status === 'active' ? 'bg-bg-elevated text-warning hover:bg-bg-secondary border-border/50' : 'btn-primary'} rounded-xl px-5 flex items-center gap-2`}
          >
            {campaign?.status === 'active' ? <><Pause className="w-3.5 h-3.5"/> Pause</> : <><Play className="w-3.5 h-3.5"/> Activate</>}
          </button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm rounded-xl px-5 flex items-center gap-2 font-bold disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex-1 min-h-0 relative flex">
        
        {/* === SEQUENCE CANVAS TAB === */}
        {activeTab === 'sequence' && (
          <div className="relative flex-1 flex w-full h-full">
            {/* The Pan/Scroll canvas */}
            <div 
              ref={panRef}
              className="absolute inset-0 overflow-auto custom-scrollbar cursor-grab active:cursor-grabbing bg-[#05050A]"
              onMouseDown={onMouseDownPan}
              onMouseMove={onMouseMovePan}
              onMouseUp={onMouseUpPan}
              onMouseLeave={onMouseUpPan}
              // Subtle grid background overlay directly in div style
              style={{
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                backgroundSize: '30px 30px'
              }}
            >
              <div 
                className="relative mx-auto my-0 scale-[0.85] origin-top transform-gpu" 
                style={{ width: layout.bounds.width, height: layout.bounds.height, minWidth: '100vw', minHeight: '100vh' }}
              >
                {/* 1. Edges (SVG) */}
                <svg className="absolute inset-0 pointer-events-none z-0" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <marker id="arrow-yes" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                       <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                    </marker>
                    <marker id="arrow-no" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                       <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                    </marker>
                    <marker id="arrow-def" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                       <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" opacity="0.4" />
                    </marker>
                  </defs>

                  {layout.edges.map(e => {
                    const sx = e.sourcePos.x
                    // If source is branching, start the arrow slightly lower because of the split boxes
                    const sy = e.sourcePos.y + (NODE_H/2) + (e.sourceHasBranching ? COND_H : 0)
                    const tx = e.targetPos.x
                    const ty = e.targetPos.y - (NODE_H/2) - 4 // spacing for arrowhead

                    const midY = sy + ((ty - sy) / 2)
                    const d = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`
                    
                    const isYes = e.label === 'YES'
                    const isNo = e.label === 'NO'
                    const color = isYes ? '#10b981' : isNo ? '#ef4444' : '#3b82f6'
                    const marker = isYes ? 'url(#arrow-yes)' : isNo ? 'url(#arrow-no)' : 'url(#arrow-def)'

                    return (
                      <g key={e.source + '-' + e.target}>
                        <path 
                          d={d} 
                          fill="none" 
                          stroke={color} 
                          strokeWidth="2.5"
                          opacity={isYes||isNo ? 0.8 : 0.4}
                          markerEnd={marker} 
                          className={isYes||isNo ? '' : 'stroke-dasharray-4'}
                        />
                        {e.label && (
                          <g transform={`translate(${sx + (tx - sx)*0.2}, ${sy + (ty - sy)*0.2})`}>
                            <rect x="-14" y="-8" width="28" height="16" rx="4" fill="#0f111a" />
                            <text textAnchor="middle" dy="4" fontSize="9" fontWeight="800" fill={color}>{e.label}</text>
                          </g>
                        )}
                      </g>
                    )
                  })}
                </svg>

                {/* 2. Nodes */}
                {layout.nodes.map(node => {
                  const typeDef = ACTION_TYPES[node.type] || ACTION_TYPES.end
                  const Icon = typeDef.icon
                  const isSelected = selectedNodeId === node.id
                  const isEnd = typeDef.isTerminal

                  return (
                    <div 
                      key={node.id}
                      className="absolute group z-10 node-interactive"
                      style={{ 
                        left: node.x, top: node.y, 
                        transform: 'translate(-50%, -50%)', 
                        width: NODE_W 
                      }}
                    >
                      {/* NODE CARD */}
                      <div 
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`
                          relative w-full rounded-2xl bg-bg-surface border shadow-2xl cursor-pointer transition-all duration-300 overflow-hidden
                          ${isSelected ? \`ring-2 ring-primary border-transparent\` : \`border-border/50 hover:border-border\`}
                        `}
                      >
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundColor: typeColors[node.type] }} />

                        <div className="p-4 flex items-center gap-4 relative z-10">
                          
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner shrink-0 bg-bg-secondary"
                               style={{ borderColor: \`\${typeColors[node.type]}30\` }}>
                            <Icon className="w-5 h-5 pointer-events-none" style={{ color: typeColors[node.type] }} />
                          </div>

                          <div className="flex-1 min-w-0 pr-4">
                             <div className="text-[10px] font-black text-text-muted/60 uppercase tracking-widest mb-1 leading-none">{node.type.replace('_',' ')}</div>
                             <h4 className="text-[14px] font-bold text-text-primary truncate leading-tight tracking-tight">{typeDef.label}</h4>
                          </div>
                        </div>

                        {/* DELETE BUTTON (Hover) */}
                        {!isSelected && node.type !== 'start' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); attemptDelete(node.id); }}
                            className="absolute -right-2 -top-2 w-8 h-8 rounded-full bg-danger/10 border border-danger/30 text-danger flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-danger hover:text-white z-20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* BRANCH UI OR ADD BUTTON (Only if not terminal) */}
                      {!isEnd && (
                        <div className="absolute left-0 right-0 flex justify-center mt-3 pointer-events-auto">
                           {typeDef.hasBranching ? (
                             // Splitting UI 
                             <div className="flex w-[80%] justify-between mt-1 relative">
                               {/* Central line coming down */}
                               <div className="absolute left-1/2 bottom-[110%] w-px h-[20px] bg-border -translate-x-1/2 pointer-events-none" />
                               
                               {/* YES ADD */}
                               {!node.yesChild ? (
                                  <button onClick={() => setShowPicker({ parentId: node.id, branch: 'yes' })} 
                                          className="w-10 h-10 rounded-xl bg-success/10 border border-success/30 text-success hover:bg-success hover:text-white transition-all flex items-center justify-center shadow-lg ml-auto">
                                    <Plus className="w-4 h-4"/>
                                  </button>
                               ) : <div className="w-10" />}

                               {/* NO ADD */}
                               {!node.noChild ? (
                                  <button onClick={() => setShowPicker({ parentId: node.id, branch: 'no' })} 
                                          className="w-10 h-10 rounded-xl bg-danger/10 border border-danger/30 text-danger hover:bg-danger hover:text-white transition-all flex items-center justify-center shadow-lg mr-auto">
                                    <Plus className="w-4 h-4"/>
                                  </button>
                               ) : <div className="w-10" />}
                             </div>
                           ) : (
                             // Linear Add UI
                             !node.yesChild && (
                               <button onClick={() => setShowPicker({ parentId: node.id, branch: 'yes' })} 
                                       className="w-10 h-10 rounded-xl bg-bg-surface border border-border text-text-muted hover:bg-bg-elevated hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center shadow-xl">
                                 <Plus className="w-4 h-4"/>
                               </button>
                             )
                           )}
                        </div>
                      )}

                      {/* Confirm Delete Overlay Bubble */}
                      {confirmDeleteId === node.id && (
                        <div className="absolute top-0 right-[-270px] w-64 bg-bg-surface p-4 rounded-xl shadow-2xl z-50 text-sm border border-border pointer-events-auto shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                           <div className="font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-danger"/> Delete branch?</div>
                           <div className="text-text-muted mb-4 text-xs">All downstream modules will be destroyed. This cannot be undone.</div>
                           <div className="flex gap-2">
                             <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="flex-1 btn btn-secondary py-1.5 px-0 h-auto text-xs">Cancel</button>
                             <button onClick={(e) => { e.stopPropagation(); handleDeleteSubtree(node.id); }} className="flex-1 btn bg-danger/10 text-danger border-danger/30 hover:bg-danger hover:text-white py-1.5 px-0 h-auto text-xs">Purge</button>
                           </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ACTION PICKER MODAL */}
            {showPicker && (
               <div className="absolute inset-0 bg-black/60 backdrop-blur z-50 flex items-center justify-center animate-in fade-in cursor-default node-interactive" onClick={() => setShowPicker(null)}>
                  <div className="bg-bg-surface w-full max-w-3xl rounded-[2rem] border border-border/50 shadow-2xl p-8 transform animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                     <div className="flex justify-between items-center mb-6">
                       <div>
                         <h2 className="text-xl font-bold text-text-primary">Add Module</h2>
                         <p className="text-sm text-text-muted">Select the next action to perform</p>
                       </div>
                       <button onClick={() => setShowPicker(null)} className="p-2 hover:bg-bg-elevated rounded-xl text-text-muted transition-colors"><X className="w-5 h-5"/></button>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       {Object.entries(ACTION_TYPES).filter(([k,v]) => k!=='start').map(([key, config]) => {
                         const Icon = config.icon
                         return (
                           <button
                             key={key}
                             onClick={() => handleAddAction(key)}
                             className="p-4 rounded-2xl border border-border/50 bg-bg-secondary hover:bg-bg-elevated hover:border-border transition-all text-left group relative overflow-hidden"
                           >
                             <div className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity" style={{ backgroundColor: typeColors[key] }} />
                             
                             <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-inner bg-bg-surface border border-border/50">
                               <Icon className="w-5 h-5 pointer-events-none" style={{ color: typeColors[key] }} />
                             </div>
                             <h4 className="text-sm font-bold text-text-primary mb-1 group-hover:text-primary-light transition-colors">{config.label}</h4>
                             {config.hasBranching && <div className="text-[10px] text-info uppercase tracking-widest font-black mt-2 bg-info/10 inline-block px-2 py-0.5 rounded-md">Branching</div>}
                           </button>
                         )
                       })}
                     </div>
                  </div>
               </div>
            )}

            {/* CONFIG HUD (Right Sidebar) */}
            {selectedNodeId && tree?.nodes[selectedNodeId] && (
               <div className="absolute right-6 top-6 bottom-6 w-80 bg-bg-surface/95 backdrop-blur-xl border border-border rounded-[2rem] shadow-2xl flex flex-col z-40 animate-in slide-in-from-right overflow-hidden node-interactive">
                  {(() => {
                    const node = tree.nodes[selectedNodeId]
                    const typeDef = ACTION_TYPES[node.type]
                    const Icon = typeDef.icon
                    return (
                      <>
                        <div className="p-6 border-b border-border/50 shrink-0 bg-bg-secondary/50">
                          <div className="flex justify-between items-start mb-4">
                             <div className="flex gap-3 items-center">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-bg-surface border border-border/50 shadow-sm" style={{ color: typeColors[node.type] }}>
                                   <Icon className="w-5 h-5"/>
                                </div>
                                <div>
                                   <div className="text-[9px] font-black text-text-muted/60 uppercase tracking-[0.2em] mb-0.5">Module Settings</div>
                                   <h3 className="text-[15px] font-bold text-text-primary leading-tight">{typeDef.label}</h3>
                                </div>
                             </div>
                             <button onClick={() => setSelectedNodeId(null)} className="text-text-muted hover:text-text-primary bg-bg-surface p-1.5 rounded-lg border border-border/50"><X className="w-4 h-4"/></button>
                          </div>
                          {typeDef.hasBranching && (
                             <div className="bg-info/10 border border-info/20 p-3 rounded-xl flex gap-2">
                               <AlertCircle className="w-4 h-4 text-info shrink-0"/>
                               <p className="text-[11px] text-info font-medium leading-tight">Flow splits based on <span className="underline font-bold delay-100">{typeDef.conditionLabel}</span></p>
                             </div>
                          )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-bg-surface">
                           {typeDef.configFields.length === 0 ? (
                             <div className="text-center py-10 opacity-50">
                               <Hash className="w-6 h-6 mx-auto mb-3 text-text-muted"/>
                               <p className="text-[11px] uppercase tracking-widest font-black text-text-muted">No configurations</p>
                             </div>
                           ) : (
                             typeDef.configFields.map(f => {
                               if (f.showIf && !node.config?.[f.showIf]) return null
                               if (f.type === 'textarea') return (
                                 <div key={f.key}>
                                    <label className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-2">{f.label}</label>
                                    <textarea 
                                      className="w-full bg-bg-secondary border border-border rounded-xl p-3 text-sm text-text-primary focus:border-primary outline-none min-h-[140px] resize-y placeholder:text-text-muted/40"
                                      value={node.config?.[f.key] || ''}
                                      onChange={e => handleUpdateConfig(node.id, f.key, e.target.value)}
                                      placeholder={f.placeholder}
                                    />
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {['firstName', 'lastName', 'company'].map(tag => (
                                        <button 
                                          key={tag}
                                          onClick={() => handleUpdateConfig(node.id, f.key, (node.config?.[f.key] || '') + \` {{\${tag}}}\`)}
                                          className="px-2.5 py-1 rounded bg-bg-secondary border border-border/50 text-[10px] font-bold text-text-muted hover:text-primary-light hover:border-primary/30 transition-all font-mono"
                                        >
                                          + {tag}
                                        </button>
                                      ))}
                                    </div>
                                 </div>
                               )
                               if (f.type === 'number') return (
                                 <div key={f.key} className="flex justify-between items-center bg-bg-secondary p-3 rounded-xl border border-border/50">
                                    <label className="text-[10px] font-black uppercase text-text-muted tracking-widest">{f.label}</label>
                                    <input type="number" min={f.min} max={f.max}
                                           className="w-16 bg-bg-surface flex items-center text-center font-bold outline-none border border-border rounded-lg py-1.5 px-2 focus:border-primary text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                           value={node.config?.[f.key] ?? f.default}
                                           onChange={e => handleUpdateConfig(node.id, f.key, parseInt(e.target.value)||f.default)} />
                                 </div>
                               )
                               if (f.type === 'toggle') return (
                                 <div key={f.key} className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border/50 cursor-pointer hover:bg-bg-elevated transition-colors" onClick={() => handleUpdateConfig(node.id, f.key, !node.config?.[f.key])}>
                                   <label className="text-xs font-bold text-text-primary pointer-events-none">{f.label}</label>
                                   <div className={`w-10 h-5 rounded-full p-1 transition-all shadow-inner ${node.config?.[f.key] ? 'bg-primary' : 'bg-border'}`}>
                                      <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${node.config?.[f.key] ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                                   </div>
                                 </div>
                               )
                             })
                           )}
                        </div>
                        {node.type !== 'start' && (
                           <div className="p-5 shrink-0 border-t border-border/50 bg-bg-secondary/30">
                              <button onClick={() => attemptDelete(node.id)} className="w-full py-2.5 rounded-xl bg-danger/5 border border-danger/20 text-danger hover:bg-danger hover:text-white transition-all font-bold text-xs flex justify-center items-center gap-2">
                                <Trash2 className="w-4 h-4"/> Destroy Module
                              </button>
                           </div>
                        )}
                      </>
                    )
                  })()}
               </div>
            )}
          </div>
        )}

        {/* === LEADS TAB (Legacy compatibility) === */}
        {activeTab === 'leads' && (
          <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar">
             <div className="max-w-4xl mx-auto space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2">Enrolled Leads</h2>
                  <p className="text-text-muted text-sm">Leads currently traversing this campaign sequence. Enrollment handled via Contacts page.</p>
                </div>
                {enrolledLeads.length === 0 ? (
                  <div className="glass-card p-12 text-center text-text-muted border border-border/50">
                     <UserMinus className="w-12 h-12 mx-auto mb-4 opacity-30"/>
                     <p className="font-bold">No leads enrolled.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                     {enrolledLeads.map(lead => (
                       <div key={lead.id} className="glass-card p-4 rounded-xl flex items-center justify-between hover:border-border transition-colors">
                         <div className="flex items-center gap-4">
                           {lead.avatar ? (
                             <img src={lead.avatar} alt="" className="w-10 h-10 rounded-full bg-bg-secondary object-cover" />
                           ) : (
                             <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                               {lead.firstName?.[0]}{lead.lastName?.[0]}
                             </div>
                           )}
                           <div>
                              <div className="font-bold text-text-primary text-[15px]">{lead.firstName} {lead.lastName}</div>
                              <div className="text-xs text-text-muted mt-0.5">{lead.title} {lead.company ? \`at \${lead.company}\` : ''} 
                                {lead.isPremium ? <span className="text-accent ml-2 text-[9px] bg-accent/10 px-1.5 py-0.5 rounded font-black uppercase inline-block -translate-y-[1px]">Premium</span> : ''}
                              </div>
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center ${lead.verification_status === 'verified' ? 'bg-success/10 text-success' : lead.verification_status === 'error' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                             {lead.verification_status}
                           </span>
                           {lead.linkedinUrl && (
                             <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="btn btn-secondary py-1.5 px-3 text-xs h-auto bg-bg-surface border-border/50 text-text-muted hover:text-text-primary">Profile</a>
                           )}
                         </div>
                       </div>
                     ))}
                  </div>
                )}
             </div>
          </div>
        )}

        {/* === SCHEDULE TAB === */}
        {activeTab === 'schedule' && (
          <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar">
             <div className="max-w-2xl mx-auto space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2">Execution Schedule</h2>
                  <p className="text-text-muted text-sm">Define when the automation engine is allowed to perform actions for this campaign.</p>
                </div>

                <div className="space-y-6 glass-card rounded-[2rem] p-8">
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-4 ml-1">Active Days</label>
                    <div className="flex gap-2">
                      {['mon','tue','wed','thu','fri','sat','sun'].map(day => {
                        const active = schedule.days?.includes(day)
                        return (
                          <button key={day} onClick={() => {
                            const newDays = active ? schedule.days.filter(d => d !== day) : [...(schedule.days||[]), day]
                            setSchedule(s => ({...s, days: newDays}))
                          }}
                          className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase transition-all ${active ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-bg-surface border-border/50 text-text-muted hover:bg-bg-elevated'}`}>
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border/50">
                    <div>
                      <label className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-3 ml-1">Start Time</label>
                      <input type="time" className="w-full bg-bg-surface border border-border/50 rounded-xl p-3.5 text-text-primary focus:border-primary outline-none text-sm font-bold shadow-inner" 
                             value={schedule.startTime || ''} onChange={e => setSchedule(s => ({...s, startTime: e.target.value}))}/>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-3 ml-1">End Time</label>
                      <input type="time" className="w-full bg-bg-surface border border-border/50 rounded-xl p-3.5 text-text-primary focus:border-primary outline-none text-sm font-bold shadow-inner" 
                             value={schedule.endTime || ''} onChange={e => setSchedule(s => ({...s, endTime: e.target.value}))}/>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <label className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-3 ml-1">Timezone</label>
                    <select className="w-full bg-bg-surface border border-border/50 rounded-xl p-3.5 text-text-primary focus:border-primary outline-none text-sm font-bold shadow-inner appearance-none custom-select-arrow"
                            value={schedule.timezone || ''} onChange={e => setSchedule(s => ({...s, timezone: e.target.value}))}>
                      <option value="UTC">UTC (GMT)</option>
                      <option value="UTC-5">EST (UTC-5)</option>
                      <option value="UTC-8">PST (UTC-8)</option>
                      <option value="UTC+1">CET (UTC+1)</option>
                      <option value="UTC+5:30">IST (UTC+5:30)</option>
                      <option value="UTC+6">Dhaka (UTC+6)</option>
                    </select>
                  </div>
                </div>
             </div>
          </div>
        )}

      </div>

      {/* TOAST */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border ${
            toastMsg.type === 'error' ? 'bg-danger/10 border-danger/30 text-danger backdrop-blur-md' : 'bg-success/10 border-success/30 text-success backdrop-blur-md'
          }`}>
            <p className="text-[14px] font-bold">{toastMsg.text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
