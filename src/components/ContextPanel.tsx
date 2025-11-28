import { useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scroll, ChefHat, ExternalLink, Layers, BoxSelect, Utensils, StickyNote, FileText, Keyboard } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import type { Block } from '../types';

// --- Content Component (Heavy Logic) ---

const ContextPanelContent = memo(({ mode }: { mode: 'single' | 'multi' | 'group' }) => {
  const selectedBlockIds = useStore((state) => state.selectedBlockIds);
  const selectedGroupId = useStore((state) => state.selectedGroupId);
  const highlightedBlockIds = useStore((state) => state.highlightedBlockIds);
  const blocks = useStore((state) => state.blocks);
  const groups = useStore((state) => state.groups);
  const connections = useStore((state) => state.connections);
  const selectBlock = useStore((state) => state.selectBlock);
  const selectGroup = useStore((state) => state.selectGroup);
  const focusBlock = useStore((state) => state.focusBlock);

  // --- Data Preparation ---

  // Group Data
  const selectedGroup = mode === 'group' ? groups.find(g => g.id === selectedGroupId) : null;
  const groupBlocks = mode === 'group' 
    ? blocks.filter(b => highlightedBlockIds.includes(b.id))
    : [];

  // Multi Selection Data
  const multiSelectedBlocks = mode === 'multi' 
    ? blocks.filter(b => selectedBlockIds.includes(b.id))
    : [];

  // Single Selection Data
  const singleBlock = mode === 'single' 
    ? blocks.find(b => b.id === selectedBlockIds[0])
    : null;

  // Combined Contexts (for Group or Multi-Chef selection)
  const combinedContexts = useMemo(() => {
    const sourceBlocks = mode === 'group' ? groupBlocks : (mode === 'multi' ? multiSelectedBlocks : (singleBlock ? [singleBlock] : []));
    
    // Find all chefs in the selection
    const chefs = sourceBlocks.filter(b => b.type === 'chef');
    if (chefs.length === 0) return [];

    // Find all ingredients connected to these chefs
    const contextIds = new Set<string>();
    chefs.forEach(chef => {
      connections
        .filter(c => c.toId === chef.id)
        .forEach(c => contextIds.add(c.fromId));
    });

    return blocks.filter(b => contextIds.has(b.id) && (b.type === 'ingredients' || b.type === 'context_file' || b.type === 'input_file'));
  }, [mode, groupBlocks, multiSelectedBlocks, singleBlock, connections, blocks]);

  // --- Render Helpers ---

  const closePanel = () => {
    selectBlock(null);
    selectGroup(null);
  };

  const renderHeader = () => {
    let icon = <BoxSelect size={20} />;
    let title = 'Selection';
    let subtitle = '';
    let colorClass = "bg-white/10 text-white";

    if (mode === 'group' && selectedGroup) {
      icon = <Layers size={20} />;
      title = selectedGroup.title;
      subtitle = 'Group';
      colorClass = "bg-blue-500/10 text-blue-400";
    } else if (mode === 'multi') {
      icon = <BoxSelect size={20} />;
      title = `${multiSelectedBlocks.length} Items Selected`;
      subtitle = 'Multi-Select';
      colorClass = "bg-purple-500/10 text-purple-400";
    } else if (mode === 'single' && singleBlock) {
      if (singleBlock.type === 'chef') {
        icon = <ChefHat size={20} />;
        subtitle = 'AI Agent';
        colorClass = "bg-kitchen-neon-cyan/10 text-kitchen-neon-cyan";
      } else if (singleBlock.type === 'ingredients') {
        icon = <Scroll size={20} />;
        subtitle = 'Data Source';
        colorClass = "bg-orange-500/10 text-orange-400";
      } else if (singleBlock.type === 'context_file') {
        icon = <FileText size={20} />;
        subtitle = 'Context File';
        colorClass = "bg-blue-500/10 text-blue-400";
      } else if (singleBlock.type === 'input_file') {
        icon = <Keyboard size={20} />;
        subtitle = 'Input File';
        colorClass = "bg-green-500/10 text-green-400";
      } else if (singleBlock.type === 'dish') {
        icon = <Utensils size={20} />;
        subtitle = 'Output';
        colorClass = "bg-purple-500/10 text-purple-400";
      } else {
        icon = <StickyNote size={20} />;
        subtitle = 'Note';
        colorClass = "bg-yellow-500/10 text-yellow-400";
      }
      title = singleBlock.title;
    }

    return (
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={cn("p-2 rounded-lg", colorClass)}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">
              {subtitle}
            </div>
            <h2 className="font-bold text-white truncate text-lg leading-tight">{title}</h2>
          </div>
        </div>
        <button 
          onClick={closePanel} 
          className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    );
  };

  const renderContextList = (ingredients: Block[]) => {
    if (ingredients.length === 0) {
      return (
        <div className="text-sm text-white/20 italic text-center py-8 border border-dashed border-white/10 rounded-lg">
          No context files connected
        </div>
      );
    }
    return (
      <div className="grid gap-2">
        {ingredients.map(ing => (
          <div 
            key={ing.id}
            onClick={() => focusBlock(ing.id)}
            className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 cursor-pointer transition-all group"
          >
            {ing.type === 'ingredients' ? <Scroll size={16} className="text-orange-400/70" /> : 
             ing.type === 'context_file' ? <FileText size={16} className="text-blue-400/70" /> :
             ing.type === 'input_file' ? <Keyboard size={16} className="text-green-400/70" /> :
             <Scroll size={16} className="text-white/70" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white/90 truncate">{ing.title}</div>
              <div className="text-xs text-white/40 truncate">{ing.description ? ing.description.slice(0, 50) + '...' : 'No content'}</div>
            </div>
            <ExternalLink size={14} className="text-white/20 group-hover:text-white/60" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute top-4 right-4 bottom-4 w-96 glass-panel rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden z-40 bg-kitchen-bg/90 backdrop-blur-xl"
    >
      {renderHeader()}

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Group / Multi View */}
        {(mode === 'group' || mode === 'multi') && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Selected Items</h3>
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60">
                  {mode === 'group' ? groupBlocks.length : multiSelectedBlocks.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(mode === 'group' ? groupBlocks : multiSelectedBlocks).map(b => (
                  <div key={b.id} className="px-2 py-1 rounded bg-white/5 border border-white/5 text-xs text-white/70 flex items-center gap-1">
                    {b.type === 'chef' && <ChefHat size={10} />}
                    {b.type === 'ingredients' && <Scroll size={10} />}
                    {b.type === 'context_file' && <FileText size={10} />}
                    {b.type === 'input_file' && <Keyboard size={10} />}
                    {b.type === 'dish' && <Utensils size={10} />}
                    {b.type === 'note' && <StickyNote size={10} />}
                    <span className="truncate max-w-[100px]">{b.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {combinedContexts.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Combined Contexts</h3>
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60">{combinedContexts.length}</span>
                </div>
                {renderContextList(combinedContexts)}
              </div>
            )}
          </>
        )}

        {/* Single View - Chef */}
        {mode === 'single' && singleBlock?.type === 'chef' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Connected Contexts</h3>
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60">{combinedContexts.length}</span>
            </div>
            {renderContextList(combinedContexts)}
            
            <div className="space-y-2 pt-4 border-t border-white/10">
             <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">System Prompt</h3>
             <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm text-kitchen-neon-cyan/80 whitespace-pre-wrap border border-kitchen-neon-cyan/10 shadow-inner">
               {singleBlock.description || <span className="text-white/20 italic">No system prompt...</span>}
             </div>
           </div>
          </div>
        )}

        {/* Single View - Ingredient / Context / Input */}
        {mode === 'single' && (singleBlock?.type === 'ingredients' || singleBlock?.type === 'context_file' || singleBlock?.type === 'input_file') && (
           <div className="space-y-2 h-full flex flex-col min-h-[200px]">
             <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Content Preview</h3>
             <div className="flex-1 bg-black/30 rounded-lg p-4 font-mono text-sm text-white/80 whitespace-pre-wrap overflow-y-auto border border-white/5 shadow-inner">
               {singleBlock.description || <span className="text-white/20 italic">Empty content...</span>}
             </div>
           </div>
        )}

        {/* Single View - Other */}
        {mode === 'single' && (singleBlock?.type === 'dish' || singleBlock?.type === 'note') && (
           <div className="space-y-2">
             <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Description</h3>
             <div className="bg-white/5 rounded-lg p-4 text-sm text-white/80 whitespace-pre-wrap border border-white/5">
               {singleBlock.description || <span className="text-white/20 italic">No description...</span>}
             </div>
           </div>
        )}

      </div>
    </motion.div>
  );
});

// --- Container Component (Lightweight) ---

export const ContextPanel = () => {
  const selectedBlockIds = useStore((state) => state.selectedBlockIds);
  const selectedGroupId = useStore((state) => state.selectedGroupId);

  // Determine what to show
  const mode = useMemo(() => {
    if (selectedGroupId) return 'group';
    if (selectedBlockIds.length > 1) return 'multi';
    if (selectedBlockIds.length === 1) return 'single';
    return 'none';
  }, [selectedGroupId, selectedBlockIds.length]);

  return (
    <AnimatePresence>
      {mode !== 'none' && <ContextPanelContent mode={mode} />}
    </AnimatePresence>
  );
};
