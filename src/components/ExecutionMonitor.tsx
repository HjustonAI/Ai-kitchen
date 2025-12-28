/**
 * ExecutionMonitor - Live execution stats panel
 * Shows active packets, agent phases, and block states during simulation
 */

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  ChefHat, 
  FileText, 
  Keyboard, 
  Utensils,
  Circle,
  ArrowRight,
  Search,
  Loader2,
  Send,
  CheckCircle2,
  Download
} from 'lucide-react';
import { useExecutionStore } from '../store/useExecutionStore';
import { useStore } from '../store/useStore';
import { useBlocksByType, useBlockMap } from '../lib/useBlockLookup';
import { executionEngine } from '../lib/executionEngineV2';
import { cn } from '../lib/utils';

// Packet type colors
const PACKET_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  input: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '🔵' },
  query: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '🟠' },
  response: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '🟢' },
  output: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '🟣' },
  handoff: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', icon: '🔷' },
};

// Agent phase config
const PHASE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  idle: { icon: Circle, label: 'Idle', color: 'text-slate-400' },
  collecting: { icon: Search, label: 'Collecting', color: 'text-orange-400' },
  processing: { icon: Loader2, label: 'Processing', color: 'text-cyan-400' },
  outputting: { icon: Send, label: 'Outputting', color: 'text-green-400' },
};

// Context state config
const CONTEXT_STATE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  idle: { icon: Circle, label: 'Idle', color: 'text-slate-400' },
  receiving: { icon: Download, label: 'Receiving', color: 'text-orange-400' },
  processing: { icon: Loader2, label: 'Reading', color: 'text-yellow-400' },
  sending: { icon: Send, label: 'Sending', color: 'text-green-400' },
};

const PacketList = memo(() => {
  // Get packet count from store (triggers re-render on create/remove only)
  const storePacketCount = useExecutionStore((s) => s.dataPackets.length);
  const blockMap = useBlockMap(); // O(1) lookups
  const connections = useStore((s) => s.connections);
  
  // Get actual packets with progress from engine (for display)
  // This is computed fresh each render but PacketList only re-renders when count changes
  const packets = useMemo(() => executionEngine.getPackets(), [storePacketCount]);
  
  // Memoize connection map for O(1) lookups
  const connectionMap = useMemo(() => {
    const map = new Map<string, typeof connections[0]>();
    for (const conn of connections) {
      map.set(conn.id, conn);
    }
    return map;
  }, [connections]);
  
  if (packets.length === 0) {
    return (
      <div className="text-xs text-white/30 italic py-1">No active packets</div>
    );
  }
  
  // Get block name helper - O(1) lookup
  const getBlockName = (blockId: string) => {
    const block = blockMap.get(blockId);
    return block?.title || blockId.slice(0, 8);
  };
  
  return (
    <div className="space-y-1">
      {packets.slice(0, 5).map(packet => {
        const conn = connectionMap.get(packet.connectionId);
        const config = PACKET_COLORS[packet.type] || PACKET_COLORS.input;
        const fromName = conn ? getBlockName(conn.fromId) : '?';
        const toName = conn ? getBlockName(conn.toId) : '?';
        const progressPercent = Math.round(packet.progress * 100);
        
        return (
          <div key={packet.id} className={cn("flex items-center gap-2 px-2 py-1 rounded text-xs", config.bg)}>
            <span>{config.icon}</span>
            <span className={cn("font-medium", config.text)}>{packet.type}</span>
            <ArrowRight size={10} className="text-white/30" />
            <span className="text-white/60 truncate flex-1">
              {(packet as any).isReverse ? `${toName} → ${fromName}` : `${fromName} → ${toName}`}
            </span>
            <span className="text-white/40 font-mono">{progressPercent}%</span>
          </div>
        );
      })}
      {packets.length > 5 && (
        <div className="text-xs text-white/40 pl-2">+{packets.length - 5} more...</div>
      )}
    </div>
  );
});

const AgentStateList = memo(() => {
  const agentPhases = useExecutionStore((s) => s.agentPhases);
  // Optimized: use pre-filtered hook instead of subscribing to all blocks
  const agents = useBlocksByType('chef');
  
  if (agents.length === 0) {
    return (
      <div className="text-xs text-white/30 italic py-1">No agents on board</div>
    );
  }
  
  return (
    <div className="space-y-1">
      {agents.map(agent => {
        const phase = agentPhases.get(agent.id) || 'idle';
        const config = PHASE_CONFIG[phase] || PHASE_CONFIG.idle;
        const Icon = config.icon;
        
        return (
          <div key={agent.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white/5 text-xs">
            <ChefHat size={12} className="text-cyan-400" />
            <span className="text-white/80 truncate flex-1">{agent.title || 'Agent'}</span>
            <Icon size={12} className={cn(config.color, phase === 'processing' || phase === 'collecting' ? 'animate-spin' : '')} />
            <span className={cn("font-medium", config.color)}>{config.label}</span>
          </div>
        );
      })}
    </div>
  );
});

const ContextStateList = memo(() => {
  const contextStates = useExecutionStore((s) => s.contextStates);
  // Optimized: use pre-filtered hook
  const contextFiles = useBlocksByType('context_file');
  
  // Only show contexts that have active states
  const activeContexts = contextFiles.filter(c => contextStates.get(c.id) && contextStates.get(c.id) !== 'idle');
  
  if (activeContexts.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-1">
      {activeContexts.map(context => {
        const state = contextStates.get(context.id) || 'idle';
        const config = CONTEXT_STATE_CONFIG[state] || CONTEXT_STATE_CONFIG.idle;
        const Icon = config.icon;
        
        return (
          <div key={context.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white/5 text-xs">
            <FileText size={12} className="text-blue-400" />
            <span className="text-white/80 truncate flex-1">{context.title || 'Context'}</span>
            <Icon size={12} className={cn(config.color, state === 'processing' ? 'animate-spin' : '')} />
            <span className={cn("font-medium", config.color)}>{config.label}</span>
          </div>
        );
      })}
    </div>
  );
});

const DishStateList = memo(() => {
  const dishStates = useExecutionStore((s) => s.dishStates);
  
  // Use memoized hook instead of filtering blocks array
  const dishes = useBlocksByType('dish');
  
  // Only show dishes that have active states
  const activeDishes = dishes.filter(d => dishStates.get(d.id) && dishStates.get(d.id) !== 'idle');
  
  if (activeDishes.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-1">
      {activeDishes.map(dish => {
        const state = dishStates.get(dish.id) || 'idle';
        const isReceiving = state === 'receiving';
        const isComplete = state === 'complete';
        
        return (
          <div key={dish.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white/5 text-xs">
            <Utensils size={12} className="text-purple-400" />
            <span className="text-white/80 truncate flex-1">{dish.title || 'Output'}</span>
            {isReceiving && <Download size={12} className="text-purple-400 animate-bounce" />}
            {isComplete && <CheckCircle2 size={12} className="text-green-400" />}
            <span className={cn("font-medium", isComplete ? 'text-green-400' : 'text-purple-400')}>
              {isComplete ? 'Complete!' : 'Receiving'}
            </span>
          </div>
        );
      })}
    </div>
  );
});

export const ExecutionMonitor: React.FC = memo(() => {
  const simulationMode = useExecutionStore((s) => s.simulationMode);
  const dataPackets = useExecutionStore((s) => s.dataPackets);
  
  if (!simulationMode) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-slate-900/90 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-white/5">
          <Activity size={14} className="text-cyan-400" />
          <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Execution Monitor</span>
          <span className="ml-auto text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
            {dataPackets.length} packets
          </span>
        </div>
        
        {/* Content */}
        <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
          {/* Active Packets */}
          <div>
            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">
              Active Packets
            </h4>
            <PacketList />
          </div>
          
          {/* Agent States */}
          <div>
            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">
              Agent States
            </h4>
            <AgentStateList />
          </div>
          
          {/* Context States (only if active) */}
          <ContextStateList />
          
          {/* Dish States (only if active) */}
          <DishStateList />
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default ExecutionMonitor;
