/**
 * ExecutionLog - Scrollable timestamped execution events log
 * Shows packet lifecycle events, phase changes, and block state transitions
 */

import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ScrollText, 
  Trash2,
  Circle,
  ArrowRight,
  Play,
  Check,
  ChefHat,
  FileText,
  Utensils,
  Keyboard
} from 'lucide-react';
import { useExecutionStore } from '../store/useExecutionStore';
import { cn } from '../lib/utils';

// Event type definitions
export interface ExecutionEvent {
  id: string;
  timestamp: number;
  type: 'packet_created' | 'packet_completed' | 'phase_changed' | 'context_state' | 'dish_state' | 'simulation_start' | 'simulation_stop';
  data: Record<string, unknown>;
}

// Singleton event log storage (persists across renders)
let globalEventLog: ExecutionEvent[] = [];
let globalEventId = 0;

// Event log manager
export const ExecutionLogManager = {
  addEvent: (type: ExecutionEvent['type'], data: Record<string, unknown>) => {
    globalEventLog.push({
      id: `event-${++globalEventId}`,
      timestamp: Date.now(),
      type,
      data
    });
    // Keep only last 100 events
    if (globalEventLog.length > 100) {
      globalEventLog = globalEventLog.slice(-100);
    }
    // Notify subscribers
    eventSubscribers.forEach(cb => cb());
  },
  getEvents: () => [...globalEventLog],
  clear: () => {
    globalEventLog = [];
    eventSubscribers.forEach(cb => cb());
  }
};

// Simple pub-sub for event updates
const eventSubscribers = new Set<() => void>();

// Hook to subscribe to event updates
const useEventLog = () => {
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  
  useEffect(() => {
    const update = () => setEvents(ExecutionLogManager.getEvents());
    update(); // Initial
    eventSubscribers.add(update);
    return () => { eventSubscribers.delete(update); };
  }, []);
  
  return events;
};

// Packet type colors
const PACKET_COLORS: Record<string, string> = {
  input: 'text-blue-400',
  query: 'text-orange-400',
  response: 'text-green-400',
  output: 'text-purple-400',
  handoff: 'text-cyan-400',
};

// Event type icons and colors
const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  packet_created: { icon: Play, color: 'text-blue-400', label: 'Packet Created' },
  packet_completed: { icon: Check, color: 'text-green-400', label: 'Packet Completed' },
  phase_changed: { icon: ChefHat, color: 'text-cyan-400', label: 'Phase Changed' },
  context_state: { icon: FileText, color: 'text-orange-400', label: 'Context State' },
  dish_state: { icon: Utensils, color: 'text-purple-400', label: 'Dish State' },
  simulation_start: { icon: Play, color: 'text-emerald-400', label: 'Simulation Started' },
  simulation_stop: { icon: Circle, color: 'text-red-400', label: 'Simulation Stopped' },
};

// Format timestamp
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
};

// Format event message
const formatEventMessage = (event: ExecutionEvent): React.ReactNode => {
  const { type, data } = event;
  
  switch (type) {
    case 'packet_created':
      return (
        <span className="flex items-center gap-1 flex-wrap">
          <span className={PACKET_COLORS[data.packetType as string] || 'text-white/60'}>
            {data.packetType as string}
          </span>
          <ArrowRight size={10} className="text-white/30" />
          <span className="text-white/40 truncate max-w-[150px]">{data.fromBlock as string}</span>
          <span className="text-white/30">→</span>
          <span className="text-white/40 truncate max-w-[150px]">{data.toBlock as string}</span>
        </span>
      );
      
    case 'packet_completed':
      return (
        <span className="flex items-center gap-1">
          <span className={PACKET_COLORS[data.packetType as string] || 'text-white/60'}>
            {data.packetType as string}
          </span>
          <span className="text-white/40">reached destination</span>
        </span>
      );
      
    case 'phase_changed':
      return (
        <span className="flex items-center gap-1">
          <span className="text-white/60">{data.agentName as string}</span>
          <ArrowRight size={10} className="text-white/30" />
          <span className="text-cyan-400 font-medium">{data.phase as string}</span>
        </span>
      );
      
    case 'context_state':
      return (
        <span className="flex items-center gap-1">
          <span className="text-white/60">{data.contextName as string}</span>
          <ArrowRight size={10} className="text-white/30" />
          <span className="text-orange-400 font-medium">{data.state as string}</span>
        </span>
      );
      
    case 'dish_state':
      return (
        <span className="flex items-center gap-1">
          <span className="text-white/60">{data.dishName as string}</span>
          <ArrowRight size={10} className="text-white/30" />
          <span className="text-purple-400 font-medium">{data.state as string}</span>
        </span>
      );
      
    case 'simulation_start':
      return <span className="text-emerald-400">Simulation started</span>;
      
    case 'simulation_stop':
      return <span className="text-red-400">Simulation stopped</span>;
      
    default:
      return <span className="text-white/40">Unknown event</span>;
  }
};

const EventItem = memo(({ event }: { event: ExecutionEvent }) => {
  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.packet_created;
  const Icon = config.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 py-1.5 px-2 hover:bg-white/5 rounded text-xs"
    >
      <Icon size={12} className={cn(config.color, "mt-0.5 flex-shrink-0")} />
      <div className="flex-1 min-w-0">
        {formatEventMessage(event)}
      </div>
      <span className="text-[10px] text-white/30 font-mono flex-shrink-0">
        {formatTime(event.timestamp)}
      </span>
    </motion.div>
  );
});

export const ExecutionLog: React.FC = memo(() => {
  const simulationMode = useExecutionStore((s) => s.simulationMode);
  const events = useEventLog();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, autoScroll]);
  
  // Handle manual scroll - disable auto-scroll if user scrolls up
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    setAutoScroll(isAtBottom);
  }, []);
  
  // Clear log
  const handleClear = () => {
    ExecutionLogManager.clear();
  };
  
  if (!simulationMode && events.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="bg-slate-900/90 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-white/5">
        <ScrollText size={14} className="text-emerald-400" />
        <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Execution Log</span>
        <span className="ml-auto text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded">
          {events.length}
        </span>
        {events.length > 0 && (
          <button
            onClick={handleClear}
            className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors"
            title="Clear log"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      
      {/* Events List */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-48 overflow-y-auto"
      >
        {events.length === 0 ? (
          <div className="p-4 text-xs text-white/30 text-center italic">
            No events yet. Start simulation to see execution log.
          </div>
        ) : (
          <div className="py-1">
            {events.map(event => (
              <EventItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
      
      {/* Auto-scroll indicator */}
      {!autoScroll && events.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
          className="w-full py-1 text-[10px] text-cyan-400 hover:bg-cyan-500/10 transition-colors"
        >
          ↓ Scroll to latest
        </button>
      )}
    </motion.div>
  );
});

export default ExecutionLog;
