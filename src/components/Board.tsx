import React from 'react';
import { motion } from 'framer-motion';
import { useExecutionStore } from '../store/useExecutionStore';

interface BoardProps {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  view: { x: number; y: number; scale: number };
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onWheel: (e: React.WheelEvent) => void;
}

export const Board: React.FC<BoardProps> = ({
  children,
  onClick,
  view,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel
}) => {
  const simulationMode = useExecutionStore((s) => s.simulationMode);

  return (
    <div
      id="board-container"
      className={`flex-1 relative overflow-hidden perspective-1000 cursor-grab active:cursor-grabbing transition-colors duration-500 ${simulationMode ? 'bg-slate-950' : 'bg-kitchen-bg'
        }`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      onClick={(e) => onClick(e)}
    >
      {/* Animated Grid Background */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none transition-transform duration-75 ease-out"
        style={{
          backgroundImage: `
            linear-gradient(to right, #333 1px, transparent 1px),
            linear-gradient(to bottom, #333 1px, transparent 1px)
          `,
          backgroundSize: `${40 * view.scale}px ${40 * view.scale}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
      />

      {/* Subtle ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-kitchen-bg/0 via-kitchen-bg/0 to-kitchen-bg/80 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
