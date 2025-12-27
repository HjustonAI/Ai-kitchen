import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, Tag, Settings, FileText, Save, Database, Cpu, Thermometer, Hash } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { ConnectionType, BlockData } from '../types';
// TextareaAutosize - reserved for future use
// import TextareaAutosize from 'react-textarea-autosize';

const ConnectionProperties = () => {
  const selectedConnectionId = useStore((state) => state.selectedConnectionId);
  const connections = useStore((state) => state.connections);
  const updateConnection = useStore((state) => state.updateConnection);
  const selectConnection = useStore((state) => state.selectConnection);

  const connection = connections.find(c => c.id === selectedConnectionId);
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (connection) {
      setLabel(connection.label || '');
    }
  }, [connection?.id, connection?.label]);

  if (!connection) return null;

  return (
    <>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
        <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
          <Settings size={14} />
          Connection
        </h3>
        <button
          onClick={() => selectConnection(null)}
          className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-white/40 font-medium uppercase tracking-wider">
            <Type size={12} />
            Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['default', 'flow', 'sync'] as ConnectionType[]).map((type) => (
              <button
                key={type}
                onClick={() => updateConnection(connection.id, { type })}
                className={`
                  px-2 py-2 rounded-lg text-xs font-medium transition-all border
                  ${connection.type === type 
                    ? 'bg-kitchen-accent/20 border-kitchen-accent text-kitchen-accent shadow-[0_0_10px_rgba(0,243,255,0.2)]' 
                    : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white/80'}
                `}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-white/40 font-medium uppercase tracking-wider">
            <Tag size={12} />
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => label !== connection.label && updateConnection(connection.id, { label })}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="Add a label..."
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-kitchen-accent/50 transition-colors"
          />
        </div>
      </div>
    </>
  );
};

const BlockProperties = () => {
  const selectedId = useStore((state) => state.selectedId);
  const blocks = useStore((state) => state.blocks);
  const updateBlock = useStore((state) => state.updateBlock);
  const selectBlock = useStore((state) => state.selectBlock);

  const block = blocks.find(b => b.id === selectedId);
  
  // Local state for form fields
  const [data, setData] = useState<BlockData>({});

  useEffect(() => {
    if (block) {
      setData(block.data || {});
    }
  }, [block?.id, block?.data]);

  const handleUpdate = (updates: Partial<BlockData>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    if (block) {
      updateBlock(block.id, { data: newData });
    }
  };

  if (!block) return null;

  const renderChefProperties = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-white/40 font-medium uppercase tracking-wider">
          <Cpu size={12} />
          Model
        </label>
        <select
          value={data.model || 'gpt-4-turbo'}
          onChange={(e) => handleUpdate({ model: e.target.value })}
          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-kitchen-accent/50 transition-colors appearance-none"
        >
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="claude-3-opus">Claude 3 Opus</option>
          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-white/40 font-medium uppercase tracking-wider">
          <Thermometer size={12} />
          Temperature: {data.temperature ?? 0.7}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={data.temperature ?? 0.7}
          onChange={(e) => handleUpdate({ temperature: parseFloat(e.target.value) })}
          className="w-full accent-kitchen-accent"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-white/40 font-medium uppercase tracking-wider">
          <Hash size={12} />
          Max Tokens
        </label>
        <input
          type="number"
          value={data.maxTokens ?? 4096}
          onChange={(e) => handleUpdate({ maxTokens: parseInt(e.target.value) })}
          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-kitchen-accent/50 transition-colors"
        />
      </div>
    </div>
  );

  const renderFileProperties = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-white/40 font-medium uppercase tracking-wider">
          <FileText size={12} />
          File Path
        </label>
        <input
          type="text"
          value={data.filePath || ''}
          onChange={(e) => handleUpdate({ filePath: e.target.value })}
          placeholder="/path/to/file.txt"
          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-kitchen-accent/50 transition-colors"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isExternal"
          checked={data.isExternal || false}
          onChange={(e) => handleUpdate({ isExternal: e.target.checked })}
          className="rounded border-white/10 bg-black/20 text-kitchen-accent focus:ring-kitchen-accent/50"
        />
        <label htmlFor="isExternal" className="text-sm text-white/80">External Reference</label>
      </div>
    </div>
  );

  const renderDishProperties = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-white/40 font-medium uppercase tracking-wider">
          <Database size={12} />
          Output Format
        </label>
        <select
          value={data.outputFormat || 'markdown'}
          onChange={(e) => handleUpdate({ outputFormat: e.target.value as any })}
          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-kitchen-accent/50 transition-colors appearance-none"
        >
          <option value="markdown">Markdown (.md)</option>
          <option value="json">JSON (.json)</option>
          <option value="text">Plain Text (.txt)</option>
          <option value="file">Binary File</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-white/40 font-medium uppercase tracking-wider">
          <Save size={12} />
          Save Path
        </label>
        <input
          type="text"
          value={data.savePath || ''}
          onChange={(e) => handleUpdate({ savePath: e.target.value })}
          placeholder="./output/result.md"
          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-kitchen-accent/50 transition-colors"
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
        <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
          <Settings size={14} />
          {block.type} Properties
        </h3>
        <button
          onClick={() => selectBlock(null)}
          className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {block.type === 'chef' && renderChefProperties()}
      {(block.type === 'context_file' || block.type === 'input_file' || block.type === 'ingredients') && renderFileProperties()}
      {block.type === 'dish' && renderDishProperties()}
      
      {/* Common Description Field for all blocks if needed, or specific ones */}
      {block.type === 'note' && (
         <div className="text-white/40 text-sm italic">Notes are edited directly on the canvas.</div>
      )}
    </>
  );
};

export const PropertiesPanel: React.FC = () => {
  const selectedConnectionId = useStore((state) => state.selectedConnectionId);
  const selectedId = useStore((state) => state.selectedId);

  // Show if either a connection or a block is selected
  const isVisible = !!selectedConnectionId || !!selectedId;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="absolute top-4 right-4 w-72 glass-panel rounded-xl p-4 z-50 border border-white/10 shadow-2xl max-h-[80vh] overflow-y-auto"
        >
          {selectedConnectionId ? <ConnectionProperties /> : <BlockProperties />}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

