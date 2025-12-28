import React, { useRef, useState, useEffect, memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Draggable from 'react-draggable';
import { ChefHat, Scroll, Utensils, StickyNote, X, GripVertical, ExternalLink, FileText, Keyboard, Eye, Loader2, Search, CheckCircle2, Send, Download, FileOutput, FolderOpen } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import type { Block as BlockType, OutputFile } from '../types';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useConnectedBlocksOfType } from '../lib/useBlockLookup';
import { useExecutionStore, type ContextBlockState, type InputBlockState, type DishBlockState } from '../store/useExecutionStore';
import type { AgentPhase } from '../lib/executionEngineV2';

// --- Types & Interfaces ---

interface BlockProps {
  block: BlockType;
  scale: number;
}

interface BlockHandlers {
  onTitleChange: (val: string) => void;
  onTitleBlur: () => void;
  onDescriptionChange: (val: string) => void;
  onDescriptionBlur: () => void;
  onDelete: () => void;
  onConnectStart: (e: React.MouseEvent) => void;
  onFocus: () => void;
}

interface BlockComponentProps {
  block: BlockType;
  isSelected: boolean;
  isActive?: boolean;
  agentPhase?: AgentPhase;
  handlers: BlockHandlers;
  // Block execution states
  contextState?: ContextBlockState;
  inputState?: InputBlockState;
  dishState?: DishBlockState;
}

// --- Sub-Components ---

const BlockControls = ({ handlers, dark = false }: { handlers: BlockHandlers, dark?: boolean }) => (
  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
    <button
      className={cn(
        "p-1 rounded transition-all cursor-crosshair",
        dark ? "hover:bg-black/10 text-black/40 hover:text-black" : "hover:bg-white/10 text-white/40 hover:text-white"
      )}
      onMouseDown={handlers.onConnectStart}
      title="Drag to connect"
      aria-label="Connect"
    >
      <div className="w-2 h-2 rounded-full border-2 border-current" />
    </button>
    <button
      onClick={(e) => {
        e.stopPropagation();
        handlers.onFocus();
      }}
      className={cn(
        "p-1 rounded transition-all",
        dark ? "hover:bg-black/10 text-black/40 hover:text-black" : "hover:bg-white/10 text-white/40 hover:text-white"
      )}
      title="Focus View"
      aria-label="Focus"
    >
      <Eye size={14} />
    </button>
    <div className={cn("cursor-grab active:cursor-grabbing", dark ? "text-black/20" : "text-white/20")}>
      <GripVertical size={14} />
    </div>
    <button
      onClick={(e) => {
        e.stopPropagation();
        handlers.onDelete();
      }}
      className={cn(
        "p-1 rounded transition-all",
        dark ? "hover:bg-red-500/10 text-black/40 hover:text-red-600" : "hover:bg-red-500/20 text-white/40 hover:text-red-400"
      )}
      aria-label="Delete"
    >
      <X size={14} />
    </button>
  </div>
);

const ChefBlock = ({ block, isSelected, isActive, agentPhase, handlers }: BlockComponentProps) => {
  // Optimized: Get actions directly (they're stable, no subscription needed)
  const setHoveredBlockId = useCallback((id: string | null) => 
    useStore.getState().setHoveredBlockId(id), []);
  const focusBlock = useCallback((id: string) => 
    useStore.getState().focusBlock(id), []);
  
  // Optimized: Only subscribe to THIS agent's progress
  const collectingProgress = useExecutionStore(
    useCallback((state) => state.collectingProgress.get(block.id), [block.id])
  );

  // Optimized: Use dedicated hooks for connected blocks
  const ingredients = useConnectedBlocksOfType(block.id, 'ingredients');
  const contexts = useConnectedBlocksOfType(block.id, 'context_file');
  const inputs = useConnectedBlocksOfType(block.id, 'input_file');

  // Agent phase visual config (v2.0 - event-driven)
  // idle = waiting for input trigger
  // collecting = requesting & receiving context
  // processing = thinking
  // outputting = sending results
  const getCollectingLabel = () => {
    if (collectingProgress && collectingProgress.total > 0) {
      return `Collecting ${collectingProgress.received}/${collectingProgress.total}...`;
    }
    return 'Collecting context...';
  };
  
  const phaseConfig = {
    idle: { icon: null, label: '', color: '' },  // No indicator when waiting
    collecting: { icon: Search, label: getCollectingLabel(), color: 'text-orange-400' },
    processing: { icon: Loader2, label: 'Processing...', color: 'text-cyan-400' },
    outputting: { icon: CheckCircle2, label: 'Sending output...', color: 'text-green-400' },
  };

  const currentPhase = agentPhase && phaseConfig[agentPhase as keyof typeof phaseConfig];
  const PhaseIcon = currentPhase?.icon;

  return (
    <div className={cn(
      "w-80 rounded-xl border-2 bg-slate-900/95 backdrop-blur-xl shadow-2xl transition-all duration-200 group",
      isActive && "ring-4 ring-kitchen-neon-cyan/50 shadow-[0_0_50px_rgba(0,243,255,0.6)] scale-105 border-kitchen-neon-cyan",
      agentPhase === 'collecting' && "ring-4 ring-orange-400/50 shadow-[0_0_40px_rgba(251,191,36,0.4)] border-orange-400",
      agentPhase === 'processing' && "ring-4 ring-kitchen-neon-cyan/50 shadow-[0_0_50px_rgba(0,243,255,0.6)] border-kitchen-neon-cyan",
      isSelected && !isActive ? "border-kitchen-neon-cyan shadow-[0_0_30px_-5px_rgba(0,243,255,0.3)]" : "border-slate-700 hover:border-slate-600"
    )}>
      {/* Agent Phase Indicator */}
      {PhaseIcon && currentPhase?.label && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            "absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/90 border border-slate-700 backdrop-blur-sm",
            currentPhase.color
          )}
        >
          <PhaseIcon size={12} className={agentPhase === 'processing' || agentPhase === 'collecting' ? 'animate-spin' : ''} />
          <span>{currentPhase.label}</span>
        </motion.div>
      )}

      {/* ID Card Header */}
      <div className="flex items-center gap-3 p-3 border-b border-slate-700/50 bg-slate-800/50 rounded-t-xl drag-handle">
        <div className={cn(
          "p-2 rounded-lg transition-all duration-300",
          isActive ? "bg-kitchen-neon-cyan/20 text-kitchen-neon-cyan animate-pulse" : "bg-kitchen-neon-cyan/10 text-kitchen-neon-cyan"
        )}>
          <ChefHat size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-kitchen-neon-cyan/80">AI Agent</div>
          <input
            className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder-slate-500"
            value={block.title}
            onChange={(e) => handlers.onTitleChange(e.target.value)}
            onBlur={handlers.onTitleBlur}
            placeholder="Agent Name"
          />
        </div>
        <BlockControls handlers={handlers} />
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider">System Prompt</div>
        <TextareaAutosize
          className="w-full bg-slate-950/50 rounded-lg p-2 text-xs font-mono text-slate-300 outline-none resize-none border border-slate-800 focus:border-kitchen-neon-cyan/50 transition-colors"
          value={block.description}
          onChange={(e) => handlers.onDescriptionChange(e.target.value)}
          onBlur={handlers.onDescriptionBlur}
          placeholder="Define agent behavior..."
          minRows={3}
        />
      </div>

      {/* Connected Contexts (Ingredients) */}
      {ingredients.length > 0 && (
        <div className="px-3 pb-3">
          <div className="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-2">
            Data Sources <span className="bg-slate-800 text-slate-400 px-1 rounded text-[9px]">{ingredients.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ingredients.map(ing => (
              <div
                key={ing.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/5 border border-orange-500/10 text-[10px] text-orange-200/80 cursor-pointer hover:bg-orange-500/20 hover:border-orange-500/30 hover:text-orange-100 transition-all group/tag"
                onMouseEnter={() => setHoveredBlockId(ing.id)}
                onMouseLeave={() => setHoveredBlockId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  focusBlock(ing.id);
                }}
                title={`Go to ${ing.title}`}
              >
                <Scroll size={10} className="text-orange-400" />
                <span className="truncate max-w-[120px]">{ing.title}</span>
                <ExternalLink size={8} className="opacity-0 group-hover/tag:opacity-50 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected Context Files */}
      {contexts.length > 0 && (
        <div className="px-3 pb-3">
          <div className="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-2">
            Context Files <span className="bg-slate-800 text-slate-400 px-1 rounded text-[9px]">{contexts.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {contexts.map(ctx => (
              <div
                key={ctx.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/5 border border-blue-500/10 text-[10px] text-blue-200/80 cursor-pointer hover:bg-blue-500/20 hover:border-blue-500/30 hover:text-blue-100 transition-all group/tag"
                onMouseEnter={() => setHoveredBlockId(ctx.id)}
                onMouseLeave={() => setHoveredBlockId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  focusBlock(ctx.id);
                }}
                title={`Go to ${ctx.title}`}
              >
                <FileText size={10} className="text-blue-400" />
                <span className="truncate max-w-[120px]">{ctx.title}</span>
                <ExternalLink size={8} className="opacity-0 group-hover/tag:opacity-50 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected Input Files */}
      {inputs.length > 0 && (
        <div className="px-3 pb-3">
          <div className="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-2">
            Input Files <span className="bg-slate-800 text-slate-400 px-1 rounded text-[9px]">{inputs.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {inputs.map(inp => (
              <div
                key={inp.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/5 border border-green-500/10 text-[10px] text-green-200/80 cursor-pointer hover:bg-green-500/20 hover:border-green-500/30 hover:text-green-100 transition-all group/tag"
                onMouseEnter={() => setHoveredBlockId(inp.id)}
                onMouseLeave={() => setHoveredBlockId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  focusBlock(inp.id);
                }}
                title={`Go to ${inp.title}`}
              >
                <Keyboard size={10} className="text-green-400" />
                <span className="truncate max-w-[120px]">{inp.title}</span>
                <ExternalLink size={8} className="opacity-0 group-hover/tag:opacity-50 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output Files - Files this agent produces */}
      {block.data?.outputs && block.data.outputs.length > 0 && (
        <div className="px-3 pb-3">
          <div className="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-2">
            Output Files <span className="bg-purple-900/50 text-purple-300 px-1 rounded text-[9px]">{block.data.outputs.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {block.data.outputs.map(output => (
              <div
                key={output.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-200/90 transition-all group/tag"
                title={output.description || output.filename}
              >
                <FileOutput size={10} className="text-purple-400" />
                <span className="truncate max-w-[140px] font-mono">{output.filename}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const IngredientsBlock = ({ block, isSelected, handlers }: BlockComponentProps) => (
  <div className={cn(
    "w-64 rounded-lg border bg-slate-50/95 backdrop-blur-md shadow-lg transition-all duration-200 text-slate-800 group",
    isSelected ? "border-orange-400 ring-2 ring-orange-400/20" : "border-slate-200 hover:border-slate-300"
  )}>
    <div className="h-1.5 w-full bg-orange-400 rounded-t-lg drag-handle" />
    <div className="p-3">
      <div className="flex items-start justify-between gap-2 mb-2 drag-handle">
        <div className="flex items-center gap-2 text-orange-600">
          <Scroll size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Data Source</span>
        </div>
        <BlockControls handlers={handlers} dark={true} />
      </div>

      <input
        className="w-full bg-transparent text-base font-bold text-slate-900 outline-none placeholder-slate-400 mb-2"
        value={block.title}
        onChange={(e) => handlers.onTitleChange(e.target.value)}
        onBlur={handlers.onTitleBlur}
        placeholder="Data Name"
      />

      <div className="relative">
        <div className="absolute left-0 top-2 bottom-0 w-0.5 bg-slate-200" />
        <TextareaAutosize
          className="w-full bg-transparent pl-3 text-sm text-slate-600 outline-none resize-none font-mono"
          value={block.description}
          onChange={(e) => handlers.onDescriptionChange(e.target.value)}
          onBlur={handlers.onDescriptionBlur}
          placeholder="Paste data or context..."
          minRows={2}
        />
      </div>
    </div>
  </div>
);

const ContextFileBlock = ({ block, isSelected, contextState, handlers }: BlockComponentProps) => {
  // Context state visual config
  const stateConfig = {
    receiving: { 
      borderClass: 'border-orange-400 ring-2 ring-orange-400/30', 
      iconClass: 'text-orange-500 animate-pulse',
      label: 'Receiving query...',
    },
    processing: { 
      borderClass: 'border-yellow-400 ring-2 ring-yellow-400/30', 
      iconClass: 'text-yellow-500',
      label: 'Reading...',
    },
    sending: { 
      borderClass: 'border-green-400 ring-2 ring-green-400/30 shadow-[0_0_20px_rgba(34,197,94,0.3)]', 
      iconClass: 'text-green-500',
      label: 'Sending response...',
    },
  };
  
  const currentStateConfig = contextState && contextState !== 'idle' ? stateConfig[contextState] : null;

  return (
    <div className={cn(
      "w-64 rounded-lg border bg-slate-50/95 backdrop-blur-md shadow-lg transition-all duration-200 text-slate-800 group relative",
      currentStateConfig?.borderClass,
      isSelected && !currentStateConfig ? "border-blue-400 ring-2 ring-blue-400/20" : !currentStateConfig && "border-slate-200 hover:border-slate-300"
    )}>
      {/* State indicator */}
      {currentStateConfig && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-900/90 text-white border border-slate-700 backdrop-blur-sm whitespace-nowrap"
        >
          {contextState === 'receiving' && <Download size={10} className="animate-bounce" />}
          {contextState === 'processing' && <Loader2 size={10} className="animate-spin" />}
          {contextState === 'sending' && <Send size={10} />}
          <span>{currentStateConfig.label}</span>
        </motion.div>
      )}
      
      <div className={cn(
        "h-1.5 w-full rounded-t-lg drag-handle transition-colors",
        contextState === 'receiving' ? 'bg-orange-400' :
        contextState === 'processing' ? 'bg-yellow-400' :
        contextState === 'sending' ? 'bg-green-400' : 'bg-blue-400'
      )} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2 drag-handle">
          <div className={cn("flex items-center gap-2", currentStateConfig?.iconClass || "text-blue-600")}>
            <FileText size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Context File</span>
          </div>
          <BlockControls handlers={handlers} dark={true} />
        </div>

        <input
          className="w-full bg-transparent text-base font-bold text-slate-900 outline-none placeholder-slate-400 mb-2"
          value={block.title}
          onChange={(e) => handlers.onTitleChange(e.target.value)}
          onBlur={handlers.onTitleBlur}
          placeholder="File Name"
        />

        <div className="relative">
          <div className="absolute left-0 top-2 bottom-0 w-0.5 bg-slate-200" />
          <TextareaAutosize
            className="w-full bg-transparent pl-3 text-sm text-slate-600 outline-none resize-none font-mono"
            value={block.description}
            onChange={(e) => handlers.onDescriptionChange(e.target.value)}
            onBlur={handlers.onDescriptionBlur}
            placeholder="Paste context content..."
            minRows={2}
          />
        </div>
      </div>
    </div>
  );
};

const InputFileBlock = ({ block, isSelected, inputState, handlers }: BlockComponentProps) => {
  const isSending = inputState === 'sending';
  const simulationState = useExecutionStore((state) => state.simulationState);
  
  // Show send button in ready or running state
  const showSendButton = simulationState === 'ready' || simulationState === 'running';
  
  // Use stable callback - get action via getState to avoid subscription
  const handleSendClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    useExecutionStore.getState().triggerInput(block.id);
  }, [block.id]);
  
  return (
    <div className={cn(
      "w-64 rounded-lg border bg-slate-50/95 backdrop-blur-md shadow-lg transition-all duration-200 text-slate-800 group relative",
      isSending && "border-blue-500 ring-2 ring-blue-500/30 shadow-[0_0_25px_rgba(59,130,246,0.4)]",
      isSelected && !isSending ? "border-green-400 ring-2 ring-green-400/20" : !isSending && "border-slate-200 hover:border-slate-300"
    )}>
      {/* Send button for simulation mode */}
      {showSendButton && !isSending && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleSendClick}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 hover:scale-110 transition-all"
          title="Send input packet"
        >
          <Send size={14} />
        </motion.button>
      )}
      
      {/* Sending indicator */}
      {isSending && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500 text-white whitespace-nowrap"
        >
          <Send size={10} className="animate-pulse" />
          <span>Sending input...</span>
        </motion.div>
      )}
      
      <div className={cn(
        "h-1.5 w-full rounded-t-lg drag-handle transition-colors",
        isSending ? 'bg-blue-500 animate-pulse' : 'bg-green-400'
      )} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2 drag-handle">
          <div className={cn("flex items-center gap-2", isSending ? "text-blue-600" : "text-green-600")}>
            <Keyboard size={16} className={isSending ? "animate-pulse" : ""} />
            <span className="text-xs font-bold uppercase tracking-wider">Input File</span>
          </div>
          <BlockControls handlers={handlers} dark={true} />
        </div>

        <input
          className="w-full bg-transparent text-base font-bold text-slate-900 outline-none placeholder-slate-400 mb-2"
          value={block.title}
          onChange={(e) => handlers.onTitleChange(e.target.value)}
          onBlur={handlers.onTitleBlur}
          placeholder="Input Name"
        />

        <div className="relative">
          <div className="absolute left-0 top-2 bottom-0 w-0.5 bg-slate-200" />
          <TextareaAutosize
            className="w-full bg-transparent pl-3 text-sm text-slate-600 outline-none resize-none font-mono"
            value={block.description}
            onChange={(e) => handlers.onDescriptionChange(e.target.value)}
            onBlur={handlers.onDescriptionBlur}
            placeholder="Paste input content..."
            minRows={2}
          />
        </div>
      </div>
    </div>
  );
};

const DishBlock = ({ block, isSelected, isActive, dishState, handlers }: BlockComponentProps) => {
  const isReceiving = dishState === 'receiving';
  const isComplete = dishState === 'complete';
  
  // Optimized: Use dedicated hook for connected agents
  const connectedAgents = useConnectedBlocksOfType(block.id, 'chef');

  // Aggregate all output files from connected agents
  const aggregatedOutputs = useMemo(() => {
    const outputs: Array<{ agentId: string; agentTitle: string; file: OutputFile }> = [];
    connectedAgents.forEach(agent => {
      if (agent.data?.outputs) {
        agent.data.outputs.forEach(output => {
          outputs.push({
            agentId: agent.id,
            agentTitle: agent.title,
            file: output
          });
        });
      }
    });
    return outputs;
  }, [connectedAgents]);

  const totalFiles = aggregatedOutputs.length;
  
  return (
    <div className={cn(
      "w-72 rounded-2xl border-2 bg-gradient-to-br from-purple-900/90 to-slate-900/90 backdrop-blur-xl shadow-2xl transition-all duration-200 group relative",
      isReceiving && "ring-4 ring-purple-400/60 shadow-[0_0_40px_rgba(168,85,247,0.5)] scale-102 border-purple-400",
      isComplete && "ring-4 ring-green-400/60 shadow-[0_0_50px_rgba(34,197,94,0.6)] scale-105 border-green-400",
      isActive && !isReceiving && !isComplete && "ring-4 ring-kitchen-neon-purple/50 shadow-[0_0_50px_rgba(188,19,254,0.6)] scale-105 border-kitchen-neon-purple",
      isSelected && !isActive && !isReceiving && !isComplete ? "border-kitchen-neon-purple shadow-[0_0_30px_-5px_rgba(188,19,254,0.4)]" : !isActive && !isReceiving && !isComplete && "border-purple-500/30 hover:border-purple-500/50"
    )}>
      {/* State indicator */}
      {(isReceiving || isComplete) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap",
            isReceiving && "bg-purple-500 text-white",
            isComplete && "bg-green-500 text-white"
          )}
        >
          {isReceiving && <Download size={12} className="animate-bounce" />}
          {isComplete && <CheckCircle2 size={12} />}
          <span>{isReceiving ? 'Receiving output...' : 'Complete!'}</span>
        </motion.div>
      )}
      
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-purple-700/30 bg-purple-800/20 rounded-t-2xl drag-handle">
        <div className={cn(
          "p-2 rounded-lg transition-all duration-300",
          isComplete 
            ? "bg-green-500/20 text-green-400" 
            : isReceiving 
              ? "bg-purple-500/30 text-purple-300 animate-pulse"
              : "bg-kitchen-neon-purple/20 text-kitchen-neon-purple"
        )}>
          {isComplete ? <CheckCircle2 size={20} /> : <FolderOpen size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-purple-400/80">Output Folder</div>
          <input
            className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder-white/30"
            value={block.title}
            onChange={(e) => handlers.onTitleChange(e.target.value)}
            onBlur={handlers.onTitleBlur}
            placeholder="Folder Name"
          />
        </div>
        <BlockControls handlers={handlers} />
      </div>

      {/* Folder Path */}
      {block.data?.outputFolder && (
        <div className="px-3 pt-2">
          <div className="text-[9px] font-mono text-purple-400/60 truncate" title={block.data.outputFolder}>
            📁 {block.data.outputFolder}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-3 pt-2">
        {/* Description */}
        <TextareaAutosize
          className="w-full bg-purple-950/30 rounded-lg p-2 text-xs text-purple-200/80 outline-none resize-none border border-purple-800/30 focus:border-purple-500/50 transition-colors mb-3"
          value={block.description}
          onChange={(e) => handlers.onDescriptionChange(e.target.value)}
          onBlur={handlers.onDescriptionBlur}
          placeholder="Describe the output collection..."
          minRows={1}
        />

        {/* Connected Agents Section */}
        {connectedAgents.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] font-mono text-purple-500/70 mb-1.5 uppercase tracking-wider flex items-center gap-2">
              Sources <span className="bg-purple-900/50 text-purple-300 px-1 rounded text-[9px]">{connectedAgents.length}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {connectedAgents.map(agent => (
                <div
                  key={agent.id}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[9px] text-cyan-300/80"
                >
                  <ChefHat size={9} className="text-cyan-400" />
                  <span className="truncate max-w-[80px]">{agent.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collected Files Section */}
        <div className="text-[10px] font-mono text-purple-500/70 mb-1.5 uppercase tracking-wider flex items-center gap-2">
          Generated Files <span className="bg-purple-900/50 text-purple-300 px-1 rounded text-[9px]">{totalFiles}</span>
        </div>
        
        {totalFiles === 0 ? (
          <div className="text-[10px] text-purple-400/40 italic text-center py-2 border border-dashed border-purple-700/30 rounded-lg">
            Connect agents to collect their outputs
          </div>
        ) : (
          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
            {aggregatedOutputs.map((item, idx) => (
              <div
                key={`${item.agentId}-${item.file.id}-${idx}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-purple-950/50 border border-purple-700/30 text-[10px] group/file"
                title={item.file.description || `From ${item.agentTitle}`}
              >
                <FileOutput size={11} className={cn(
                  "shrink-0",
                  isComplete ? "text-green-400" : "text-purple-400"
                )} />
                <span className="font-mono text-purple-100 truncate flex-1">{item.file.filename}</span>
                <span className="text-[8px] text-purple-500/60 uppercase">{item.file.format}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const NoteBlock = ({ block, isSelected, handlers }: BlockComponentProps) => (
  <div className={cn(
    "w-64 min-h-[160px] shadow-lg transition-all duration-200 flex flex-col group rounded-lg overflow-hidden",
    "bg-[#fef9c3] text-yellow-900", // Yellow-50
    isSelected ? "ring-2 ring-yellow-500 shadow-xl z-50" : "hover:shadow-xl border border-yellow-200"
  )}>
    <div className="h-8 w-full bg-yellow-200/50 border-b border-yellow-300/30 flex items-center justify-between px-2 cursor-move drag-handle">
      <div className="flex items-center gap-2 text-yellow-700/70">
        <StickyNote size={14} />
        <span className="text-xs font-bold uppercase tracking-wider">Note</span>
      </div>
      <BlockControls handlers={handlers} dark={true} />
    </div>
    <div className="flex-1 p-3">
      <TextareaAutosize
        className="w-full h-full bg-transparent text-sm outline-none resize-none placeholder-yellow-900/30 leading-relaxed font-medium text-yellow-900/90"
        value={block.description}
        onChange={(e) => handlers.onDescriptionChange(e.target.value)}
        onBlur={handlers.onDescriptionBlur}
        placeholder="Write a note..."
        minRows={4}
      />
    </div>
  </div>
);

// --- Compact / Minimal Variants (LOD) ---

const CompactBlockView = ({ block, isSelected }: BlockComponentProps) => {
  const icon = block.type === 'chef' ? <ChefHat size={16} /> : block.type === 'ingredients' ? <Scroll size={16} /> : block.type === 'context_file' ? <FileText size={16} /> : block.type === 'input_file' ? <Keyboard size={16} /> : block.type === 'dish' ? <Utensils size={16} /> : <StickyNote size={16} />;
  return (
    <div className={cn(
      "w-44 rounded-md p-2 flex items-center gap-2 drag-handle",
      isSelected ? "ring-2 ring-kitchen-neon-cyan bg-slate-900/70" : "bg-slate-800/40 hover:bg-slate-800/60"
    )}>
      <div className="w-8 h-8 rounded flex items-center justify-center bg-black/20 text-white">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{block.title || 'Untitled'}</div>
        <div className="text-xs text-slate-400 truncate">{block.type}</div>
      </div>
    </div>
  );
};

const MinimalBlockView = ({ block, isSelected }: BlockComponentProps) => {
  const bg = block.type === 'chef' ? 'bg-kitchen-neon-cyan/20' : block.type === 'ingredients' ? 'bg-orange-200/60' : block.type === 'context_file' ? 'bg-blue-200/60' : block.type === 'input_file' ? 'bg-green-200/60' : block.type === 'dish' ? 'bg-kitchen-neon-purple/20' : 'bg-yellow-200/60';
  const icon = block.type === 'chef' ? <ChefHat size={12} /> : block.type === 'ingredients' ? <Scroll size={12} /> : block.type === 'context_file' ? <FileText size={12} /> : block.type === 'input_file' ? <Keyboard size={12} /> : block.type === 'dish' ? <Utensils size={12} /> : <StickyNote size={12} />;
  return (
    <div title={block.title || ''} className={cn(
      "w-14 h-8 rounded-md flex items-center justify-center drag-handle",
      bg,
      isSelected ? 'ring-2 ring-kitchen-neon-cyan' : ''
    )}>
      <div className="text-xs text-slate-800">{icon}</div>
    </div>
  );
};

// --- Main Component ---

export const Block: React.FC<BlockProps> = memo(({ block, scale }) => {
  // Only subscribe to data that affects rendering
  const { selectedBlockIds, highlightedBlockIds } = useStore(useShallow((state) => ({
    selectedBlockIds: state.selectedBlockIds,
    highlightedBlockIds: state.highlightedBlockIds,
  })));
  
  // Actions via getState() - no subscription needed for stable functions
  const selectBlock = useCallback((id: string | null, multi?: boolean) => 
    useStore.getState().selectBlock(id, multi), []);
  const updateBlock = useCallback((id: string, data: Partial<BlockType>) => 
    useStore.getState().updateBlock(id, data), []);
  const deleteBlock = useCallback((id: string) => 
    useStore.getState().deleteBlock(id), []);
  const focusBlock = useCallback((id: string) => 
    useStore.getState().focusBlock(id), []);
  const setConnectingSourceId = useCallback((id: string | null) => 
    useStore.getState().setConnectingSourceId(id), []);
  const setHoveredBlockId = useCallback((id: string | null) => 
    useStore.getState().setHoveredBlockId(id), []);
  const setDraggingBlock = useCallback((id: string | null, pos: { x: number; y: number } | null) => 
    useStore.getState().setDraggingBlock(id, pos), []);

  const isSelected = selectedBlockIds.includes(block.id);

  const isHighlighted = highlightedBlockIds.length > 0 && highlightedBlockIds.includes(block.id);
  const isDimmed = highlightedBlockIds.length > 0 && !isHighlighted;

  const nodeRef = useRef<HTMLDivElement>(null);

  // Local state for inputs
  const [title, setTitle] = useState(block.title);
  const [description, setDescription] = useState(block.description);

  // Measure size
  useEffect(() => {
    if (!nodeRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const width = el.offsetWidth;
        const height = el.offsetHeight;

        // Only update if changed significantly (ignore sub-pixel jitter and minor layout shifts)
        if (Math.abs(width - (block.width || 0)) > 5 || Math.abs(height - (block.height || 0)) > 5) {

          // We use a timeout to avoid "ResizeObserver loop limit exceeded" and to debounce
          setTimeout(() => {
            updateBlock(block.id, { width, height });
          }, 0);
        }
      }
    });

    observer.observe(nodeRef.current);
    return () => observer.disconnect();
  }, [block.id, block.width, block.height, updateBlock]);

  useEffect(() => {
    setTitle(block.title);
  }, [block.title]);

  useEffect(() => {
    setDescription(block.description);
  }, [block.description]);

  const [isDragging, setIsDragging] = useState(false);
  const rAF = useRef<number | null>(null);

  const handleDrag = (_e: any, data: { x: number; y: number }) => {
    if (rAF.current) return;

    rAF.current = requestAnimationFrame(() => {
      setDraggingBlock(block.id, { x: data.x, y: data.y });
      rAF.current = null;
    });
  };

  const handleStop = (_e: any, data: { x: number; y: number }) => {
    setIsDragging(false);
    if (rAF.current) {
      cancelAnimationFrame(rAF.current);
      rAF.current = null;
    }
    setDraggingBlock(null, null);
    if (data.x !== block.x || data.y !== block.y) {
      updateBlock(block.id, { x: data.x, y: data.y });
    }
  };

  const handlers: BlockHandlers = {
    onTitleChange: setTitle,
    onTitleBlur: () => {
      if (title !== block.title) updateBlock(block.id, { title });
    },
    onDescriptionChange: setDescription,
    onDescriptionBlur: () => {
      if (description !== block.description) updateBlock(block.id, { description });
    },
    onDelete: () => deleteBlock(block.id),
    onConnectStart: (e) => {
      e.stopPropagation();
      e.preventDefault();
      setConnectingSourceId(block.id);
    },
    onFocus: () => focusBlock(block.id),
  };

  // Optimized: Only subscribe to THIS block's state, not entire Maps
  // This prevents re-renders when OTHER blocks change state
  const isActive = useExecutionStore(
    useCallback((state) => state.activeNodeIds.includes(block.id), [block.id])
  );
  const agentPhase = useExecutionStore(
    useCallback((state) => state.agentPhases.get(block.id) || 'idle', [block.id])
  );
  const contextState = useExecutionStore(
    useCallback((state) => state.contextStates.get(block.id), [block.id])
  );
  const inputState = useExecutionStore(
    useCallback((state) => state.inputStates.get(block.id), [block.id])
  );
  const dishState = useExecutionStore(
    useCallback((state) => state.dishStates.get(block.id), [block.id])
  );

  // Render specific block type with Level-of-Detail (LOD)
  const renderBlockContent = () => {
    const props = { 
      block: { ...block, title, description }, 
      isSelected, 
      isActive, 
      handlers, 
      agentPhase,
      contextState,
      inputState,
      dishState,
    };

    // LOD thresholds: minimal (<0.4), compact (0.4 - 0.7), full (>=0.7)
    if (scale < 0.4) {
      return <MinimalBlockView {...props} />;
    }
    if (scale < 0.7) {
      return <CompactBlockView {...props} />;
    }

    switch (block.type) {
      case 'chef': return <ChefBlock {...props} />;
      case 'ingredients': return <IngredientsBlock {...props} />;
      case 'context_file': return <ContextFileBlock {...props} />;
      case 'input_file': return <InputFileBlock {...props} />;
      case 'dish': return <DishBlock {...props} />;
      case 'note': return <NoteBlock {...props} />;
      default: return <ChefBlock {...props} />;
    }
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      defaultPosition={{ x: block.x, y: block.y }}
      scale={scale}
      onDrag={handleDrag}
      onStop={handleStop}
      onStart={(e) => {
        setIsDragging(true);
        const mouseEvent = e as MouseEvent;
        const isMulti = mouseEvent.ctrlKey || mouseEvent.metaKey;

        // If not already selected, select it (handling multi-select modifier)
        if (!isSelected) {
          selectBlock(block.id, isMulti);
        }
        // If already selected and multi-key pressed, we might want to deselect? 
        // But usually dragging implies keeping it selected. 
        // We'll leave toggle logic to onClick.
      }}
      handle=".drag-handle"
    >
      <div
        ref={nodeRef}
        tabIndex={0}
        aria-label={`${block.type} block: ${block.title}`}
        className={cn(
          "absolute will-change-transform outline-none focus:ring-2 focus:ring-kitchen-neon-cyan/50 rounded-xl",
          !isDragging && "transition-all duration-200",
          isSelected ? "z-50" : "z-10 hover:z-40",
          isDimmed && "opacity-20 blur-[1px] grayscale pointer-events-none",
          // subtle ring for highlighted (but not selected)
          !isDimmed && !isSelected && isHighlighted && "ring-2 ring-kitchen-neon-cyan/40 shadow-[0_0_15px_rgba(0,243,255,0.15)] z-30"
        )}
        onClick={(e) => {
          e.stopPropagation();
          selectBlock(block.id, e.ctrlKey || e.metaKey);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            selectBlock(block.id, e.ctrlKey || e.metaKey);
          }
        }}
        onMouseEnter={() => setHoveredBlockId(block.id)}
        onMouseLeave={() => setHoveredBlockId(null)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
          className="w-full h-full"
        >
          {renderBlockContent()}
        </motion.div>
      </div>
    </Draggable>
  );
});
