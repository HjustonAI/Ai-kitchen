import React, { memo } from 'react';
import { useStore } from '../store/useStore';
import type { Block, Connection, BlockType } from '../types';

import { cn } from '../lib/utils';

interface ConnectionsLayerProps {}

const getBlockDimensions = (type: BlockType) => {
  switch (type) {
    case 'chef': return { width: 320, height: 180 }; // w-80
    case 'ingredients': return { width: 256, height: 160 }; // w-64
    case 'dish': return { width: 288, height: 180 }; // w-72
    case 'note': return { width: 256, height: 256 }; // w-64 aspect-square
    default: return { width: 288, height: 120 };
  }
};

const getBlockCenter = (block: Block, draggingBlockId: string | null, draggingPos: { x: number; y: number } | null) => {
  const dims = getBlockDimensions(block.type);
  
  if (block.id === draggingBlockId && draggingPos) {
    return {
      x: draggingPos.x + dims.width / 2,
      y: draggingPos.y + dims.height / 2,
    };
  }
  return {
    x: block.x + dims.width / 2,
    y: block.y + dims.height / 2,
  };
};

const ConnectionLine = memo(({ conn, fromBlock, toBlock, isSelected, isDimmed, draggingBlockId, draggingPos }: { 
  conn: Connection, 
  fromBlock: Block, 
  toBlock: Block, 
  isSelected: boolean,
  isDimmed: boolean,
  draggingBlockId: string | null,
  draggingPos: { x: number; y: number } | null
}) => {
  const selectConnection = useStore((state) => state.selectConnection);
  
  const start = getBlockCenter(fromBlock, draggingBlockId, draggingPos);
  const end = getBlockCenter(toBlock, draggingBlockId, draggingPos);

  const isFlow = conn.type === 'flow';
  const isSync = conn.type === 'sync';
  
  let color = '#4b5563';
  if (isSelected) color = '#ffffff';
  else if (isFlow) color = '#00f3ff';
  else if (isSync) color = '#a855f7';

  const width = isSelected ? 3 : (isFlow || isSync ? 2 : 1.5);
  const markerId = isSelected ? 'arrowhead-selected' : (isFlow ? 'arrowhead-flow' : 'arrowhead');

  // Calculate control points for Bezier curve
  const dist = Math.abs(end.x - start.x);
  const controlOffset = Math.min(dist * 0.5, 150);
  
  const pathD = `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`;

  return (
    <g className={cn("pointer-events-auto cursor-pointer transition-opacity duration-200", isDimmed && "opacity-20")} onClick={(e) => {
      e.stopPropagation();
      selectConnection(conn.id);
    }}>
      {/* Invisible wider path for easier clicking */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
      />
      
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={isSync ? "5,5" : "none"}
        markerEnd={`url(#${markerId})`}
      />
      
      {isFlow && (
        <circle r="3" fill={color}>
          <animateMotion
            dur="1.5s"
            repeatCount="indefinite"
            path={pathD}
          />
        </circle>
      )}

      {conn.label && (
        <foreignObject
          x={(start.x + end.x) / 2 - 50}
          y={(start.y + end.y) / 2 - 15}
          width="100"
          height="30"
          className="overflow-visible"
        >
          <div className="flex justify-center items-center">
            <span className="bg-kitchen-bg/80 backdrop-blur px-2 py-1 rounded text-xs text-white/70 border border-white/10">
              {conn.label}
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  );
});

export const ConnectionsLayer: React.FC<ConnectionsLayerProps> = () => {
  const blocks = useStore((state) => state.blocks);
  const connections = useStore((state) => state.connections);
  const connectingSourceId = useStore((state) => state.connectingSourceId);
  const tempConnectionPos = useStore((state) => state.tempConnectionPos);
  const selectedConnectionId = useStore((state) => state.selectedConnectionId);
  const highlightedConnectionIds = useStore((state) => state.highlightedConnectionIds);
  const draggingBlockId = useStore((state) => state.draggingBlockId);
  const draggingPos = useStore((state) => state.draggingPos);

  // Optimize block lookup
  const blockMap = React.useMemo(() => {
    return new Map(blocks.map(b => [b.id, b]));
  }, [blocks]);

  const tempConnection = connectingSourceId && tempConnectionPos ? {
    fromId: connectingSourceId,
    toX: tempConnectionPos.x,
    toY: tempConnectionPos.y
  } : null;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="28"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
        </marker>
        <marker
          id="arrowhead-selected"
          markerWidth="10"
          markerHeight="7"
          refX="28"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#ffffff" />
        </marker>
        <marker
          id="arrowhead-flow"
          markerWidth="10"
          markerHeight="7"
          refX="28"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#00f3ff" />
        </marker>
      </defs>

      {connections.map(conn => {
        const fromBlock = blockMap.get(conn.fromId);
        const toBlock = blockMap.get(conn.toId);
        if (!fromBlock || !toBlock) return null;

        const isDimmed = highlightedConnectionIds.length > 0 && !highlightedConnectionIds.includes(conn.id);

        return (
          <ConnectionLine 
            key={conn.id} 
            conn={conn} 
            fromBlock={fromBlock} 
            toBlock={toBlock} 
            isSelected={selectedConnectionId === conn.id}
            isDimmed={isDimmed}
            draggingBlockId={draggingBlockId}
            draggingPos={draggingPos}
          />
        );
      })}

      {tempConnection && (() => {
        const fromBlock = blockMap.get(tempConnection.fromId);
        if (!fromBlock) return null;
        const start = getBlockCenter(fromBlock, draggingBlockId, draggingPos);
        
        return (
          <path
            d={`M ${start.x} ${start.y} L ${tempConnection.toX} ${tempConnection.toY}`}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeDasharray="5,5"
            className="opacity-50"
          />
        );
      })()}
    </svg>
  );
};
