import React, { memo } from 'react';
import { useStore } from '../store/useStore';
import type { Block, Connection, BlockType } from '../types';

import { cn } from '../lib/utils';

interface ConnectionsLayerProps {}

const getBlockDimensions = (type: BlockType, scale: number) => {
  // Map LOD sizes to approximate pixel dimensions so connection anchors remain centered.
  if (scale < 0.3) {
    // Minimal: small tile
    return { width: 56, height: 32 };
  }
  if (scale < 0.6) {
    // Compact: unified compact width
    if (type === 'note') return { width: 176, height: 176 };
    return { width: 176, height: 48 };
  }

  switch (type) {
    case 'chef': return { width: 320, height: 180 }; // w-80
    case 'ingredients': return { width: 256, height: 160 }; // w-64
    case 'dish': return { width: 288, height: 180 }; // w-72
    case 'note': return { width: 256, height: 256 }; // w-64 aspect-square
    default: return { width: 288, height: 120 };
  }
};

const getBlockCenter = (block: Block, draggingBlockId: string | null, draggingPos: { x: number; y: number } | null, scale: number) => {
  let width, height;

  // Use measured dimensions if available, otherwise fallback to estimated dimensions
  if (block.width && block.height) {
    width = block.width;
    height = block.height;
  } else {
    const dims = getBlockDimensions(block.type, scale);
    width = dims.width;
    height = dims.height;
  }
  
  let x = block.x;
  let y = block.y;

  if (block.id === draggingBlockId && draggingPos) {
    x = draggingPos.x;
    y = draggingPos.y;
  }
  
  return {
    x: x + width / 2,
    y: y + height / 2,
  };
};

const ConnectionLine = memo(({ conn, fromBlock, toBlock, isSelected, isDimmed, isHighlighted, draggingBlockId, draggingPos, scale, ghostOpacity }: { 
  conn: Connection, 
  fromBlock: Block, 
  toBlock: Block, 
  isSelected: boolean,
  isDimmed: boolean,
  isHighlighted: boolean,
  draggingBlockId: string | null,
  draggingPos: { x: number; y: number } | null,
  scale: number,
  ghostOpacity?: number
}) => {
  const selectConnection = useStore((state) => state.selectConnection);
  
  const start = getBlockCenter(fromBlock, draggingBlockId, draggingPos, scale);
  const end = getBlockCenter(toBlock, draggingBlockId, draggingPos, scale);

  const isFlow = conn.type === 'flow';
  const isSync = conn.type === 'sync';
  
  let color = '#4b5563';
  if (isSelected) color = '#ffffff';
  else if (isFlow) color = '#00f3ff';
  else if (isSync) color = '#a855f7';
  else if (isHighlighted) color = '#60a5fa';

  const width = isSelected ? 3 : (isHighlighted ? 2.5 : (isFlow || isSync ? 2 : 1.5));
  const markerId = isSelected ? 'arrowhead-selected' : (isFlow ? 'arrowhead-flow' : 'arrowhead');

  // Calculate control points for Bezier curve
  const dist = Math.abs(end.x - start.x);
  const controlOffset = Math.min(dist * 0.5, 150);
  
  const pathD = `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`;

  return (
    <g 
      className={cn("pointer-events-auto cursor-pointer transition-opacity duration-200", isDimmed && !ghostOpacity && "opacity-20")} 
      style={{ opacity: ghostOpacity }}
      onClick={(e) => {
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
  const groups = useStore((state) => state.groups);
  const connections = useStore((state) => state.connections);
  const connectingSourceId = useStore((state) => state.connectingSourceId);
  const tempConnectionPos = useStore((state) => state.tempConnectionPos);
  const selectedConnectionId = useStore((state) => state.selectedConnectionId);
  const highlightedConnectionIds = useStore((state) => state.highlightedConnectionIds);
  const draggingBlockId = useStore((state) => state.draggingBlockId);
  const draggingPos = useStore((state) => state.draggingPos);
  const scale = useStore((state) => state.view.scale);
  const hoveredBlockId = useStore((state) => state.hoveredBlockId);
  const selectedBlockIds = useStore((state) => state.selectedBlockIds);

  // Optimize block lookup
  const blockMap = React.useMemo(() => {
    return new Map(blocks.map(b => [b.id, b]));
  }, [blocks]);

  const getEffectiveBlock = React.useCallback((blockId: string): Block | null => {
    const block = blockMap.get(blockId);
    if (!block) return null;

    // Check if block is in a collapsed group
    const collapsedGroup = groups.find(g => {
      if (!g.collapsed) return false;
      
      const dims = getBlockDimensions(block.type, 1);
      const width = block.width || dims.width;
      const height = block.height || dims.height;
      const bCenterX = block.x + width / 2;
      const bCenterY = block.y + height / 2;

      return (
        bCenterX >= g.x &&
        bCenterX <= g.x + g.width &&
        bCenterY >= g.y &&
        bCenterY <= g.y + g.height
      );
    });

    if (collapsedGroup) {
      return {
        ...block,
        id: collapsedGroup.id, // Use group ID to identify the node
        x: collapsedGroup.x,
        y: collapsedGroup.y,
        width: 300,
        height: 60,
      };
    }

    return block;
  }, [blockMap, groups]);

  const tempConnection = connectingSourceId && tempConnectionPos ? {
    fromId: connectingSourceId,
    toX: tempConnectionPos.x,
    toY: tempConnectionPos.y
  } : null;

  // Group connections by visual path to prevent opacity stacking
  const connectionGroups = React.useMemo(() => {
    const groups = new Map<string, Connection[]>();
    connections.forEach(conn => {
      const fromBlock = getEffectiveBlock(conn.fromId);
      const toBlock = getEffectiveBlock(conn.toId);
      
      if (!fromBlock || !toBlock) return;
      if (fromBlock.id === toBlock.id) return; // Internal to collapsed group

      const key = `${fromBlock.id}-${toBlock.id}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(conn);
    });
    return groups;
  }, [connections, getEffectiveBlock]);

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

      {Array.from(connectionGroups.entries()).map(([key, groupConns]) => {
        const representativeConn = groupConns[0];
        const fromBlock = getEffectiveBlock(representativeConn.fromId)!;
        const toBlock = getEffectiveBlock(representativeConn.toId)!;

        // Determine bundle properties
        let isBundleActive = false;
        let isBundleContext = true;
        let isBundleSelected = false;
        let isBundleHighlighted = false;

        groupConns.forEach(conn => {
            const connFrom = getEffectiveBlock(conn.fromId)!;
            const connTo = getEffectiveBlock(conn.toId)!;

            // Check original types for context logic
            const isContext = (connFrom.type === 'ingredients' || connFrom.type === 'context_file' || connFrom.type === 'input_file') && 
                              (connTo.type === 'chef' || connTo.type === 'input_file');
            
            if (!isContext) {
                isBundleContext = false;
            }

            const isSelected = selectedConnectionId === conn.id;
            // Check if source/target are active (selected or hovered)
            const isFromActive = 
                selectedBlockIds.includes(connFrom.id) || 
                hoveredBlockId === connFrom.id || 
                hoveredBlockId === conn.fromId ||
                selectedBlockIds.includes(conn.fromId);

            const isToActive = 
                selectedBlockIds.includes(connTo.id) || 
                hoveredBlockId === connTo.id || 
                hoveredBlockId === conn.toId ||
                selectedBlockIds.includes(conn.toId);

            if (isSelected || isFromActive || isToActive) {
                isBundleActive = true;
            }
            
            if (isSelected) isBundleSelected = true;
            if (highlightedConnectionIds.includes(conn.id)) isBundleHighlighted = true;
        });

        const isGhost = isBundleContext && !isBundleActive;
        const isDimmed = highlightedConnectionIds.length > 0 && !isBundleHighlighted;

        return (
          <ConnectionLine 
            key={key} 
            conn={representativeConn} 
            fromBlock={fromBlock} 
            toBlock={toBlock} 
            isSelected={isBundleSelected}
            isDimmed={isDimmed || isGhost} 
            isHighlighted={isBundleHighlighted}
            draggingBlockId={draggingBlockId}
            draggingPos={draggingPos}
            scale={scale}
            ghostOpacity={isGhost ? 0.05 : undefined} 
          />
        );
      })}

      {tempConnection && (() => {
        const fromBlock = getEffectiveBlock(tempConnection.fromId);
        if (!fromBlock) return null;
        const start = getBlockCenter(fromBlock, draggingBlockId, draggingPos, scale);
        
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
