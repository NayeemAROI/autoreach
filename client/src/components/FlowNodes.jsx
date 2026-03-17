import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Zap, UserPlus, Eye, ThumbsUp, Award, MessageCircle, 
  MessageSquare, Clock, XCircle, UserMinus, Send, 
  Plus, CheckCircle2, ChevronRight, Hash
} from 'lucide-react';

const ACTION_TYPES = {
  send_invite: { label: 'Send Invite', icon: UserPlus, color: '#6366f1' },
  view_profile: { label: 'View Profile', icon: Eye, color: '#8b5cf6' },
  like_post: { label: 'Like Recent Post', icon: ThumbsUp, color: '#3b82f6' },
  endorse: { label: 'Endorse Skills', icon: Award, color: '#f59e0b' },
  comment: { label: 'Comment on Post', icon: MessageCircle, color: '#10b981' },
  send_message: { label: 'Send Message', icon: MessageSquare, color: '#06b6d4' },
  withdraw_invite: { label: 'Withdraw Invite', icon: UserMinus, color: '#ef4444' },
  delay: { label: 'Delay', icon: Clock, color: '#94a3b8' },
  end: { label: 'End Sequence', icon: CheckCircle2, color: '#64748b', isTerminal: true }
};

export const StartNode = memo(({ id, data }) => (
  <div className="relative p-1 rounded-2xl bg-gradient-to-br from-primary/40 to-accent/40 shadow-[0_0_40px_rgba(99,102,241,0.15)] ring-1 ring-white/20">
    <div className="flex items-center gap-3 px-4 py-3 rounded-[14px] bg-bg-surface/40 backdrop-blur-3xl min-w-[140px]">
      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
        <Send className="w-5 h-5 text-primary-light animate-pulse" />
      </div>
      <div>
        <div className="text-[10px] font-black text-text-muted/60 uppercase tracking-[0.2em]">Sequence</div>
        <div className="text-sm font-black text-text-primary tracking-tight uppercase">Start</div>
      </div>
    </div>
    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2 border-none ring-4 ring-primary/10" />
      <button 
        onClick={(e) => { e.stopPropagation(); data.onAdd?.(id); }}
        className="mt-3 w-8 h-8 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center text-primary-light hover:bg-primary/20 hover:scale-110 transition-all shadow-lg backdrop-blur-2xl z-20 group"
        title="Add next step"
      >
        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
      </button>
    </div>
  </div>
));

export const ActionNode = memo(({ id, data, selected }) => {
  const typeDef = ACTION_TYPES[data.type] || ACTION_TYPES.end;
  const Icon = typeDef.icon;
  const color = typeDef.color;
  
  return (
    <div className={`relative p-[1px] rounded-2xl transition-all duration-300 min-w-[200px] ${
      selected 
        ? 'ring-2 ring-primary shadow-[0_0_50px_rgba(99,102,241,0.2)] scale-[1.02]' 
        : 'ring-1 ring-white/10 shadow-xl'
    }`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-[15px] bg-bg-surface/50 backdrop-blur-3xl overflow-hidden relative group`}>
        {/* Subtle accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: color }} />
        
        <Handle type="target" position={Position.Top} className="!bg-primary/40 !w-1.5 !h-1.5 !-top-[2px] border-none" />
        
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/5 bg-white/5 shadow-inner" style={{ borderColor: `${color}40` }}>
          <Icon className="w-5 h-5" style={{ color: color }} />
        </div>
        
        <div className="flex-1 overflow-hidden text-left">
          <div className="text-[9px] font-black text-text-muted/40 uppercase tracking-[0.2em] leading-none mb-1">Action Step</div>
          <div className="text-xs font-black text-text-primary truncate tracking-tight uppercase leading-tight">{typeDef.label}</div>
          {data.config?.days && (
            <div className="flex items-center gap-1 mt-1 opacity-70">
              <Clock className="w-2.5 h-2.5 text-text-muted" />
              <span className="text-[10px] text-text-muted font-bold tracking-wide">{data.config.days}d delay</span>
            </div>
          )}
        </div>
      </div>

      {!typeDef.isTerminal && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <Handle type="source" position={Position.Bottom} className="!bg-primary/40 !w-1.5 !h-1.5 border-none" />
          <button 
            onClick={(e) => { e.stopPropagation(); data.onAdd?.(id); }}
            className="mt-3 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/10 hover:border-white/20 hover:scale-110 transition-all backdrop-blur-2xl z-20 group shadow-lg"
            title="Add next step"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
});

export const ConditionNode = memo(({ id, data, selected }) => {
  const typeDef = ACTION_TYPES[data.type] || ACTION_TYPES.send_invite;
  const Icon = typeDef.icon;
  const color = typeDef.color;
  
  return (
    <div className={`relative p-[1px] rounded-2xl transition-all duration-300 min-w-[240px] ${
      selected 
        ? 'ring-2 ring-primary shadow-[0_0_50px_rgba(99,102,241,0.2)] scale-[1.02]' 
        : 'ring-1 ring-white/10 shadow-xl'
    }`}>
      <div className="rounded-[15px] bg-bg-surface/50 backdrop-blur-3xl overflow-hidden relative">
        {/* Header Section */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/5 bg-white/5" style={{ borderColor: `${color}40` }}>
            <Icon className="w-5 h-5" style={{ color: color }} />
          </div>
          <div className="text-left flex-1">
            <div className="text-[9px] font-black text-text-muted/40 uppercase tracking-[0.2em] leading-none mb-1">Decision Point</div>
            <div className="text-xs font-black text-text-primary truncate tracking-tight uppercase leading-tight">{typeDef.label}</div>
          </div>
          <div className="px-2 py-1 rounded bg-info/10 border border-info/30 text-[9px] font-black text-info-light tracking-widest uppercase">
            {data.conditionLabel || 'Check'}
          </div>
        </div>

        <Handle type="target" position={Position.Top} className="!bg-primary/40 !w-1.5 !h-1.5 !-top-[2px] border-none" />
        
        {/* Branch Section */}
        <div className="flex divide-x divide-white/5">
          <div className="flex-1 py-4 flex flex-col items-center group/yes">
            <div className="text-[9px] font-black text-success/40 group-hover/yes:text-success transition-colors tracking-[0.2em] mb-3">YES</div>
            <div className="relative">
              <Handle type="source" position={Position.Bottom} id="yes" className="!bg-success/40 !w-1.5 !h-1.5 !-bottom-1 static border-none" />
              <button 
                onClick={(e) => { e.stopPropagation(); data.onAdd?.(id, 'yes'); }}
                className="mt-3 w-7 h-7 rounded-full bg-success/5 border border-success/20 flex items-center justify-center text-success/60 hover:text-success hover:bg-success/20 hover:scale-110 transition-all shadow-md backdrop-blur-xl z-20"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 py-4 flex flex-col items-center group/no">
            <div className="text-[9px] font-black text-danger/40 group-hover/no:text-danger transition-colors tracking-[0.2em] mb-3">NO</div>
            <div className="relative">
              <Handle type="source" position={Position.Bottom} id="no" className="!bg-danger/40 !w-1.5 !h-1.5 !-bottom-1 static border-none" />
              <button 
                onClick={(e) => { e.stopPropagation(); data.onAdd?.(id, 'no'); }}
                className="mt-3 w-7 h-7 rounded-full bg-danger/5 border border-danger/20 flex items-center justify-center text-danger/60 hover:text-danger hover:bg-danger/20 hover:scale-110 transition-all shadow-md backdrop-blur-xl z-20"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
