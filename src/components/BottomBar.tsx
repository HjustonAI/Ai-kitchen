import React, { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Play, Square, FastForward } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useExecutionStore } from '../store/useExecutionStore';

const AnimationControls = () => {
  const isRunning = useExecutionStore((s) => s.simulationMode);
  const setSimulationMode = useExecutionStore((s) => s.setSimulationMode);
  const setIsRunning = useExecutionStore((s) => s.setIsRunning);
  const executionSpeed = useExecutionStore((s) => s.executionSpeed);
  const setExecutionSpeed = useExecutionStore((s) => s.setExecutionSpeed);

  const connections = useStore((s) => s.connections);
  const blocks = useStore((s) => s.blocks);
  const addPacket = useExecutionStore((s) => s.addPacket);
  const clearExecution = useExecutionStore((s) => s.clearExecution);

  const toggleRun = () => {
    const newState = !isRunning;
    setSimulationMode(newState);
    setIsRunning(newState);

    if (newState) {
      // START: Seed the simulation
      // Find all "Starter" blocks (Input Files, Context Files)
      const starterBlocks = blocks.filter(b => b.type === 'input_file' || b.type === 'context_file');

      let packetsAdded = 0;
      starterBlocks.forEach(block => {
        const outgoing = connections.filter(c => c.fromId === block.id);
        outgoing.forEach(conn => {
          addPacket(conn.id);
          packetsAdded++;
        });
      });

      if (packetsAdded === 0) {
        // Fallback: If no inputs connected, find ANY root node (no inputs) and fire?
        // Or just let it be empty.
      }
    } else {
      // STOP: Clear packets? Or let them drain?
      // Let's clear to reset the state for next run
      clearExecution();
    }
  };

  const cycleSpeed = () => {
    const nextSpeed = executionSpeed >= 4 ? 1 : executionSpeed * 2;
    setExecutionSpeed(nextSpeed);
  };

  return (
    <>
      <button
        onClick={toggleRun}
        aria-label={isRunning ? "Stop Animation" : "Start Animation"}
        className={`p-2.5 rounded-xl transition-all ${isRunning
          ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
          : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
          }`}
        title={isRunning ? "Stop Animation Mode" : "Start Animation Mode"}
      >
        {isRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>

      {isRunning && (
        <button
          onClick={cycleSpeed}
          className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors font-mono text-xs flex items-center gap-1"
          title="Speed"
        >
          <FastForward size={12} />
          {executionSpeed}x
        </button>
      )}
    </>
  );
};

export const BottomBar: React.FC = memo(() => {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const view = useStore((state) => state.view);
  const updateView = useStore((state) => state.updateView);

  useEffect(() => {
    const temporal = useStore.temporal;
    if (!temporal) return;

    // Check initial state immediately
    const initialState = temporal.getState();
    setCanUndo(initialState.pastStates.length > 0);
    setCanRedo(initialState.futureStates.length > 0);

    // Subscribe for future updates
    const unsubscribe = temporal.subscribe((state) => {
      setCanUndo(state.pastStates.length > 0);
      setCanRedo(state.futureStates.length > 0);
    });
    return unsubscribe;
  }, []);

  const handleUndo = () => useStore.temporal?.getState().undo();
  const handleRedo = () => useStore.temporal?.getState().redo();

  const handleZoomIn = () => {
    const newScale = Math.min(view.scale * 1.2, 3);
    updateView({ scale: newScale });
  };

  const handleZoomOut = () => {
    const newScale = Math.max(view.scale / 1.2, 0.2);
    updateView({ scale: newScale });
  };

  const handleResetZoom = () => {
    updateView({ scale: 1, x: 0, y: 0 });
  };

  const zoomPercent = Math.round(view.scale * 100);

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 inset-x-0 mx-auto w-fit z-50"
    >
      <div className="glass-panel rounded-2xl p-1.5 flex items-center gap-1 shadow-2xl ring-1 ring-white/10">
        {/* Undo/Redo */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          aria-label="Cofnij"
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Cofnij (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          aria-label="Ponów"
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Ponów (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>

        <div className="w-[1px] h-5 bg-white/10 mx-1" />

        {/* Zoom Controls */}
        <button
          onClick={handleZoomOut}
          aria-label="Oddal"
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          title="Oddal"
        >
          <ZoomOut size={16} />
        </button>

        <button
          onClick={handleResetZoom}
          aria-label="Resetuj zoom"
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors font-mono text-xs min-w-[52px] text-center"
          title="Resetuj widok (100%)"
        >
          {zoomPercent}%
        </button>

        <button
          onClick={handleZoomIn}
          aria-label="Przybliż"
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          title="Przybliż"
        >
          <ZoomIn size={16} />
        </button>

        <div className="w-[1px] h-5 bg-white/10 mx-1" />

        {/* Animation Controls */}
        <AnimationControls />

        <div className="w-[1px] h-5 bg-white/10 mx-1" />

        {/* Fit to View */}
        <button
          onClick={handleResetZoom}
          aria-label="Dopasuj widok"
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          title="Dopasuj widok"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </motion.div>
  );
});
