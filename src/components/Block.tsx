import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import { ChefHat, Scroll, Utensils, StickyNote, X } from 'lucide-react';
import type { Block as BlockType } from '../types';
import { cn } from '../lib/utils';

interface BlockProps {
  block: BlockType;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<BlockType>) => void;
  onDelete: (id: string) => void;
}

const icons = {
  chef: ChefHat,
  ingredients: Scroll,
  dish: Utensils,
  note: StickyNote,
};

const colors = {
  chef: 'border-kitchen-neon-cyan shadow-[0_0_15px_rgba(0,243,255,0.3)]',
  ingredients: 'border-gray-400 bg-gray-800/80',
  dish: 'border-kitchen-neon-purple shadow-[0_0_15px_rgba(188,19,254,0.3)]',
  note: 'border-yellow-200 bg-yellow-100/10 text-yellow-100',
};

export const Block: React.FC<BlockProps> = ({ block, isSelected, onSelect, onUpdate, onDelete }) => {
  const nodeRef = useRef(null);
  const Icon = icons[block.type];

  const handleStop = (_e: any, data: { x: number; y: number }) => {
    onUpdate(block.id, { x: data.x, y: data.y });
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: block.x, y: block.y }}
      onStop={handleStop}
      onStart={() => onSelect(block.id)}
    >
      <div
        ref={nodeRef}
        className={cn(
          "absolute w-64 p-4 rounded-xl border-2 backdrop-blur-md cursor-move transition-all duration-200",
          "flex flex-col gap-2 group",
          block.type === 'note' ? 'bg-yellow-900/40 border-yellow-400/50' : 'bg-kitchen-panel/90',
          colors[block.type],
          isSelected && "ring-2 ring-white/50 scale-105 z-50",
          !isSelected && "hover:scale-102 hover:z-40"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id);
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 text-kitchen-accent">
            <Icon size={20} />
            <span className="text-xs uppercase tracking-wider font-bold opacity-70">{block.type}</span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(block.id);
            }}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>

        <input
          className="bg-transparent text-lg font-bold outline-none placeholder-white/20 w-full"
          value={block.title}
          onChange={(e) => onUpdate(block.id, { title: e.target.value })}
          placeholder="Title..."
        />
        
        <textarea
          className="bg-transparent text-sm opacity-80 outline-none resize-none w-full placeholder-white/20"
          value={block.description}
          onChange={(e) => onUpdate(block.id, { description: e.target.value })}
          placeholder="Description..."
          rows={3}
        />
      </div>
    </Draggable>
  );
};
