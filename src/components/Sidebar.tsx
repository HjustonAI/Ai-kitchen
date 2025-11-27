import React, { memo, useRef } from 'react';
import { ChefHat, Scroll, Utensils, StickyNote, Trash2, RotateCcw, Download, Upload, Image as ImageIcon, Layout, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { exportToJson, importFromJson, exportToPng } from '../lib/exportUtils';

const SidebarButton = memo(({ 
  icon: Icon, 
  label, 
  onClick, 
  colorClass, 
  delay 
}: { 
  icon: any, 
  label: string, 
  onClick: () => void, 
  colorClass: string,
  delay: number 
}) => (
  <motion.button
    initial={{ x: -20, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ delay, type: "spring", stiffness: 300, damping: 20 }}
    whileHover={{ scale: 1.02, x: 5 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left group relative overflow-hidden",
      "bg-white/5 border-white/5 hover:bg-white/10",
      colorClass
    )}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <Icon className="relative z-10 transition-transform group-hover:scale-110 duration-300" size={20} />
    <span className="relative z-10 font-medium tracking-wide text-sm">{label}</span>
  </motion.button>
));

export const Sidebar: React.FC = memo(() => {
  const addBlock = useStore((state) => state.addBlock);
  const addGroup = useStore((state) => state.addGroup);
  const clearBoard = useStore((state) => state.clearBoard);
  const updateView = useStore((state) => state.updateView);
  const layoutBoard = useStore((state) => state.layoutBoard);
  const blocks = useStore((state) => state.blocks);
  const connections = useStore((state) => state.connections);
  const loadState = useStore((state) => state.loadState);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJson = () => {
    exportToJson({ blocks, connections });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromJson(file);
      loadState(data);
    } catch (error) {
      console.error('Failed to import file:', error);
      alert('Failed to import file. Please check the format.');
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportPng = async () => {
    try {
      await exportToPng('board-container');
    } catch (error) {
      console.error('Failed to export PNG:', error);
      alert('Failed to export image.');
    }
  };

  return (
    <div className="w-72 glass-panel border-r-0 z-50 flex flex-col p-6 h-full relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />
      <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-kitchen-accent to-white tracking-wider">
          AI KITCHEN
        </h1>
        <p className="text-xs text-white/40 mt-1 font-mono">SYSTEM DESIGN BOARD</p>
      </motion.div>
      
      <div className="flex flex-col gap-3">
        <SidebarButton 
          icon={ChefHat} 
          label="Szef Kuchni" 
          onClick={() => addBlock('chef')}
          colorClass="text-kitchen-neon-cyan hover:border-kitchen-neon-cyan/50 hover:shadow-[0_0_15px_rgba(0,243,255,0.15)]"
          delay={0.1}
        />
        <SidebarButton 
          icon={Scroll} 
          label="Składniki" 
          onClick={() => addBlock('ingredients')}
          colorClass="text-gray-300 hover:border-white/30 hover:text-white"
          delay={0.2}
        />
        <SidebarButton 
          icon={Utensils} 
          label="Danie" 
          onClick={() => addBlock('dish')}
          colorClass="text-kitchen-neon-purple hover:border-kitchen-neon-purple/50 hover:shadow-[0_0_15px_rgba(188,19,254,0.15)]"
          delay={0.3}
        />
        <SidebarButton 
          icon={StickyNote} 
          label="Notatka" 
          onClick={() => addBlock('note')}
          colorClass="text-yellow-400 hover:border-yellow-400/50 hover:shadow-[0_0_15px_rgba(250,204,21,0.15)]"
          delay={0.4}
        />
        <div className="h-px bg-white/10 my-1" />
        <SidebarButton 
          icon={Layout} 
          label="Nowa Strefa" 
          onClick={() => addGroup()}
          colorClass="text-blue-400 hover:border-blue-400/50 hover:shadow-[0_0_15px_rgba(96,165,250,0.15)]"
          delay={0.5}
        />
      </div>

      <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2 mb-2">
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportJson}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all text-xs font-medium"
            title="Eksportuj JSON"
          >
            <Download size={16} />
            <span>Zapisz</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleImportClick}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all text-xs font-medium"
            title="Importuj JSON"
          >
            <Upload size={16} />
            <span>Wczytaj</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportPng}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all text-xs font-medium"
            title="Eksportuj PNG"
          >
            <ImageIcon size={16} />
            <span>PNG</span>
          </motion.button>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
          whileTap={{ scale: 0.98 }}
          onClick={layoutBoard}
          className="flex items-center justify-center gap-2 p-3 w-full rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all text-sm font-medium"
        >
          <Wand2 size={16} />
          <span>Uporządkuj</span>
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => updateView({ x: 0, y: 0, scale: 1 })}
          className="flex items-center justify-center gap-2 p-3 w-full rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all text-sm font-medium"
        >
          <RotateCcw size={16} />
          <span>Resetuj widok</span>
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.02, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
          whileTap={{ scale: 0.98 }}
          onClick={clearBoard}
          className="flex items-center justify-center gap-2 p-3 w-full rounded-lg border border-red-500/20 text-red-400/80 hover:text-red-400 hover:border-red-500/40 transition-all text-sm font-medium"
        >
          <Trash2 size={16} />
          <span>Wyczyść blat</span>
        </motion.button>
      </div>
    </div>
  );
});
