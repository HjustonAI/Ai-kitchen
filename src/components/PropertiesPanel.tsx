import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, Tag } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { ConnectionType } from '../types';

export const PropertiesPanel: React.FC = () => {
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

  const handleLabelBlur = () => {
    if (connection && label !== connection.label) {
      updateConnection(connection.id, { label });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  if (!selectedConnectionId || !connection) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        className="absolute top-4 right-4 w-72 glass-panel rounded-xl p-4 z-50 border border-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">
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
              onBlur={handleLabelBlur}
              onKeyDown={handleKeyDown}
              placeholder="Add a label..."
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-kitchen-accent/50 transition-colors"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
