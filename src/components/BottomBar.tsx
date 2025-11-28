import React, { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Undo2, Redo2, LayoutGrid, Play, Pause, Zap, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useExecutionStore } from '../store/useExecutionStore';

interface BottomBarProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
}

export const BottomBar: React.FC<BottomBarProps> = memo(({ prompt, setPrompt }) => {
  const [copied, setCopied] = useState(false);
  
  // We need to subscribe to the temporal store to get updates on past/future states
  // However, zundo's temporal store is not a hook by default in the way we might expect for direct subscription inside a component easily without a selector.
  // But we can use useStore.temporal.getState() inside handlers.
  // To make the buttons disable/enable reactively, we need to subscribe.
  // useStore.temporal is a vanilla store. We can use useStore.temporal.subscribe or a custom hook.
  // Since we are in a React component, let's try to use a simple forceUpdate or local state synced with temporal.
  
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!useStore.temporal) return;
    
    const unsubscribe = useStore.temporal.subscribe((state) => {
      setCanUndo(state.pastStates.length > 0);
      setCanRedo(state.futureStates.length > 0);
    });
    return unsubscribe;
  }, []);

  const handleUndo = () => useStore.temporal?.getState().undo();
  const handleRedo = () => useStore.temporal?.getState().redo();
  const layoutBoard = useStore((state) => state.layoutBoard);
  const connections = useStore((state) => state.connections);

  // Execution Store
  const isRunning = useExecutionStore((state) => state.isRunning);
  const setIsRunning = useExecutionStore((state) => state.setIsRunning);
  const addPacket = useExecutionStore((state) => state.addPacket);
  const clearExecution = useExecutionStore((state) => state.clearExecution);

  const handleToggleRun = () => setIsRunning(!isRunning);
  
  const handleSpawnPacket = () => {
    if (connections.length === 0) return;
    const randomConn = connections[Math.floor(Math.random() * connections.length)];
    addPacket(randomConn.id);
    if (!isRunning) setIsRunning(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-50 flex gap-4"
    >
      {/* Simulation Controls */}
      <div className="glass-panel rounded-2xl p-2 flex items-center gap-1 shadow-2xl ring-1 ring-white/10">
        <button
          onClick={handleToggleRun}
          aria-label={isRunning ? "Pauza" : "Start Symulacji"}
          className={`p-3 rounded-xl transition-colors ${isRunning ? 'bg-kitchen-neon-cyan/20 text-kitchen-neon-cyan hover:bg-kitchen-neon-cyan/30' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
          title={isRunning ? "Pauza" : "Start Symulacji"}
        >
          {isRunning ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          onClick={handleSpawnPacket}
          disabled={connections.length === 0}
          aria-label="Wyślij pakiet"
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Wyślij pakiet (Spawn Packet)"
        >
          <Zap size={18} />
        </button>
        <div className="w-[1px] h-6 bg-white/10 mx-1" />
        <button
          onClick={clearExecution}
          aria-label="Wyczyść symulację"
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          title="Wyczyść symulację"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Undo/Redo Controls */}
      <div className="glass-panel rounded-2xl p-2 flex items-center gap-1 shadow-2xl ring-1 ring-white/10">
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          aria-label="Cofnij"
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Cofnij (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          aria-label="Ponów"
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Ponów (Ctrl+Shift+Z)"
        >
          <Redo2 size={18} />
        </button>
        <div className="w-[1px] h-6 bg-white/10 mx-1" />
        <button
          onClick={layoutBoard}
          aria-label="Uporządkuj"
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          title="Uporządkuj (Auto-Layout)"
        >
          <LayoutGrid size={18} />
        </button>
      </div>

      <div className="glass-panel rounded-2xl p-2 pl-6 flex-1 flex items-center gap-4 shadow-2xl ring-1 ring-white/10">
        <span className="text-kitchen-accent font-bold uppercase text-xs tracking-widest whitespace-nowrap opacity-80">
          Prompt Dnia
        </span>
        
        <div className="h-8 w-[1px] bg-white/10" />
        
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          aria-label="Prompt Dnia"
          className="flex-1 bg-transparent border-none text-white focus:ring-0 placeholder-white/20 font-mono text-sm"
          placeholder="Wpisz główny cel lub prompt..."
        />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          aria-label="Kopiuj prompt"
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          title="Kopiuj prompt"
        >
          {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
        </motion.button>
      </div>
    </motion.div>
  );
});
