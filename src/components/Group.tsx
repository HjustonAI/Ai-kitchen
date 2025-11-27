import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import type { DraggableData, ResizableDelta, Position } from 'react-rnd';
import { X } from 'lucide-react';
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
  const isSelected = useStore((state) => state.selectedGroupId === group.id);
  
  const [isDragging, setIsDragging] = useState(false);

  return (
    <Rnd
      size={{ width: group.width, height: group.height }}
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
        updateGroup(group.id, {
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
          ...position,
        });
      }}
      bounds="parent"
      dragHandleClassName="group-drag-handle"
      enableResizing={isSelected}
      className={cn(
        "absolute rounded-3xl border-2 transition-colors group",
        isSelected 
          ? "border-white/20 bg-white/5 z-0" 
          : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] -z-10",
        isDragging && "cursor-grabbing"
      )}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        selectGroup(group.id);
      }}
    >
      {/* Header / Label */}
      <div className="absolute -top-10 left-0 flex items-center gap-2 group-drag-handle cursor-grab active:cursor-grabbing p-2">
        <input
          className="bg-transparent text-2xl font-bold text-white/20 focus:text-white/80 outline-none transition-colors uppercase tracking-widest font-mono"
          value={group.title}
          onChange={(e) => updateGroup(group.id, { title: e.target.value })}
          placeholder="GROUP NAME"
        />
        {isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteGroup(group.id);
            }}
            className="p-1 rounded-full hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </Rnd>
  );
};
