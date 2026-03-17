import React from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { StartNode, ActionNode, ConditionNode } from './FlowNodes';

const nodeTypes = {
  start: StartNode,
  action: ActionNode,
  condition: ConditionNode,
};

export default function Flowchart({ 
  nodes, 
  edges, 
  onNodesChange, 
  onEdgesChange, 
  onConnect, 
  onRequestAdd, 
  onNodeSelect 
}) {
  // Inject the callback into all nodes so they can trigger the picker
  const nodesWithCallbacks = React.useMemo(() => 
    nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        onAdd: onRequestAdd
      }
    })), [nodes, onRequestAdd]
  );

  const edgeOptions = {
    type: 'smoothstep',
    animated: true,
    style: { 
      stroke: 'rgba(99, 102, 241, 0.4)', 
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 15,
      height: 15,
      color: 'rgba(99, 102, 241, 0.4)',
    },
  };

  return (
    <div className="w-full h-full min-h-[600px] bg-[#050510]/60 rounded-3xl overflow-hidden border border-white/5 relative group/flow shadow-[inset_0_0_80px_rgba(0,0,0,0.4)]">
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        defaultEdgeOptions={edgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(e, n) => onNodeSelect(n.id)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.6 }} // Generous padding for spacious feel
        minZoom={0.5}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          color="#6366f1" 
          gap={25} 
          size={1} 
          variant="dots"
          className="opacity-[0.03]"
        />
        <Controls className="!bg-[#0f111a] !border-white/10 !shadow-2xl !rounded-xl !overflow-hidden !m-4" />
      </ReactFlow>
      
      <style>{`
        .react-flow__handle {
          width: 0 !important;
          height: 0 !important;
          background: transparent !important;
          border: none !important;
          visibility: hidden !important;
        }
        .react-flow__edge-path {
          stroke-dasharray: 6;
          animation: flowDash 30s linear infinite;
        }
        .react-flow__edge.animated path {
          stroke-dasharray: 8;
          animation: flowDash 30s linear infinite;
        }
        @keyframes flowDash {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
        .react-flow__controls-button {
          background: transparent !important;
          border-bottom: 1px solid rgba(255,,255,0.05) !important;
          color: rgba(255,255,255,0.6) !important;
          transition: all 0.2s !important;
        }
        .react-flow__controls-button:hover {
          background: rgba(255,255,255,0.05) !important;
          color: #fff !important;
        }
        .react-flow__attribution {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
