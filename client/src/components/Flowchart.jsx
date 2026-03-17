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
  onDrop, 
  onDragOver, 
  onNodeSelect 
}) {
  return (
    <div className="w-full h-full min-h-[600px] bg-bg-primary/20 rounded-2xl overflow-hidden border border-white/5 relative group/flow">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(e, n) => onNodeSelect(n.id)}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#ffffff08" gap={20} size={1} />
        <Controls className="!bg-bg-surface !border-white/5 !shadow-2xl" />
      </ReactFlow>
      
      <style>{`
        .react-flow__handle {
          width: 8px !important;
          height: 8px !important;
          background: #6366f1 !important;
          border: 2px solid #111 !important;
        }
        .react-flow__edge-path {
          stroke-dasharray: 4;
          animation: flowDash 20s linear infinite;
        }
        @keyframes flowDash {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
