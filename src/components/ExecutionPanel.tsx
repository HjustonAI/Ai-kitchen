/**
 * ExecutionPanel - Combined execution monitoring overlay
 * Shows ExecutionMonitor and ExecutionLog when simulation is active
 * Positioned on the left side, above the sidebar
 */

import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronRight, ChevronLeft } from 'lucide-react';
import { useExecutionStore } from '../store/useExecutionStore';
import { ExecutionMonitor } from './ExecutionMonitor';
import { ExecutionLog } from './ExecutionLog';
import { cn } from '../lib/utils';

export const ExecutionPanel: React.FC = memo(() => {
  const simulationMode = useExecutionStore((s) => s.simulationMode);
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Only subscribe to packet count for display
  const packetCount = useExecutionStore((s) => s.dataPackets.length);

  if (!simulationMode) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: -320, opacity: 0 }}
        animate={{ x: isCollapsed ? -280 : 0, opacity: 1 }}
        exit={{ x: -320, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed left-20 top-4 bottom-4 z-40 flex",
          "pointer-events-none"
        )}
      >
        {/* Main Panel */}
        <div className={cn(
          "w-72 flex flex-col gap-3 pointer-events-auto",
          isCollapsed && "opacity-30"
        )}>
          {/* Header Bar */}
          <motion.div
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/90 backdrop-blur-sm border border-white/10"
          >
            <Activity size={16} className="text-cyan-400 animate-pulse" />
            <span className="text-sm font-bold text-white/80">Live Execution</span>
            <div className="ml-auto flex items-center gap-1">
              <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded animate-pulse">
                {packetCount > 0 ? `${packetCount} active` : 'running'}
              </span>
            </div>
          </motion.div>

          {/* ExecutionMonitor */}
          <ExecutionMonitor />

          {/* ExecutionLog */}
          <ExecutionLog />
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "pointer-events-auto self-start mt-2 ml-1",
            "p-1.5 rounded-lg bg-slate-900/90 backdrop-blur-sm border border-white/10",
            "text-white/50 hover:text-white hover:bg-slate-800 transition-colors"
          )}
          title={isCollapsed ? "Show execution panel" : "Hide execution panel"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </motion.div>
    </AnimatePresence>
  );
});

export default ExecutionPanel;
