import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical,
  UserPlus, Eye, ThumbsUp, Award, MessageCircle,
  MessageSquare, Clock, XCircle, X, ChevronDown,
  Check, AlertCircle, Send, UserMinus, CheckCircle2,
  MousePointer2, Move, Layout
} from 'lucide-react'
import { apiFetch } from '../utils/api'
import Flowchart from '../components/Flowchart'
import { 
  ReactFlowProvider, 
  useReactFlow, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  MarkerType 
} from '@xyflow/react'
import dagre from 'dagre'

// ─── Action Type Definitions ───
const ACTION_TYPES = {
  send_invite: {
    label: 'Send Invite',
    icon: UserPlus,
    color: '#6366f1',
    bgClass: 'from-indigo-500/20 to-indigo-600/10',
    borderClass: 'border-indigo-500/30',
    hasBranching: true,
    condition: 'invite_accepted',
    conditionLabel: 'Invite Accepted?',
    configFields: [
      { key: 'withNote', type: 'toggle', label: 'Include Note (Premium)', default: false },
      { key: 'note', type: 'textarea', label: 'Connection Note', placeholder: 'Hi {{firstName}}, I\'d love to connect...', showIf: 'withNote' },
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
    condition: 'message_replied',
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

// ─── Generate unique node IDs ───
let nodeCounter = 0
function makeNodeId() {
  return `node_${Date.now()}_${++nodeCounter}`
}

// ─── Default empty tree with just a start marker ───
function createDefaultTree() {
  const startId = makeNodeId()
  return {
    rootId: startId,
    nodes: {
      [startId]: {
        id: startId,
        type: 'start',
        label: 'Start',
        config: {},
        yesChild: null,
        noChild: null,
      }
    }
  }
}

// ─── SequenceNode Component ───
// SequenceNode is now handled by Flowchart component

// ─── Add Node Button ───
function AddNodeButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded-xl border-2 border-dashed border-border-light hover:border-primary hover:bg-primary/10 flex items-center justify-center text-text-muted hover:text-primary transition-all duration-200 group"
    >
      <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
    </button>
  )
}

// ─── Action Picker Modal ───
function ActionPicker({ onSelect, onClose }) {
  const actions = Object.entries(ACTION_TYPES)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-text-primary">Add Action Step</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {actions.map(([key, def]) => {
            const Icon = def.icon
            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                className={`flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-br ${def.bgClass} ${def.borderClass} hover:scale-[1.02] transition-all text-left`}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${def.color}20` }}>
                  <Icon className="w-4 h-4" style={{ color: def.color }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">{def.label}</div>
                  {def.hasBranching && <div className="text-[10px] text-text-muted">Has Yes/No branch</div>}
                  {def.isTerminal && <div className="text-[10px] text-text-muted">Terminal node</div>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Config Panel (Right Sidebar) ───
function ConfigPanel({ node, onUpdateConfig, onClose, onRemove }) {
  const typeDef = ACTION_TYPES[node.type]
  if (!typeDef) return null

  const Icon = typeDef.icon

  return (
    <div className="w-full glass-card p-6 min-h-full animate-fade-in overflow-y-auto hover:transform-none">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${typeDef.color}20` }}>
            <Icon className="w-5 h-5" style={{ color: typeDef.color }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">{typeDef.label}</h3>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Step Configuration</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-bg-elevated rounded-xl text-text-muted transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <div className="space-y-6">
        {typeDef.hasBranching && (
          <div className="bg-info/10 border border-info/20 rounded-2xl p-4 text-xs text-info flex gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div>
              This step branches based on: <strong>{typeDef.conditionLabel}</strong>. 
              Configure the next steps for both YES and NO paths on the canvas.
            </div>
          </div>
        )}

        {typeDef.configFields.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-border/50 text-center">
             <p className="text-xs text-text-muted">No configuration needed for this action.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {typeDef.configFields.map((field) => {
              // Handle conditional visibility
              if (field.showIf && !node.config?.[field.showIf]) return null

              if (field.type === 'textarea') {
                return (
                  <div key={field.key} className="space-y-2">
                    <label className="text-xs font-semibold text-text-secondary block">{field.label}</label>
                    <textarea
                      className="input !text-sm !py-3 min-h-[120px] resize-y"
                      placeholder={field.placeholder}
                      value={node.config?.[field.key] || ''}
                      onChange={(e) => onUpdateConfig(node.id, field.key, e.target.value)}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['firstName', 'lastName', 'company'].map(tag => (
                        <button 
                          key={tag}
                          onClick={() => onUpdateConfig(node.id, field.key, (node.config?.[field.key] || '') + ` {{${tag}}}`)}
                          className="px-2 py-1 rounded bg-bg-elevated border border-border text-[9px] text-text-muted hover:text-primary hover:border-primary/30 transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }
              if (field.type === 'number') {
                return (
                  <div key={field.key} className="space-y-2">
                    <label className="text-xs font-semibold text-text-secondary block">{field.label}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        className="input !text-sm !py-2 !w-24 text-center"
                        min={field.min}
                        max={field.max}
                        value={node.config?.[field.key] ?? field.default ?? ''}
                        onChange={(e) => onUpdateConfig(node.id, field.key, parseInt(e.target.value) || field.default)}
                      />
                      <span className="text-xs text-text-muted">days after previous step</span>
                    </div>
                  </div>
                )
              }
              if (field.type === 'toggle') {
                return (
                  <div key={field.key} className="flex items-center justify-between p-3 rounded-xl bg-bg-primary/40 border border-white/5">
                    <label className="text-xs font-semibold text-text-secondary">{field.label}</label>
                    <div
                      className={`toggle ${node.config?.[field.key] ? 'active' : ''}`}
                      onClick={() => onUpdateConfig(node.id, field.key, !node.config?.[field.key])}
                    ></div>
                  </div>
                )
              }
              return null
            })}
          </div>
        )}

        <div className="pt-6 border-t border-border/50 mt-10">
          <button
            onClick={onRemove}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 transition-all font-semibold text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Remove this Step
          </button>
        </div>
      </div>
    </div>
  )
}


// ─── Flowchart Wrapper to access ReactFlow Hooks ───
const FlowWrapper = ({ nodes, edges, onNodesChange, onEdgesChange, onConnect, onNodeSelect, setNodes }) => {
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newId = `node_${Date.now()}`;
    const isCondition = type === 'send_invite' || type === 'send_message';

    const newNode = {
      id: newId,
      type: isCondition ? 'condition' : 'action',
      position,
      data: { 
        id: newId, 
        type, 
        config: {}, 
        yesChild: null, 
        noChild: null,
        conditionLabel: isCondition ? (type === 'send_invite' ? 'Invite Accepted?' : 'Replied?') : null
      },
    };

    setNodes((nds) => nds.concat(newNode));
    onNodeSelect(newId);
  }, [screenToFlowPosition, setNodes, onNodeSelect]);

  return (
    <Flowchart 
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onNodeSelect={onNodeSelect}
    />
  );
};

// ─── Main CampaignBuilder Component ───
export default function CampaignBuilder() {
  const { id } = useParams()
  const [tree, setTree] = useState(null)
  const [schedule, setSchedule] = useState({
    timezone: 'UTC',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    hours: [9, 10, 11, 12, 13, 14, 15, 16, 17]
  })
  const [enrolledLeads, setEnrolledLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [showPicker, setShowPicker] = useState(null)
  const [nodeIdToRemove, setNodeIdToRemove] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const lastSyncedTreeRef = useRef(null)

  const [toastMsg, setToastMsg] = useState(null)
  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Helper to get layouted elements
  const getLayoutedElements = useCallback((nodes, edges, direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({ 
      rankdir: direction,
      nodesep: 150, // Space between nodes at same level
      ranksep: 120, // Space between levels
      marginx: 50,
      marginy: 50
    })

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 250, height: 120 })
    })

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target)
    })

    dagre.layout(dagreGraph)

    return nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 125,
          y: nodeWithPosition.y - 60,
        },
      }
    })
  }, [])

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      pathOptions: { borderRadius: 0 },
      label: params.sourceHandle === 'yes' ? 'YES' : (params.sourceHandle === 'no' ? 'NO' : null),
      labelStyle: { fill: params.sourceHandle === 'no' ? '#ef4444' : '#10b981', fontWeight: 800, fontSize: 10 },
      markerEnd: { type: MarkerType.ArrowClosed, color: params.sourceHandle === 'no' ? '#ef4444' : (params.sourceHandle === 'yes' ? '#10b981' : '#6366f1') },
      style: { stroke: params.sourceHandle === 'no' ? '#ef4444' : (params.sourceHandle === 'yes' ? '#10b981' : '#6366f1'), strokeWidth: 2.5 },
    }, eds))
  }, [setEdges])

  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)
  const canvasRef = useRef(null)
  const [verifying, setVerifying] = useState(false)
  const pollIntervalRef = useRef(null)

  const DAY_OPTIONS = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ]

  const fetchEnrolledLeads = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/campaigns/${id}/leads`)
      const data = await res.json()
      setEnrolledLeads(data.leads || [])
      
      // If any leads are currently verifying or pending, keep polling
      const isStillVerifying = (data.leads || []).some(l => 
        l.verification_status === 'verifying' || l.verification_status === 'pending'
      )
      
      if (isStillVerifying && !pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(fetchEnrolledLeads, 3000)
      } else if (!isStillVerifying && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    } catch (err) {
      console.error('Failed to fetch enrolled leads:', err)
    }
  }, [id])

  // Load campaign
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(`/api/campaigns/${id}`)
        const data = await res.json()
        setCampaign(data)

        // Parse existing sequence or create default
        if (data.sequence && typeof data.sequence === 'object' && data.sequence.rootId) {
          setTree(data.sequence)
        } else {
          setTree(createDefaultTree())
        }

        // Load schedule
        if (data.schedule && typeof data.schedule === 'object' && data.schedule.startTime) {
          setSchedule(data.schedule)
        }

        // Load enrolled leads
        await fetchEnrolledLeads()
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()

  }, [id, fetchEnrolledLeads])

  // Sync tree to React Flow elements when tree is loaded or reset
  useEffect(() => {
    if (!tree?.nodes) return
    
    // Guard against infinite loops: only sync if this is a NEW tree object from lead fetch or initial load
    // If the tree was just updated by our own save/sync, ignore it
    const treeJson = JSON.stringify(tree)
    if (lastSyncedTreeRef.current === treeJson) return
    lastSyncedTreeRef.current = treeJson

    const newNodes = []
    const newEdges = []

    Object.values(tree.nodes).forEach((node) => {
      const isStart = node.type === 'start'
      const isCondition = node.type === 'send_invite' || node.type === 'send_message'
      
      newNodes.push({
        id: node.id,
        type: isStart ? 'start' : (isCondition ? 'condition' : 'action'),
        data: { 
          ...node,
          conditionLabel: isCondition ? (node.type === 'send_invite' ? 'Invite Accepted?' : 'Replied?') : null
        },
        position: node.position || { x: 0, y: 0 },
      })

      if (node.yesChild) {
        newEdges.push({
          id: `e-${node.id}-${node.yesChild}`,
          source: node.id,
          target: node.yesChild,
          sourceHandle: isCondition ? 'yes' : null,
          type: 'smoothstep',
          pathOptions: { borderRadius: 0 },
          label: isCondition ? 'YES' : null,
          labelStyle: { fill: '#10b981', fontWeight: 800, fontSize: 10 },
          markerEnd: { type: MarkerType.ArrowClosed, color: isCondition ? '#10b981' : '#6366f1' },
          style: { stroke: isCondition ? '#10b981' : '#6366f1', strokeWidth: 2.5 },
        })
      }

      if (node.noChild) {
        newEdges.push({
          id: `e-${node.id}-${node.noChild}`,
          source: node.id,
          target: node.noChild,
          sourceHandle: 'no',
          type: 'smoothstep',
          pathOptions: { borderRadius: 0 },
          label: 'NO',
          labelStyle: { fill: '#ef4444', fontWeight: 800, fontSize: 10 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
          style: { stroke: '#ef4444', strokeWidth: 2.5 },
        })
      }
    })

    // Only auto-layout if no positions exist
    const needsLayout = newNodes.some(n => (!n.position || (n.position.x === 0 && n.position.y === 0)))
    if (needsLayout) {
      setNodes(getLayoutedElements(newNodes, newEdges))
    } else {
      setNodes(newNodes)
    }
    setEdges(newEdges)
  }, [tree, getLayoutedElements, setNodes, setEdges])





  const handleRemoveLead = async (leadId) => {
    setEnrolledLeads(prev => prev.filter(l => l.id !== leadId))
    // Update campaign leadIds
    const remaining = enrolledLeads.filter(l => l.id !== leadId).map(l => l.id)
    try {
      await apiFetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: remaining })
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleVerifyLeads = async () => {
    if (enrolledLeads.length === 0) return
    setVerifying(true)
    try {
      await apiFetch(`/api/campaigns/${id}/verify`, { method: 'POST' })
      // Start polling for updates
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(fetchEnrolledLeads, 3000)
      }
    } catch (err) {
      console.error('Failed to start verification:', err)
      showToast('Failed to start verification', 'error')
    } finally {
      setVerifying(false)
    }
  }

  // Update node config
  const handleUpdateConfig = useCallback((nodeId, key, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config: {
                ...(node.data.config || {}),
                [key]: value,
              },
            },
          }
        }
        return node
      })
    )
  }, [setNodes])

  // Remove node (and all its children)
  const handleRemoveNode = useCallback((nodeId) => {
    const nodeToRemove = nodes.find(n => n.id === nodeId)
    if (!nodeToRemove) return

    // If it has children, show my custom in-flow warning
    const hasChildren = edges.some(e => e.source === nodeId)
    if (hasChildren) {
      setNodeIdToRemove(nodeId)
    } else {
      performDelete(nodeId)
    }
  }, [nodes, edges])

  const performDelete = (nodeId) => {
    if (selectedNodeId === nodeId) setSelectedNodeId(null)
    setNodeIdToRemove(null)
    
    // Also update nodes and edges state
    setNodes(nds => nds.filter(n => n.id !== nodeId))
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
  }

  const handleVerifyLead = async (leadId, force = false) => {
    setVerifying(true)
    try {
      await apiFetch(`/api/campaigns/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, force })
      })
      // Start polling for updates
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(fetchEnrolledLeads, 3000)
      }
    } catch (err) {
      console.error('Failed to verify lead:', err)
      showToast('Failed to verify lead', 'error')
    } finally {
      setVerifying(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. Build the tree structure from current nodes and edges
      const campaignNodes = {}
      nodes.forEach(n => {
        const nodeData = { 
          ...n.data, 
          id: n.id, 
          position: n.position // Save positions for next load
        }
        
        // Find children from edges
        const yesEdge = edges.find(e => e.source === n.id && (e.sourceHandle === 'yes' || (!e.sourceHandle && n.type !== 'condition')))
        const noEdge = edges.find(e => e.source === n.id && e.sourceHandle === 'no')
        
        nodeData.yesChild = yesEdge?.target || null
        nodeData.noChild = noEdge?.target || null
        campaignNodes[n.id] = nodeData
      })

      const rootNode = nodes.find(n => n.type === 'start')
      if (!rootNode) throw new Error('Campaign must have a Start node.')

      const finalTree = {
        id: tree?.id || id,
        rootId: rootNode.id,
        nodes: campaignNodes
      }

      console.log('Saving campaign flow:', finalTree)

      const res = await apiFetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequence: finalTree,
          schedule: schedule,
          leadIds: enrolledLeads.map(l => l.id)
        })
      })

      if (!res.ok) throw new Error('Failed to save campaign')

      showToast('Campaign saved successfully!', 'success')
      setTree(finalTree)
    } catch (err) {
      console.error('Save error:', err)
      showToast(err.message || 'Failed to save campaign.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day) => {
    setSchedule(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }))
  }

  const selectedNode = nodes.find(n => n.id === selectedNodeId)?.data || tree?.nodes[selectedNodeId]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="text-center py-20 text-text-muted">
        <p>Campaign not found.</p>
        <button onClick={() => navigate('/campaigns')} className="btn btn-secondary mt-4">Back to Campaigns</button>
      </div>
    )
  }

  const nodeCount = tree ? Object.keys(tree.nodes).length - 1 : 0

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/campaigns')}
            className="p-2 rounded-xl hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{campaign.name}</h1>
            <p className="text-xs text-text-muted mt-0.5">
              {nodeCount} step{nodeCount !== 1 ? 's' : ''} • {enrolledLeads.length} lead{enrolledLeads.length !== 1 ? 's' : ''} enrolled
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Campaign'}
        </button>
      </div>

      {/* ─── Section 1: Sequence Builder ─── */}
      <div className="glass-card p-5 hover:transform-none !bg-bg-surface/20 border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary-light">1</div>
            <h2 className="text-sm font-bold text-text-primary">Campaign Flow Design</h2>
            <span className="text-[11px] text-text-muted ml-1">Drag and drop to build your sequence</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-bg-elevated border border-border text-[10px] text-text-muted">
                <MousePointer2 className="w-3 h-3" /> Select
             </div>
             <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-bg-elevated border border-border text-[10px] text-text-muted">
                <Move className="w-3 h-3" /> Pan
             </div>
          </div>
        </div>

        <div className="flex items-stretch gap-5 h-[650px]">
          {/* Action Sidebar */}
          <div className="w-[200px] shrink-0 flex flex-col gap-2 p-3 bg-bg-primary/40 rounded-2xl border border-white/5 overflow-y-auto">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 px-1">Actions</div>
            {Object.entries(ACTION_TYPES).filter(([k]) => k !== 'end').map(([key, def]) => {
              const Icon = def.icon
              return (
                <div
                  key={key}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow', key);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-br ${def.bgClass} ${def.borderClass} cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-all text-left group`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${def.color}20` }}>
                    <Icon className="w-4 h-4" style={{ color: def.color }} />
                  </div>
                  <div className="text-xs font-semibold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">{def.label}</div>
                  <Plus className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-text-muted" />
                </div>
              )
            })}
            <div className="mt-auto pt-4 text-[10px] text-text-muted text-center italic">
              Drag steps onto the canvas or click nodes to configure
            </div>
          </div>

          {/* Flow Canvas */}
          <div className="flex-1 bg-bg-primary/20 rounded-2xl relative overflow-hidden border border-white/5">
            {tree && (
              <ReactFlowProvider>
                <FlowWrapper 
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeSelect={setSelectedNodeId}
                  setNodes={setNodes}
                />
              </ReactFlowProvider>
            )}
          </div>

          {/* Config Panel */}
          {selectedNode && (
            <div className="w-[340px] shrink-0 animate-in slide-in-from-right duration-300">
               <ConfigPanel
                node={selectedNode}
                onUpdateConfig={handleUpdateConfig}
                onClose={() => setSelectedNodeId(null)}
                onRemove={() => handleRemoveNode(selectedNode.id)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── Section 2: Enrolled Leads ─── */}
      <div className="glass-card p-5 hover:transform-none !bg-bg-surface/20 border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center text-sm font-bold text-accent-light">2</div>
            <h2 className="text-sm font-bold text-text-primary">Enrolled Leads</h2>
            <span className="text-[11px] text-text-muted ml-1">Leads scheduled for this campaign</span>
          </div>
          
          {enrolledLeads.length > 0 && (
            <button 
              onClick={handleVerifyLeads}
              disabled={verifying || enrolledLeads.every(l => l.verification_status === 'verified')}
              className="text-[10px] font-bold text-primary hover:text-primary-light transition-colors disabled:opacity-30 flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20"
            >
              {verifying ? (
                <div className="w-2.5 h-2.5 border border-primary border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Check className="w-2.5 h-2.5" />
              )}
              Verify All Leads
            </button>
          )}
        </div>

        <div className="bg-bg-primary/50 rounded-xl border border-border/50 max-h-[400px] overflow-y-auto">
          {enrolledLeads.length === 0 ? (
            <div className="text-center py-12 text-xs text-text-muted">
              <UserMinus className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No leads enrolled yet.</p>
              <p className="mt-1">Add leads to this campaign from the main Leads table.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {enrolledLeads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors group">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center text-xs font-bold text-primary-light shrink-0 overflow-hidden border border-border/30">
                      {lead.avatar ? (
                        <img src={lead.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        `${(lead.firstName?.[0] || '?')}${(lead.lastName?.[0] || '')}`
                      )}
                    </div>
                    {lead.verification_status === 'verified' && (
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-success rounded-full border-2 border-bg-primary flex items-center justify-center shadow-lg">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    )}
                    {(lead.verification_status === 'verifying' || lead.verification_status === 'pending') && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-warning rounded-full border-2 border-bg-primary flex items-center justify-center shadow-lg">
                        <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-text-primary truncate flex items-center gap-1.5">
                        {lead.firstName || 'Unknown'} {lead.lastName || ''}
                        {lead.isPremium === 1 && (
                          <span className="w-3.5 h-3.5 bg-amber-400 rounded-sm flex items-center justify-center text-[8px] font-black text-bg-primary leading-none" title="LinkedIn Premium">IN</span>
                        )}
                      </div>
                      {lead.connectionDegree && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-border/20 text-text-muted rounded border border-border/30 font-medium">{lead.connectionDegree}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-text-muted truncate mt-0.5">
                      {lead.title ? `${lead.title} @ ${lead.company}` : lead.linkedinUrl}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {lead.verification_status === 'verified' ? (
                      <button
                        onClick={() => handleVerifyLead(lead.id, true)}
                        disabled={verifying}
                        className="btn btn-secondary !px-2.5 !py-1.5 !text-[10px] h-auto font-bold"
                      >
                        Reverify
                      </button>
                    ) : (
                      <button
                        onClick={() => handleVerifyLead(lead.id, false)}
                        disabled={verifying || lead.verification_status === 'verifying' || lead.verification_status === 'pending'}
                        className="btn btn-primary !px-2.5 !py-1.5 !text-[10px] h-auto font-bold"
                      >
                        {lead.verification_status === 'failed' ? 'Retry' : 'Verify'}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveLead(lead.id)}
                      className="p-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Section 3: Schedule ─── */}
      <div className="glass-card p-5 hover:transform-none !bg-bg-surface/20 border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-success/20 flex items-center justify-center text-sm font-bold text-success">3</div>
          <h2 className="text-sm font-bold text-text-primary">Set Schedule</h2>
          <span className="text-[11px] text-text-muted ml-1">When should this campaign run?</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Time Range */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-text-secondary">Active Hours</label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                className="input !text-xs !py-2 !w-auto"
                value={schedule.startTime}
                onChange={(e) => setSchedule(p => ({ ...p, startTime: e.target.value }))}
              />
              <span className="text-xs text-text-muted">to</span>
              <input
                type="time"
                className="input !text-xs !py-2 !w-auto"
                value={schedule.endTime}
                onChange={(e) => setSchedule(p => ({ ...p, endTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Active Days */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-text-secondary">Active Days</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleDay(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    schedule.days.includes(key)
                      ? 'bg-primary/20 text-primary-light border border-primary/30'
                      : 'bg-bg-secondary text-text-muted border border-border hover:border-border-light'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-text-secondary">Timezone</label>
            <select
              className="input !text-xs !py-2"
              value={schedule.timezone}
              onChange={(e) => setSchedule(p => ({ ...p, timezone: e.target.value }))}
            >
              <option value="UTC-12">UTC-12 (Baker Island)</option>
              <option value="UTC-8">UTC-8 (Pacific)</option>
              <option value="UTC-7">UTC-7 (Mountain)</option>
              <option value="UTC-6">UTC-6 (Central)</option>
              <option value="UTC-5">UTC-5 (Eastern)</option>
              <option value="UTC-4">UTC-4 (Atlantic)</option>
              <option value="UTC+0">UTC+0 (London)</option>
              <option value="UTC+1">UTC+1 (Paris)</option>
              <option value="UTC+2">UTC+2 (Cairo)</option>
              <option value="UTC+3">UTC+3 (Moscow)</option>
              <option value="UTC+4">UTC+4 (Dubai)</option>
              <option value="UTC+5">UTC+5 (Karachi)</option>
              <option value="UTC+5:30">UTC+5:30 (Mumbai)</option>
              <option value="UTC+6">UTC+6 (Dhaka)</option>
              <option value="UTC+7">UTC+7 (Bangkok)</option>
              <option value="UTC+8">UTC+8 (Singapore)</option>
              <option value="UTC+9">UTC+9 (Tokyo)</option>
              <option value="UTC+10">UTC+10 (Sydney)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 bg-info/5 border border-info/20 rounded-xl p-3 text-xs text-info flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>The campaign will only execute actions during the selected hours and days. Outside these windows, leads will queue until the next active period.</span>
        </div>
      </div>


      {/* Deletion Warning Modal */}
      {nodeIdToRemove && (
        <div className="modal-overlay z-[110]">
          <div className="modal-content !max-w-md p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8 text-danger" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-3">Delete Steps?</h3>
            <p className="text-sm text-text-muted mb-8 leading-relaxed">
              This step has subsequent actions connected to it. Deleting it will also remove <strong>all downstream steps</strong> in this branch. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setNodeIdToRemove(null)}
                className="flex-1 btn btn-secondary !py-3 font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={() => performDelete(nodeIdToRemove)}
                className="flex-1 btn bg-danger hover:bg-danger-light text-white !py-3 font-bold shadow-lg shadow-danger/20"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in pointer-events-none">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border ${
            toastMsg.type === 'error' 
              ? 'bg-danger/10 border-danger/20 text-danger' 
              : 'bg-success/10 border-success/20 text-success'
          }`}>
            {toastMsg.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <p className="text-[14px] font-medium">{toastMsg.text}</p>
          </div>
        </div>
      )}
    </div>
  )
}

