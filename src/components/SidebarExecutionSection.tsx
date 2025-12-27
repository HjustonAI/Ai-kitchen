/**
 * SidebarExecutionSection - Compact execution stats for Sidebar integration
 * Shows live execution info when simulation is active
 */

import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  ChevronDown, 
  ChevronRight,
  ChefHat,
  Circle,
  Search,
  Loader2,
  Send,
  FileText,
  Utensils,
  Download,
  CheckCircle2,
  ScrollText,
  Trash2
} from 'lucide-react';
import { useExecutionStore, type CollectingProgress } from '../store/useExecutionStore';
import { useStore } from '../store/useStore';
import { ExecutionLogManager } from './ExecutionLog';
import { cn } from '../lib/utils';

// Packet type colors (compact)
const PACKET_DOTS: Record<string, string> = {
  input: 'bg-blue-400',
  query: 'bg-orange-400',
  response: 'bg-green-400',
  output: 'bg-purple-400',
  handoff: 'bg-cyan-400',
};

// Phase icons
const PHASE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  idle: { icon: Circle, color: 'text-slate-500' },
  collecting: { icon: Search, color: 'text-orange-400' },
  processing: { icon: Loader2, color: 'text-cyan-400' },
  outputting: { icon: Send, color: 'text-green-400' },
};

// Collapsible section
const CollapsibleSection = memo(({ 
  title, 
  count, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  accentColor = 'text-white/60'
}: { 
  title: string; 
  count?: number; 
  icon: React.ElementType;
  children: React.ReactNode; 
  defaultOpen?: boolean;
  accentColor?: string;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="space-y-1">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 py-1 text-left group"
      >
        {isOpen ? <ChevronDown size={12} className="text-white/40" /> : <ChevronRight size={12} className="text-white/40" />}
        <Icon size={12} className={accentColor} />
        <span className="text-[10px] font-medium text-white/60 uppercase tracking-wider flex-1">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/50">{count}</span>
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Compact packet list
const PacketIndicator = memo(() => {
  const dataPackets = useExecutionStore((s) => s.dataPackets);
  
  if (dataPackets.length === 0) {
    return <div className="text-[10px] text-white/30 italic pl-5">No packets</div>;
  }
  
  // Group by type for compact display
  const grouped = dataPackets.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <div className="flex flex-wrap gap-1.5 pl-5">
      {Object.entries(grouped).map(([type, count]) => (
        <div 
          key={type}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 text-[10px]"
        >
          <div className={cn("w-2 h-2 rounded-full", PACKET_DOTS[type])} />
          <span className="text-white/60">{type}</span>
          <span className="text-white/40">×{count}</span>
        </div>
      ))}
    </div>
  );
});

// Agent states list
const AgentStates = memo(() => {
  const agentPhases = useExecutionStore((s) => s.agentPhases);
  const collectingProgress = useExecutionStore((s) => s.collectingProgress);
  const blocks = useStore((s) => s.blocks);
  
  const agents = blocks.filter(b => b.type === 'chef');
  
  if (agents.length === 0) {
    return <div className="text-[10px] text-white/30 italic pl-5">No agents</div>;
  }
  
  return (
    <div className="space-y-1 pl-5">
      {agents.map(agent => {
        const phase = agentPhases.get(agent.id) || 'idle';
        const config = PHASE_CONFIG[phase] || PHASE_CONFIG.idle;
        const Icon = config.icon;
        const progress = collectingProgress.get(agent.id);
        
        return (
          <div key={agent.id} className="flex items-center gap-2 text-[10px]">
            <Icon size={10} className={cn(config.color, phase === 'processing' || phase === 'collecting' ? 'animate-spin' : '')} />
            <span className="text-white/70 truncate flex-1">{agent.title || 'Agent'}</span>
            {phase !== 'idle' && (
              <span className={cn("text-[9px]", config.color)}>
                {phase === 'collecting' && progress ? `${progress.received}/${progress.total}` : phase}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

// Context/Dish states (compact - only show active)
const ActiveBlockStates = memo(() => {
  const contextStates = useExecutionStore((s) => s.contextStates);
  const dishStates = useExecutionStore((s) => s.dishStates);
  const blocks = useStore((s) => s.blocks);
  
  const activeContexts = Array.from(contextStates.entries())
    .filter(([, state]) => state !== 'idle')
    .map(([id, state]) => ({ id, state, block: blocks.find(b => b.id === id) }));
    
  const activeDishes = Array.from(dishStates.entries())
    .filter(([, state]) => state !== 'idle')
    .map(([id, state]) => ({ id, state, block: blocks.find(b => b.id === id) }));
  
  if (activeContexts.length === 0 && activeDishes.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-1 pl-5">
      {activeContexts.map(({ id, state, block }) => (
        <div key={id} className="flex items-center gap-2 text-[10px]">
          <FileText size={10} className="text-blue-400" />
          <span className="text-white/70 truncate flex-1">{block?.title || 'Context'}</span>
          <span className="text-[9px] text-orange-400">{state}</span>
        </div>
      ))}
      {activeDishes.map(({ id, state, block }) => (
        <div key={id} className="flex items-center gap-2 text-[10px]">
          <Utensils size={10} className="text-purple-400" />
          <span className="text-white/70 truncate flex-1">{block?.title || 'Dish'}</span>
          <span className={cn("text-[9px]", state === 'complete' ? 'text-green-400' : 'text-purple-400')}>
            {state === 'complete' ? '✓' : state}
          </span>
        </div>
      ))}
    </div>
  );
});

// Mini execution log (last 5 events)
const MiniLog = memo(() => {
  const [events, setEvents] = useState<Array<{ id: string; type: string; timestamp: number }>>([]);
  
  React.useEffect(() => {
    const update = () => {
      const allEvents = ExecutionLogManager.getEvents();
      setEvents(allEvents.slice(-5));
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, []);
  
  if (events.length === 0) {
    return <div className="text-[10px] text-white/30 italic pl-5">No events</div>;
  }
  
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };
  
  const getEventIcon = (type: string) => {
    if (type.includes('packet')) return '📦';
    if (type.includes('phase')) return '🔄';
    if (type.includes('context')) return '📁';
    if (type.includes('dish')) return '🍽️';
    if (type.includes('simulation')) return '▶️';
    return '•';
  };
  
  return (
    <div className="space-y-0.5 pl-5 max-h-20 overflow-y-auto">
      {events.map(e => (
        <div key={e.id} className="flex items-center gap-1.5 text-[9px] text-white/50">
          <span className="text-white/30 font-mono">{formatTime(e.timestamp)}</span>
          <span>{getEventIcon(e.type)}</span>
          <span className="truncate">{e.type.replace(/_/g, ' ')}</span>
        </div>
      ))}
    </div>
  );
});

export const SidebarExecutionSection: React.FC = memo(() => {
  const simulationMode = useExecutionStore((s) => s.simulationMode);
  const dataPackets = useExecutionStore((s) => s.dataPackets);
  
  if (!simulationMode) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-white/10 pt-3 mt-3 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-cyan-400 animate-pulse" />
        <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Live</span>
        <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
          {dataPackets.length} packets
        </span>
      </div>
      
      {/* Compact Stats */}
      <div className="space-y-2">
        <CollapsibleSection title="Packets" count={dataPackets.length} icon={Activity} accentColor="text-cyan-400">
          <PacketIndicator />
        </CollapsibleSection>
        
        <CollapsibleSection title="Agents" icon={ChefHat} accentColor="text-cyan-400">
          <AgentStates />
        </CollapsibleSection>
        
        <ActiveBlockStates />
        
        <CollapsibleSection title="Log" icon={ScrollText} defaultOpen={false} accentColor="text-emerald-400">
          <MiniLog />
          <button
            onClick={() => ExecutionLogManager.clear()}
            className="flex items-center gap-1 text-[9px] text-white/30 hover:text-red-400 pl-5 mt-1"
          >
            <Trash2 size={8} />
            Clear
          </button>
        </CollapsibleSection>
      </div>
    </motion.div>
  );
});

export default SidebarExecutionSection;
