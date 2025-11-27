import React from 'react';
import { ChefHat, Scroll, Utensils, StickyNote, Trash2 } from 'lucide-react';
import type { BlockType } from '../types';

interface SidebarProps {
  onAddBlock: (type: BlockType) => void;
  onClear: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onAddBlock, onClear }) => {
  return (
    <div className="w-64 bg-kitchen-panel border-r border-white/10 p-4 flex flex-col gap-4 z-50 shadow-xl h-full">
      <h1 className="text-xl font-bold text-kitchen-accent mb-4 tracking-wider">AI KITCHEN</h1>
      
      <div className="flex flex-col gap-3">
        <button 
          onClick={() => onAddBlock('chef')}
          className="flex items-center gap-3 p-3 rounded-lg bg-kitchen-bg border border-kitchen-neon-cyan/30 hover:border-kitchen-neon-cyan hover:bg-kitchen-neon-cyan/10 transition-all text-left group"
        >
          <ChefHat className="text-kitchen-neon-cyan group-hover:scale-110 transition-transform" />
          <span className="font-medium">Szef Kuchni</span>
        </button>

        <button 
          onClick={() => onAddBlock('ingredients')}
          className="flex items-center gap-3 p-3 rounded-lg bg-kitchen-bg border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all text-left group"
        >
          <Scroll className="text-gray-400 group-hover:text-white transition-colors" />
          <span className="font-medium">Składniki</span>
        </button>

        <button 
          onClick={() => onAddBlock('dish')}
          className="flex items-center gap-3 p-3 rounded-lg bg-kitchen-bg border border-kitchen-neon-purple/30 hover:border-kitchen-neon-purple hover:bg-kitchen-neon-purple/10 transition-all text-left group"
        >
          <Utensils className="text-kitchen-neon-purple group-hover:scale-110 transition-transform" />
          <span className="font-medium">Danie</span>
        </button>

        <button 
          onClick={() => onAddBlock('note')}
          className="flex items-center gap-3 p-3 rounded-lg bg-kitchen-bg border border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-500/10 transition-all text-left group"
        >
          <StickyNote className="text-yellow-500 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Notatka</span>
        </button>
      </div>

      <div className="mt-auto">
        <button 
          onClick={onClear}
          className="flex items-center gap-3 p-3 w-full rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
        >
          <Trash2 size={20} />
          <span>Wyczyść blat</span>
        </button>
      </div>
    </div>
  );
};
