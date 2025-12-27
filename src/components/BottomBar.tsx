import React, { memo, useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Play, Square, Gauge, Snail, Rabbit, ChevronUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useExecutionStore } from '../store/useExecutionStore';
import { cn } from '../lib/utils';

// Speed presets
const SPEED_PRESETS = [
  { value: 0.25, label: 'Slow', icon: Snail },
  { value: 1, label: 'Normal', icon: Gauge },
  { value: 3, label: 'Fast', icon: Rabbit },
];

// Keyboard shortcuts hook
const useKeyboardShortcuts = () => {
  const isRunning = useExecutionStore((s) => s.simulationMode);
  const setSimulationMode = useExecutionStore((s) => s.setSimulationMode);
  const executionSpeed = useExecutionStore((s) => s.executionSpeed);
  const setExecutionSpeed = useExecutionStore((s) => s.setExecutionSpeed);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Space = Play/Pause (prevent page scroll)
      if (e.code === 'Space' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Only toggle if not holding space for pan
        if (!e.repeat) {
          // Don't toggle immediately - wait to see if it's a pan gesture
          // For now, use Shift+Space for simulation toggle
        }
      }
      
      // Shift+Space = Toggle simulation
      if (e.code === 'Space' && e.shiftKey && !e.repeat) {
        e.preventDefault();
        setSimulationMode(!isRunning);
      }
      
      // Plus/Equal = Speed up (with or without shift)
      if ((e.key === '+' || e.key === '=') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const newSpeed = Math.min(executionSpeed + 0.25, 3);
        setExecutionSpeed(newSpeed);
      }
      
      // Minus = Speed down
      if (e.key === '-' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const newSpeed = Math.max(executionSpeed - 0.25, 0.25);
        setExecutionSpeed(newSpeed);
      }
      
      // 1, 2, 3 = Speed presets (when simulation is running)
      if (isRunning && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          setExecutionSpeed(0.25); // Slow
        } else if (e.key === '2') {
          e.preventDefault();
          setExecutionSpeed(1); // Normal
        } else if (e.key === '3') {
          e.preventDefault();
          setExecutionSpeed(3); // Fast
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, setSimulationMode, executionSpeed, setExecutionSpeed]);
};

const SpeedControl = memo(() => {
  const [isExpanded, setIsExpanded] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const executionSpeed = useExecutionStore((s) => s.executionSpeed);
  const setExecutionSpeed = useExecutionStore((s) => s.setExecutionSpeed);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (controlRef.current && !controlRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatSpeed = (speed: number) => {
    if (speed >= 1) return `${speed}x`;
    return `${speed}x`;
  };

  const getSpeedLabel = (speed: number) => {
    if (speed <= 0.5) return 'Slow';
    if (speed >= 2) return 'Fast';
    return 'Normal';
  };

  return (
    <div ref={controlRef} className="relative">
      {/* Speed Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all",
          "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white",
          isExpanded && "bg-white/10 text-white"
        )}
        title="Adjust animation speed"
      >
        <Gauge size={14} />
        <span className="font-mono text-xs">{formatSpeed(executionSpeed)}</span>
        <ChevronUp 
          size={12} 
          className={cn(
            "transition-transform duration-200",
            isExpanded ? "rotate-180" : "rotate-0"
          )} 
        />
      </button>

      {/* Expanded Speed Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl min-w-[180px]"
          >
            {/* Speed Label */}
            <div className="text-center mb-3">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Speed</span>
              <div className="text-lg font-bold text-white font-mono">{formatSpeed(executionSpeed)}</div>
              <span className="text-xs text-cyan-400">{getSpeedLabel(executionSpeed)}</span>
            </div>

            {/* Slider */}
            <div className="mb-3 px-1">
              <input
                type="range"
                min="0.25"
                max="3"
                step="0.25"
                value={executionSpeed}
                onChange={(e) => setExecutionSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer 
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-4 
                  [&::-webkit-slider-thumb]:h-4 
                  [&::-webkit-slider-thumb]:rounded-full 
                  [&::-webkit-slider-thumb]:bg-cyan-400 
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:shadow-cyan-400/30
                  [&::-webkit-slider-thumb]:hover:bg-cyan-300
                  [&::-webkit-slider-thumb]:transition-colors"
              />
              <div className="flex justify-between mt-1 text-[10px] text-white/30">
                <span>0.25x</span>
                <span>3x</span>
              </div>
            </div>

            {/* Preset Buttons */}
            <div className="flex gap-1">
              {SPEED_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isActive = executionSpeed === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => setExecutionSpeed(preset.value)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-all text-xs",
                      isActive 
                        ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40"
                        : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon size={14} />
                    <span className="text-[10px]">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

const AnimationControls = () => {
  const isRunning = useExecutionStore((s) => s.simulationMode);
  const setSimulationMode = useExecutionStore((s) => s.setSimulationMode);

  const toggleRun = () => {
    // ExecutionEngine handles all packet logic via setSimulationMode
    // - start() sends initial triggers only from input_file blocks
    // - stop() clears all state
    setSimulationMode(!isRunning);
  };

  return (
    <>
      <button
        onClick={toggleRun}
        aria-label={isRunning ? "Stop Animation" : "Start Animation"}
        className={cn(
          "p-2.5 rounded-xl transition-all",
          isRunning
            ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
            : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
        )}
        title={isRunning ? "Stop Animation (Shift+Space)" : "Start Animation (Shift+Space)"}
      >
        {isRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>

      {isRunning && <SpeedControl />}
    </>
  );
};

export const BottomBar: React.FC = memo(() => {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const view = useStore((state) => state.view);
  const updateView = useStore((state) => state.updateView);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

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
