import React, { useRef, useState, useEffect, memo } from 'react';
import Draggable from 'react-draggable';
import { ChefHat, Scroll, Utensils, StickyNote, X, GripVertical } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import type { Block as BlockType } from '../types';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';

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
}

interface BlockComponentProps {
  block: BlockType;
  isSelected: boolean;
  handlers: BlockHandlers;
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
    >
      <div className="w-2 h-2 rounded-full border-2 border-current" />
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
    >
      <X size={14} />
    </button>
  </div>
);

const ChefBlock = ({ block, isSelected, handlers }: BlockComponentProps) => (
  <div className={cn(
    "w-80 rounded-xl border-2 bg-slate-900/95 backdrop-blur-xl shadow-2xl transition-all duration-200 group",
    isSelected ? "border-kitchen-neon-cyan shadow-[0_0_30px_-5px_rgba(0,243,255,0.3)]" : "border-slate-700 hover:border-slate-600"
  )}>
    {/* ID Card Header */}
    <div className="flex items-center gap-3 p-3 border-b border-slate-700/50 bg-slate-800/50 rounded-t-xl drag-handle">
      <div className={cn("p-2 rounded-lg bg-kitchen-neon-cyan/10 text-kitchen-neon-cyan")}>
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
  </div>
);

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

const DishBlock = ({ block, isSelected, handlers }: BlockComponentProps) => (
  <div className={cn(
    "w-72 rounded-2xl border-2 bg-gradient-to-br from-purple-900/90 to-slate-900/90 backdrop-blur-xl shadow-2xl transition-all duration-200 group",
    isSelected ? "border-kitchen-neon-purple shadow-[0_0_30px_-5px_rgba(188,19,254,0.4)]" : "border-purple-500/30 hover:border-purple-500/50"
  )}>
    <div className="p-4 text-center relative drag-handle">
      <div className="absolute right-2 top-2">
        <BlockControls handlers={handlers} />
      </div>
      
      <div className="mx-auto w-12 h-12 rounded-full bg-kitchen-neon-purple/20 flex items-center justify-center text-kitchen-neon-purple mb-3 ring-1 ring-kitchen-neon-purple/50 shadow-[0_0_15px_rgba(188,19,254,0.3)]">
        <Utensils size={24} />
      </div>
      
      <input
        className="w-full bg-transparent text-center text-lg font-bold text-white outline-none placeholder-white/30 mb-1"
        value={block.title}
        onChange={(e) => handlers.onTitleChange(e.target.value)}
        onBlur={handlers.onTitleBlur}
        placeholder="Result Name"
      />
      
      <div className="h-px w-16 bg-purple-500/30 mx-auto my-2" />
      
      <TextareaAutosize
        className="w-full bg-transparent text-center text-xs text-purple-200/80 outline-none resize-none"
        value={block.description}
        onChange={(e) => handlers.onDescriptionChange(e.target.value)}
        onBlur={handlers.onDescriptionBlur}
        placeholder="Expected output..."
        minRows={1}
      />
    </div>
  </div>
);

const NoteBlock = ({ block, isSelected, handlers }: BlockComponentProps) => (
  <div className={cn(
    "w-64 aspect-square shadow-lg transition-all duration-200 flex flex-col group",
    "bg-[#fef3c7] text-yellow-900 rotate-1 hover:rotate-0",
    isSelected ? "ring-2 ring-yellow-500 scale-105 z-50" : "hover:scale-105"
  )}>
    <div className="h-8 w-full bg-yellow-400/20 flex items-center justify-between px-2 cursor-move drag-handle">
      <StickyNote size={14} className="opacity-50" />
      <BlockControls handlers={handlers} dark={true} />
    </div>
    <div className="flex-1 p-4">
      <TextareaAutosize
        className="w-full h-full bg-transparent text-sm outline-none resize-none placeholder-yellow-900/30 leading-relaxed"
        value={block.description}
        onChange={(e) => handlers.onDescriptionChange(e.target.value)}
        onBlur={handlers.onDescriptionBlur}
        placeholder="Write a note..."
      />
    </div>
  </div>
);

// --- Main Component ---

export const Block: React.FC<BlockProps> = memo(({ block, scale }) => {
  const selectBlock = useStore((state) => state.selectBlock);
  const updateBlock = useStore((state) => state.updateBlock);
  const deleteBlock = useStore((state) => state.deleteBlock);
  const setConnectingSourceId = useStore((state) => state.setConnectingSourceId);
  const setHoveredBlockId = useStore((state) => state.setHoveredBlockId);
  const setDraggingBlock = useStore((state) => state.setDraggingBlock);
  
  const selectedBlockIds = useStore((state) => state.selectedBlockIds);
  const isSelected = selectedBlockIds.includes(block.id);
  
  const highlightedBlockIds = useStore((state) => state.highlightedBlockIds);
  
  const isDimmed = highlightedBlockIds.length > 0 && !highlightedBlockIds.includes(block.id);

  const nodeRef = useRef(null);

  // Local state for inputs
  const [title, setTitle] = useState(block.title);
  const [description, setDescription] = useState(block.description);

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
    }
  };

  // Render specific block type
  const renderBlockContent = () => {
    const props = { block: { ...block, title, description }, isSelected, handlers };
    
    switch (block.type) {
      case 'chef': return <ChefBlock {...props} />;
      case 'ingredients': return <IngredientsBlock {...props} />;
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
        className={cn(
          "absolute will-change-transform",
          !isDragging && "transition-all duration-200",
          isSelected ? "z-50" : "z-10 hover:z-40",
          isDimmed && "opacity-20 blur-[1px] grayscale pointer-events-none"
        )}
        onClick={(e) => {
          e.stopPropagation();
          selectBlock(block.id, e.ctrlKey || e.metaKey);
        }}
        onMouseEnter={() => setHoveredBlockId(block.id)}
        onMouseLeave={() => setHoveredBlockId(null)}
      >
        {renderBlockContent()}
      </div>
    </Draggable>
  );
});
