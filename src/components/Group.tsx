import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import type { DraggableData, ResizableDelta, Position } from 'react-rnd';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import type { Group as GroupType } from '../types';

interface GroupProps {
  group: GroupType;
  scale: number;
}

export const Group: React.FC<GroupProps> = ({ group, scale }) => {
  const updateGroup = useStore((state) => state.updateGroup);
  const deleteGroup = useStore((state) => state.deleteGroup);
  const selectGroup = useStore((state) => state.selectGroup);
  const toggleGroupCollapse = useStore((state) => state.toggleGroupCollapse);
  const isSelected = useStore((state) => state.selectedGroupId === group.id);
  
  const [isDragging, setIsDragging] = useState(false);
  const isCollapsed = group.collapsed;

  return (
    <Rnd
      size={isCollapsed ? { width: 300, height: 60 } : { width: group.width, height: group.height }}
      position={{ x: group.x, y: group.y }}
      scale={scale}
      onDragStart={() => {
        setIsDragging(true);
        selectGroup(group.id);
      }}
      onDragStop={(_e: any, d: DraggableData) => {
        setIsDragging(false);
        updateGroup(group.id, { x: d.x, y: d.y });
      }}
      onResizeStop={(_e: any, _direction: any, ref: HTMLElement, _delta: ResizableDelta, position: Position) => {
        if (!isCollapsed) {
          updateGroup(group.id, {
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
            ...position,
          });
        }
      }}
      bounds="parent"
      dragHandleClassName="group-drag-handle"
      enableResizing={isSelected && !isCollapsed}
      className={cn(
        "absolute rounded-3xl border-2 transition-all duration-200 group backdrop-blur-[2px]",
        isSelected 
          ? "border-kitchen-neon-cyan/30 bg-kitchen-neon-cyan/5 shadow-[0_0_40px_-10px_rgba(0,243,255,0.15)] z-0" 
          : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] -z-10",
        isDragging && "cursor-grabbing",
        isCollapsed && "bg-kitchen-surface border-kitchen-border z-10"
      )}
      onClick={() => {
        selectGroup(group.id);
      }}
      onDoubleClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        toggleGroupCollapse(group.id);
      }}
      tabIndex={0}
      aria-label={`Group: ${group.title}`}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          selectGroup(group.id);
        }
      }}
    >
      {/* Header / Label */}
      <div className={cn(
        "absolute flex items-center gap-2 group-drag-handle cursor-grab active:cursor-grabbing p-2 transition-all",
        isCollapsed ? "top-0 left-0 w-full h-full" : "-top-10 left-0"
      )}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleGroupCollapse(group.id);
          }}
          aria-label={isCollapsed ? "Expand group" : "Collapse group"}
          className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
        </button>

        <input
          className={cn(
            "bg-transparent font-bold outline-none transition-colors uppercase tracking-widest font-mono flex-1",
            isCollapsed ? "text-lg text-white" : "text-2xl",
            isSelected ? "text-kitchen-neon-cyan/90 placeholder-kitchen-neon-cyan/50" : "text-white/20 placeholder-white/20 focus:text-white/80"
          )}
          value={group.title}
          onChange={(e) => updateGroup(group.id, { title: e.target.value })}
          placeholder="GROUP NAME"
          aria-label="Group name"
        />
        {isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteGroup(group.id);
            }}
            aria-label="Delete group"
            className="p-1 rounded-full hover:bg-red-500/20 text-kitchen-neon-cyan/50 hover:text-red-400 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </Rnd>
  );
};
