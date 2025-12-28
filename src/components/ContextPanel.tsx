import { useMemo, memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scroll, ChefHat, ExternalLink, Layers, BoxSelect, Utensils, StickyNote, FileText, Keyboard, Settings, Cpu, Thermometer, Hash, ChevronDown, ChevronRight, FileOutput, Plus, Trash2, FolderOpen } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import type { Block, BlockData, OutputFile, OutputFileFormat } from '../types';

// --- Helper Components ---

const CollapsibleSection = ({ title, count, icon, children, defaultOpen = true }: { title: string, count?: number, icon?: React.ReactNode, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="space-y-2 pt-4 border-t border-white/10 first:pt-0 first:border-t-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between group py-1"
      >
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider group-hover:text-white/60 transition-colors flex items-center gap-2">
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {icon}
          {title}
        </h3>
        {count !== undefined && (
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60">
            {count}
          </span>
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-1 pb-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Content Component (Heavy Logic) ---

const ContextPanelContent = memo(({ mode }: { mode: 'single' | 'multi' | 'group' }) => {
  // Consolidated store subscriptions - single subscription instead of 10
  const { selectedBlockIds, selectedGroupId, highlightedBlockIds, blocks, groups, connections } = useStore(
    useShallow((s) => ({
      selectedBlockIds: s.selectedBlockIds,
      selectedGroupId: s.selectedGroupId,
      highlightedBlockIds: s.highlightedBlockIds,
      blocks: s.blocks,
      groups: s.groups,
      connections: s.connections,
    }))
  );
  
  // Actions accessed via getState() - no subscription needed
  const { selectBlock, selectGroup, focusBlock, updateBlock } = useStore.getState();

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

  // Local state for editing properties (to avoid flooding undo history)
  const [blockData, setBlockData] = useState<BlockData>({});

  useEffect(() => {
    if (singleBlock) {
      setBlockData(singleBlock.data || {});
    }
  }, [singleBlock?.id, singleBlock?.data]);

  const handleDataUpdate = (updates: Partial<BlockData>) => {
    setBlockData(prev => ({ ...prev, ...updates }));
  };

  const commitDataUpdate = () => {
    if (singleBlock) {
      updateBlock(singleBlock.id, { data: blockData });
    }
  };

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
        <div className="text-sm text-white/20 italic text-center py-4 border border-dashed border-white/10 rounded-lg">
          No context files connected
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {ingredients.map(ing => (
          <div 
            key={ing.id}
            onClick={() => focusBlock(ing.id)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 cursor-pointer transition-all group max-w-full"
            title={ing.description || ing.title}
          >
            {ing.type === 'ingredients' ? <Scroll size={14} className="text-orange-400/70 shrink-0" /> : 
             ing.type === 'context_file' ? <FileText size={14} className="text-blue-400/70 shrink-0" /> :
             ing.type === 'input_file' ? <Keyboard size={14} className="text-green-400/70 shrink-0" /> :
             <Scroll size={14} className="text-white/70 shrink-0" />}
            <span className="text-xs font-medium text-white/80 truncate max-w-[180px]">{ing.title}</span>
            <ExternalLink size={10} className="text-white/0 group-hover:text-white/40 transition-colors shrink-0" />
          </div>
        ))}
      </div>
    );
  };

  const renderProperties = () => {
    if (!singleBlock) return null;

    return (
      <CollapsibleSection title="Properties" icon={<Settings size={12} />} defaultOpen={true}>
        {singleBlock.type === 'chef' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-white/60 font-medium">
                <Cpu size={12} /> Model
              </label>
              <select
                value={blockData.model || 'gpt-4-turbo'}
                onChange={(e) => {
                  handleDataUpdate({ model: e.target.value });
                  updateBlock(singleBlock.id, { data: { ...blockData, model: e.target.value } });
                }}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-kitchen-accent/50 transition-colors appearance-none"
              >
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-white/60 font-medium">
                <Thermometer size={12} /> Temperature: {blockData.temperature ?? 0.7}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={blockData.temperature ?? 0.7}
                onChange={(e) => handleDataUpdate({ temperature: parseFloat(e.target.value) })}
                onMouseUp={commitDataUpdate}
                className="w-full accent-kitchen-accent"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-white/60 font-medium">
                <Hash size={12} /> Max Tokens
              </label>
              <input
                type="number"
                value={blockData.maxTokens ?? 4096}
                onChange={(e) => handleDataUpdate({ maxTokens: parseInt(e.target.value) })}
                onBlur={commitDataUpdate}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-kitchen-accent/50 transition-colors"
              />
            </div>

            {/* Output Files Management */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-white/60 font-medium">
                  <FileOutput size={12} /> Output Files
                </label>
                <button
                  onClick={() => {
                    const newOutput: OutputFile = {
                      id: crypto.randomUUID(),
                      filename: 'new_file.md',
                      format: 'markdown',
                      description: ''
                    };
                    const outputs = [...(blockData.outputs || []), newOutput];
                    handleDataUpdate({ outputs });
                    updateBlock(singleBlock.id, { data: { ...blockData, outputs } });
                  }}
                  className="flex items-center gap-1 text-[10px] text-kitchen-accent hover:text-white transition-colors px-2 py-1 rounded bg-kitchen-accent/10 hover:bg-kitchen-accent/20"
                >
                  <Plus size={10} />
                  Add File
                </button>
              </div>
              
              {(!blockData.outputs || blockData.outputs.length === 0) ? (
                <div className="text-[11px] text-white/30 italic text-center py-3 border border-dashed border-white/10 rounded-lg">
                  No output files defined
                </div>
              ) : (
                <div className="space-y-2">
                  {blockData.outputs.map((output, index) => (
                    <div key={output.id} className="bg-black/20 border border-white/10 rounded-lg p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={output.filename}
                          onChange={(e) => {
                            const outputs = [...(blockData.outputs || [])];
                            outputs[index] = { ...outputs[index], filename: e.target.value };
                            handleDataUpdate({ outputs });
                          }}
                          onBlur={() => {
                            updateBlock(singleBlock.id, { data: blockData });
                          }}
                          placeholder="filename.md"
                          className="flex-1 bg-black/30 border border-white/5 rounded px-2 py-1 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50"
                        />
                        <select
                          value={output.format}
                          onChange={(e) => {
                            const outputs = [...(blockData.outputs || [])];
                            outputs[index] = { ...outputs[index], format: e.target.value as OutputFileFormat };
                            handleDataUpdate({ outputs });
                            updateBlock(singleBlock.id, { data: { ...blockData, outputs } });
                          }}
                          className="bg-black/30 border border-white/5 rounded px-2 py-1 text-[10px] text-white/70 focus:outline-none appearance-none"
                        >
                          <option value="markdown">MD</option>
                          <option value="json">JSON</option>
                          <option value="text">TXT</option>
                          <option value="yaml">YAML</option>
                          <option value="csv">CSV</option>
                          <option value="other">Other</option>
                        </select>
                        <button
                          onClick={() => {
                            const outputs = blockData.outputs?.filter((_, i) => i !== index) || [];
                            handleDataUpdate({ outputs });
                            updateBlock(singleBlock.id, { data: { ...blockData, outputs } });
                          }}
                          className="p-1 text-white/30 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={output.description || ''}
                        onChange={(e) => {
                          const outputs = [...(blockData.outputs || [])];
                          outputs[index] = { ...outputs[index], description: e.target.value };
                          handleDataUpdate({ outputs });
                        }}
                        onBlur={() => {
                          updateBlock(singleBlock.id, { data: blockData });
                        }}
                        placeholder="Description (optional)"
                        className="w-full bg-black/20 border border-white/5 rounded px-2 py-1 text-[10px] text-white/60 placeholder-white/15 focus:outline-none focus:border-purple-500/30"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {(singleBlock.type === 'context_file' || singleBlock.type === 'input_file' || singleBlock.type === 'ingredients') && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-white/60 font-medium">
                <FileText size={12} /> File Path
              </label>
              <input
                type="text"
                value={blockData.filePath || ''}
                onChange={(e) => handleDataUpdate({ filePath: e.target.value })}
                onBlur={commitDataUpdate}
                placeholder="/path/to/file.txt"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-kitchen-accent/50 transition-colors"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isExternal"
                checked={blockData.isExternal || false}
                onChange={(e) => {
                  handleDataUpdate({ isExternal: e.target.checked });
                  updateBlock(singleBlock.id, { data: { ...blockData, isExternal: e.target.checked } });
                }}
                className="rounded border-white/10 bg-black/20 text-kitchen-accent focus:ring-kitchen-accent/50"
              />
              <label htmlFor="isExternal" className="text-sm text-white/80">External Reference</label>
            </div>
          </div>
        )}

        {singleBlock.type === 'dish' && (
          <div className="space-y-4">
            {/* Output Folder Path */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-white/60 font-medium">
                <FolderOpen size={12} /> Output Folder
              </label>
              <input
                type="text"
                value={blockData.outputFolder || ''}
                onChange={(e) => handleDataUpdate({ outputFolder: e.target.value })}
                onBlur={commitDataUpdate}
                placeholder="campaigns/[DATE]_[NAME]/"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-kitchen-accent/50 transition-colors font-mono"
              />
              <p className="text-[10px] text-white/30">Use [DATE], [NAME], [YYYY-MM] as placeholders</p>
            </div>

            {/* Aggregated Outputs from Connected Agents */}
            {(() => {
              const connectedAgents = connections
                .filter(c => c.toId === singleBlock.id)
                .map(c => blocks.find(b => b.id === c.fromId))
                .filter((b): b is Block => !!b && b.type === 'chef');
              
              const aggregatedOutputs: Array<{ agentTitle: string; filename: string; format: string; description?: string }> = [];
              connectedAgents.forEach(agent => {
                if (agent.data?.outputs) {
                  agent.data.outputs.forEach(output => {
                    aggregatedOutputs.push({
                      agentTitle: agent.title,
                      filename: output.filename,
                      format: output.format,
                      description: output.description
                    });
                  });
                }
              });

              return (
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-white/60 font-medium">
                      <FileOutput size={12} /> Collected Outputs
                    </label>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                      {aggregatedOutputs.length} files
                    </span>
                  </div>
                  
                  {connectedAgents.length === 0 ? (
                    <div className="text-[11px] text-white/30 italic text-center py-3 border border-dashed border-white/10 rounded-lg">
                      Connect AI Agents to collect their outputs
                    </div>
                  ) : aggregatedOutputs.length === 0 ? (
                    <div className="text-[11px] text-white/30 italic text-center py-3 border border-dashed border-white/10 rounded-lg">
                      Connected agents have no outputs defined
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {aggregatedOutputs.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-black/20 border border-white/5 text-[11px]"
                          title={item.description || `From ${item.agentTitle}`}
                        >
                          <FileOutput size={11} className="text-purple-400 shrink-0" />
                          <span className="font-mono text-white/80 truncate flex-1">{item.filename}</span>
                          <span className="text-[9px] text-purple-400/60 uppercase shrink-0">{item.format}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {connectedAgents.length > 0 && (
                    <div className="pt-2">
                      <div className="text-[10px] text-white/40 mb-1">Sources:</div>
                      <div className="flex flex-wrap gap-1">
                        {connectedAgents.map(agent => (
                          <span key={agent.id} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300/70 border border-cyan-500/20">
                            {agent.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </CollapsibleSection>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        
        {/* Group / Multi View */}
        {(mode === 'group' || mode === 'multi') && (
          <>
            <CollapsibleSection title="Selected Items" count={mode === 'group' ? groupBlocks.length : multiSelectedBlocks.length}>
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
            </CollapsibleSection>

            {combinedContexts.length > 0 && (
              <CollapsibleSection title="Combined Contexts" count={combinedContexts.length}>
                {renderContextList(combinedContexts)}
              </CollapsibleSection>
            )}
          </>
        )}

        {/* Single View - Chef */}
        {mode === 'single' && singleBlock?.type === 'chef' && (
          <>
            <CollapsibleSection title="Connected Contexts" count={combinedContexts.length}>
              {renderContextList(combinedContexts)}
            </CollapsibleSection>
            
            <CollapsibleSection title="System Prompt">
             <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm text-kitchen-neon-cyan/80 whitespace-pre-wrap border border-kitchen-neon-cyan/10 shadow-inner">
               {singleBlock.description || <span className="text-white/20 italic">No system prompt...</span>}
             </div>
           </CollapsibleSection>
          </>
        )}

        {/* Single View - Ingredient / Context / Input */}
        {mode === 'single' && (singleBlock?.type === 'ingredients' || singleBlock?.type === 'context_file' || singleBlock?.type === 'input_file') && (
           <CollapsibleSection title="Content Preview" defaultOpen={true}>
             <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-white/80 whitespace-pre-wrap overflow-y-auto border border-white/5 shadow-inner max-h-[400px]">
               {singleBlock.description || <span className="text-white/20 italic">Empty content...</span>}
             </div>
           </CollapsibleSection>
        )}

        {/* Single View - Other */}
        {mode === 'single' && (singleBlock?.type === 'dish' || singleBlock?.type === 'note') && (
           <CollapsibleSection title="Description">
             <div className="bg-white/5 rounded-lg p-4 text-sm text-white/80 whitespace-pre-wrap border border-white/5">
               {singleBlock.description || <span className="text-white/20 italic">No description...</span>}
             </div>
           </CollapsibleSection>
        )}

        {/* Properties Section (Merged from PropertiesPanel) */}
        {mode === 'single' && renderProperties()}

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
