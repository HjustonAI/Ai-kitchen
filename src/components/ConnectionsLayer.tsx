import React, { memo, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import type { Block, Connection } from '../types';
import { getBlockCenter, getBlockDimensions } from '../lib/layoutUtils';
import { cn } from '../lib/utils';
import { getBezierPath } from '../lib/animationUtilsOptimized';
import { executionEngine } from '../lib/executionEngineV2';

// Packet type to glow color mapping
const PACKET_GLOW_COLORS: Record<string, string> = {
  input: '#3B82F6',     // blue-500
  query: '#F97316',     // orange-500
  response: '#22C55E',  // green-500
  output: '#A855F7',    // purple-500
  handoff: '#06B6D4',   // cyan-500
};

const ConnectionLine = memo(({ 
  conn, 
  fromBlock, 
  toBlock, 
  isSelected, 
  isDimmed, 
  isHighlighted, 
  draggingBlockId, 
  draggingPos, 
  scale, 
  ghostOpacity,
  activePacket,
  onSelect,
}: {
  conn: Connection,
  fromBlock: Block,
  toBlock: Block,
  isSelected: boolean,
  isDimmed: boolean,
  isHighlighted: boolean,
  draggingBlockId: string | null,
  draggingPos: { x: number; y: number } | null,
  scale: number,
  ghostOpacity?: number,
  activePacket?: { type: string; progress: number } | null,
  onSelect: (id: string) => void,
}) => {

  const start = getBlockCenter(fromBlock, draggingBlockId, draggingPos, scale);
  const end = getBlockCenter(toBlock, draggingBlockId, draggingPos, scale);

  const isFlow = conn.type === 'flow';
  const isSync = conn.type === 'sync';
  const isContextSource = fromBlock.type === 'context_file';
  const isInputSource = fromBlock.type === 'input_file';
  const isDataSource = isContextSource || isInputSource;

  let color = '#4b5563';
  if (isSelected) color = '#ffffff';
  else if (isFlow) color = '#00f3ff';
  else if (isSync) color = '#a855f7';
  else if (isContextSource) color = '#fbbf24'; // Amber/gold for context
  else if (isInputSource) color = '#60a5fa'; // Blue for input
  else if (isHighlighted) color = '#60a5fa';

  const width = isSelected ? 3 : (isHighlighted ? 2.5 : (isFlow || isSync ? 2 : (isDataSource ? 1.8 : 1.5)));
  const markerId = isSelected ? 'arrowhead-selected' : (isFlow ? 'arrowhead-flow' : (isContextSource ? 'arrowhead-context' : (isInputSource ? 'arrowhead-input' : 'arrowhead')));
  
  // Dashed pattern for data sources
  let dashArray = 'none';
  if (isSync) dashArray = '5,5';
  else if (isContextSource) dashArray = '8,4';
  else if (isInputSource) dashArray = '4,4';

  const pathD = getBezierPath(start, end);
  
  // Glow effect when packet is traveling through this connection
  const glowColor = activePacket ? PACKET_GLOW_COLORS[activePacket.type] || '#3B82F6' : null;
  const glowFilterId = activePacket ? `glow-${activePacket.type}` : null;

  return (
    <g
      className={cn("pointer-events-auto cursor-pointer transition-opacity duration-200", isDimmed && !ghostOpacity && !activePacket && "opacity-20")}
      style={{ opacity: ghostOpacity }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(conn.id);
      }}>
      {/* Invisible wider path for easier clicking */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
      />

      {/* Active packet glow layer (behind main line) */}
      {activePacket && glowColor && (
        <path
          d={pathD}
          fill="none"
          stroke={glowColor}
          strokeWidth={width + 8}
          strokeLinecap="round"
          filter={`url(#${glowFilterId})`}
          className="animate-pulse"
          style={{ opacity: 0.6 }}
        />
      )}

      <path
        d={pathD}
        fill="none"
        stroke={activePacket ? glowColor! : color}
        strokeWidth={activePacket ? width + 1 : width}
        strokeDasharray={activePacket ? 'none' : dashArray}
        markerEnd={`url(#${markerId})`}
      />

{/* Removed: continuous flow animation - replaced by ExecutionLayer packets */}

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

export const ConnectionsLayer: React.FC = () => {
  // Consolidated subscriptions for better performance
  const {
    blocks,
    groups,
    connections,
    connectingSourceId,
    tempConnectionPos,
    selectedConnectionId,
    highlightedConnectionIds,
    draggingBlockId,
    draggingPos,
    hoveredBlockId,
    selectedBlockIds,
    selectConnection,
  } = useStore(useShallow((state) => ({
    blocks: state.blocks,
    groups: state.groups,
    connections: state.connections,
    connectingSourceId: state.connectingSourceId,
    tempConnectionPos: state.tempConnectionPos,
    selectedConnectionId: state.selectedConnectionId,
    highlightedConnectionIds: state.highlightedConnectionIds,
    draggingBlockId: state.draggingBlockId,
    draggingPos: state.draggingPos,
    hoveredBlockId: state.hoveredBlockId,
    selectedBlockIds: state.selectedBlockIds,
    selectConnection: state.selectConnection,
  })));
  const scale = useStore((state) => state.view.scale);
  
  // Get active packets directly from engine for glow effects (bypasses store for performance)
  // This is computed on each render, but ConnectionsLayer only re-renders when blocks/connections change
  const activeConnectionPackets = useMemo(() => {
    const map = new Map<string, { type: string; progress: number }>();
    const packets = executionEngine.getPackets();
    packets.forEach(packet => {
      // Only track packets that are actively traveling (not at endpoints)
      if (packet.progress > 0.02 && packet.progress < 0.98) {
        const existing = map.get(packet.connectionId);
        // Keep the packet that's furthest along
        if (!existing || packet.progress > existing.progress) {
          map.set(packet.connectionId, { type: packet.type, progress: packet.progress });
        }
      }
    });
    return map;
    // Note: No dependencies - this is intentionally computed fresh each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, connections]); // Re-compute when topology changes

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
        <marker
          id="arrowhead-context"
          markerWidth="10"
          markerHeight="7"
          refX="28"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
        </marker>
        <marker
          id="arrowhead-input"
          markerWidth="10"
          markerHeight="7"
          refX="28"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
        </marker>
        
        {/* Glow filters for active packet connections */}
        <filter id="glow-input" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="glow-query" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="glow-response" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="glow-output" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="glow-handoff" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
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
        
        // Check if any connection in this bundle has an active packet
        let bundleActivePacket: { type: string; progress: number } | null = null;
        for (const conn of groupConns) {
          const packet = activeConnectionPackets.get(conn.id);
          if (packet) {
            bundleActivePacket = packet;
            break;
          }
        }

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
            activePacket={bundleActivePacket}
            onSelect={selectConnection}
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
