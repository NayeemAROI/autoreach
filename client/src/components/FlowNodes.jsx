import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, UserPlus, Eye, ThumbsUp, Award, MessageCircle, MessageSquare, Clock, XCircle, UserMinus, AlertCircle, Send } from 'lucide-react';

const ACTION_TYPES = {
  send_invite: { label: 'Send Invite', icon: UserPlus, color: '#6366f1' },
  view_profile: { label: 'View Profile', icon: Eye, color: '#8b5cf6' },
  like_post: { label: 'Like Recent Post', icon: ThumbsUp, color: '#3b82f6' },
  endorse: { label: 'Endorse Skills', icon: Award, color: '#f59e0b' },
  comment: { label: 'Comment on Post', icon: MessageCircle, color: '#10b981' },
  send_message: { label: 'Send Message', icon: MessageSquare, color: '#06b6d4' },
  withdraw_invite: { label: 'Withdraw Invite', icon: UserMinus, color: '#ef4444' },
  delay: { label: 'Delay', icon: Clock, color: '#9ca3af' },
  end: { label: 'End', icon: XCircle, color: '#6b7280', isTerminal: true }
};

export const StartNode = memo(({ data }) => (
  <div className="relative p-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 to-accent/10 backdrop-blur-md min-w-[140px] shadow-lg shadow-primary/5">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
        <Send className="w-5 h-5 text-primary-light" />
      </div>
      <div>
        <div className="text-sm font-bold text-text-primary">Start</div>
        <div className="text-[10px] text-text-muted">Campaign Entry</div>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !-bottom-1.5" />
  </div>
));

export const ActionNode = memo(({ data, selected }) => {
  const typeDef = ACTION_TYPES[data.type];
  const Icon = typeDef?.icon || Zap;
  
  return (
    <div className={`relative p-4 rounded-2xl border transition-all duration-300 min-w-[200px] shadow-2xl ${
      selected 
        ? 'border-primary bg-bg-surface/90 shadow-primary/20 scale-[1.02]' 
        : 'border-white/5 bg-bg-surface/40 hover:border-white/20'
    } backdrop-blur-xl group`}>
      <Handle type="target" position={Position.Top} className="!bg-primary/40 !w-2 !h-2 !-top-1 border-none" />
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner" style={{ background: `linear-gradient(135deg, ${typeDef?.color}30, ${typeDef?.color}10)` }}>
          <Icon className="w-5 h-5 shadow-sm" style={{ color: typeDef?.color }} />
        </div>
        <div className="flex-1 overflow-hidden text-left">
          <div className="text-[13px] font-bold text-text-primary truncate tracking-tight">{typeDef?.label || 'Action'}</div>
          {data.config?.days && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="w-2.5 h-2.5 text-text-muted" />
              <span className="text-[10px] text-text-muted font-medium">{data.config.days}d wait</span>
            </div>
          )}
        </div>
      </div>

      {!typeDef?.isTerminal && (
        <Handle type="source" position={Position.Bottom} className="!bg-primary/40 !w-2 !h-2 !-bottom-1 border-none" />
      )}
    </div>
  );
});

export const ConditionNode = memo(({ data, selected }) => {
  const typeDef = ACTION_TYPES[data.type];
  const Icon = typeDef?.icon || Zap;
  
  return (
    <div className={`relative p-4 rounded-2xl border transition-all duration-300 min-w-[220px] shadow-2xl ${
      selected 
        ? 'border-primary bg-bg-surface/90 shadow-primary/20 scale-[1.02]' 
        : 'border-white/5 bg-bg-surface/40 hover:border-white/20'
    } backdrop-blur-xl`}>
      <Handle type="target" position={Position.Top} className="!bg-primary/40 !w-2 !h-2 !-top-1 border-none" />
      
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner" style={{ background: `linear-gradient(135deg, ${typeDef?.color}30, ${typeDef?.color}10)` }}>
          <Icon className="w-5 h-5 shadow-sm" style={{ color: typeDef?.color }} />
        </div>
        <div className="text-left">
          <div className="text-[13px] font-bold text-text-primary tracking-tight">{typeDef?.label || 'Action'}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
             <div className="w-1.5 h-1.5 rounded-full bg-info/60" />
             <span className="text-[9px] font-bold text-info uppercase tracking-widest">{data.conditionLabel || 'Check'}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end mt-2 px-2 pb-1 gap-12">
        <div className="relative flex flex-col items-center group/yes">
            <span className="text-[9px] font-black text-success/60 group-hover/yes:text-success transition-colors mb-1 tracking-tighter">YES</span>
            <Handle type="source" position={Position.Bottom} id="yes" className="!bg-success/50 !w-2 !h-2 !-bottom-1 static border-none" />
        </div>
        <div className="relative flex flex-col items-center group/no">
            <span className="text-[9px] font-black text-danger/60 group-hover/no:text-danger transition-colors mb-1 tracking-tighter">NO</span>
            <Handle type="source" position={Position.Bottom} id="no" className="!bg-danger/50 !w-2 !h-2 !-bottom-1 static border-none" />
        </div>
      </div>
    </div>
  );
});
