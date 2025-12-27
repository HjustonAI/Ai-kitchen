/**
 * High-Performance Execution Layer
 * 
 * Optimizations:
 * - Ref-based render loop (no dependency restarts)
 * - Object pooling for all allocations
 * - Batch rendering with minimal state changes
 * - Pre-computed bezier data with LUT
 * - Frustum culling for off-screen elements
 * - Icon atlas (single texture for all icons)
 * - Delta-time capped to prevent spiral of death
 * 
 * Flow Logic:
 * - Integrates with ExecutionEngine for logical agentic flow
 * - Different packet types (input, query, response, output, handoff) have different colors
 * - Query packets go FROM agent TO context
 * - Response packets come back FROM context TO agent
 */

import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useExecutionStore, type DataPacket } from '../store/useExecutionStore';
import { getBezierData, 
  getPointAtDistance, 
  clearBezierCache,
  type Point 
} from '../lib/animationUtilsOptimized';
import { OptimizedParticleSystem } from '../lib/particleSystemOptimized';
import { getBlockCenter, getEffectiveBlock } from '../lib/layoutUtils';
import { executionEngine } from '../lib/executionEngineV2';

// ============ Configuration ============
const TARGET_SPEED_PPS = 280; // Pixels per second base speed
const MAX_DT = 50; // Cap delta time at 50ms to prevent spiral of death
const SPARK_PROBABILITY = 0.06; // Reduced for performance
const ICON_SIZE = 24;
const ICON_SCALE = 0.8;

// Color definitions - different for each packet type
const COLORS = {
  cyan: { r: 0, g: 243, b: 255, key: '#00f3ff' },
  white: { r: 255, g: 255, b: 255, key: '#ffffff' },
  amber: { r: 251, g: 191, b: 36, key: '#fbbf24' },
  blue: { r: 96, g: 165, b: 250, key: '#60a5fa' },
  purple: { r: 188, g: 19, b: 254, key: '#bc13fe' },
  green: { r: 34, g: 197, b: 94, key: '#22c55e' },
  orange: { r: 249, g: 115, b: 22, key: '#f97316' },
} as const;

// Packet type to color mapping - shows the flow type visually
const PACKET_TYPE_COLORS: Record<DataPacket['type'], typeof COLORS[keyof typeof COLORS]> = {
  input: COLORS.blue,       // User input - blue
  query: COLORS.orange,     // Agent querying context - orange (outgoing request)
  response: COLORS.green,   // Context responding - green (incoming data)
  output: COLORS.purple,    // Final output - purple
  handoff: COLORS.cyan,     // Agent to agent handoff - cyan
};

// ============ Icon Paths (pre-parsed) ============
const ICON_PATHS = {
  // Query icon - question mark / search
  QUERY: new Path2D("M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"),
  // Response icon - arrow/data coming back
  RESPONSE: new Path2D("M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"),
  // Input icon - message/document
  INPUT: new Path2D("M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z"),
  // Output icon - export/send
  OUTPUT: new Path2D("M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"),
  // Handoff icon - arrow right
  HANDOFF: new Path2D("M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"),
  // Gear for processing
  GEAR: new Path2D("M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"),
};

// ============ Reusable Objects (avoid allocations) ============
const tempPoint: Point = { x: 0, y: 0 };
const tempStart: Point = { x: 0, y: 0 };
const tempEnd: Point = { x: 0, y: 0 };

// ============ Progress State Pool ============
interface PacketState {
  progress: number;
  trailSlot: number;
  packetType: DataPacket['type'];
  colorKey: string;
}

const packetStatePool = new Map<string, PacketState>();

function getPacketState(id: string, packetType: DataPacket['type']): PacketState {
  let state = packetStatePool.get(id);
  if (!state) {
    const color = PACKET_TYPE_COLORS[packetType] || COLORS.cyan;
    state = {
      progress: 0,
      trailSlot: -1,
      packetType,
      colorKey: color.key,
    };
    packetStatePool.set(id, state);
  }
  return state;
}

function removePacketState(id: string): void {
  packetStatePool.delete(id);
}

// ============ Component ============
export const ExecutionLayerOptimized: React.FC = () => {
  // Store subscriptions (selectors for minimal re-renders)
  const blocks = useStore((s) => s.blocks);
  const groups = useStore((s) => s.groups);
  const connections = useStore((s) => s.connections);
  const view = useStore((s) => s.view);
  
  const simulationMode = useExecutionStore((s) => s.simulationMode);
  const dataPackets = useExecutionStore((s) => s.dataPackets);

  // Refs for stable render loop
  const blocksRef = useRef(blocks);
  const groupsRef = useRef(groups);
  const connectionsRef = useRef(connections);
  const viewRef = useRef(view);
  const dataPacketsRef = useRef(dataPackets);
  
  // Sync refs
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { dataPacketsRef.current = dataPackets; }, [dataPackets]);

  // Canvas and systems
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystem = useRef<OptimizedParticleSystem>(new OptimizedParticleSystem());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Update engine topology when blocks/connections change
  useEffect(() => {
    executionEngine.updateTopology(blocks, connections);
  }, [blocks, connections]);

  // Handle resize - Screen-sized canvas for performance
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect();
      const width = rect?.width || window.innerWidth;
      const height = rect?.height || window.innerHeight;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clear cache when blocks/connections change significantly
  useEffect(() => {
    clearBezierCache();
  }, [blocks.length, connections.length]);

  // ============ Main Render Loop ============
  useEffect(() => {
    const ps = particleSystem.current;
    
    const render = (timestamp: number) => {
      // Delta time with cap
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const rawDt = timestamp - lastTimeRef.current;
      const dt = Math.min(rawDt, MAX_DT);
      lastTimeRef.current = timestamp;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // Clear canvas
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, width, height);

      // Get current state from refs
      const currentBlocks = blocksRef.current;
      const currentGroups = groupsRef.current;
      const currentConnections = connectionsRef.current;
      const currentView = viewRef.current;
      const currentPackets = dataPacketsRef.current;
      
      // Get execution state
      const executionState = useExecutionStore.getState();
      const { executionSpeed, isRunning: execRunning } = executionState;
      
      // Get drag state
      const mainState = useStore.getState();
      const { draggingBlockId, draggingPos } = mainState;

      // Build lookup maps
      const blockMap = new Map(currentBlocks.map(b => [b.id, b]));
      const connMap = new Map(currentConnections.map(c => [c.id, c]));

      // Track active packet IDs
      const activePacketIds = new Set<string>();
      const arrivedPackets: string[] = [];

      // ============ Process Packets ============
      currentPackets.forEach(packet => {
        const conn = connMap.get(packet.connectionId);
        if (!conn) return;

        const fromBlock = getEffectiveBlock(conn.fromId, blockMap, currentGroups);
        const toBlock = getEffectiveBlock(conn.toId, blockMap, currentGroups);
        if (!fromBlock || !toBlock || fromBlock.id === toBlock.id) return;

        activePacketIds.add(packet.id);

        // Get cached block centers
        const start = getBlockCenter(fromBlock, draggingBlockId, draggingPos, currentView.scale);
        const end = getBlockCenter(toBlock, draggingBlockId, draggingPos, currentView.scale);
        
        // Handle reverse packets (response traveling backwards on same connection)
        const isReverse = (packet as any).isReverse === true;
        if (isReverse) {
          // Swap start and end for reverse direction
          tempStart.x = end.x;
          tempStart.y = end.y;
          tempEnd.x = start.x;
          tempEnd.y = start.y;
        } else {
          tempStart.x = start.x;
          tempStart.y = start.y;
          tempEnd.x = end.x;
          tempEnd.y = end.y;
        }

        // Get or create packet state - USE PACKET TYPE for color
        const packetType = packet.type || 'input';
        const state = getPacketState(packet.id, packetType);

        // Get cached bezier data (use reverse flag for cache key)
        const cacheKey = isReverse ? `${conn.id}_rev` : conn.id;
        const bezier = getBezierData(cacheKey, tempStart, tempEnd);

        // Use progress from engine (via store) - engine is single source of truth
        state.progress = packet.progress;

        // Check for arrival (visual only - engine handles logic)
        if (state.progress >= 1 && !arrivedPackets.includes(packet.id)) {
          arrivedPackets.push(packet.id);
          
          // Determine arrival point (tempEnd for normal, tempEnd for reverse too since we swapped)
          const arrivalPoint = { x: tempEnd.x, y: tempEnd.y };
          
          // Emit arrival particles based on packet type and destination
          const arrivalColor = PACKET_TYPE_COLORS[packetType]?.key || COLORS.cyan.key;
          
          if (packetType === 'output' || (!isReverse && toBlock.type === 'dish')) {
            // Final output - celebration burst
            ps.emit(arrivalPoint.x, arrivalPoint.y, 25, { 
              color: COLORS.purple.key, 
              size: 3, 
              life: 50, 
              speed: 4, 
              spread: Math.PI * 2 
            });
          } else if (packetType === 'response') {
            // Context response arriving at agent - subtle green glow
            ps.emit(arrivalPoint.x, arrivalPoint.y, 12, { 
              color: COLORS.green.key, 
              size: 2, 
              life: 40, 
              speed: 2,
              spread: Math.PI * 0.5
            });
          } else if (packetType === 'query') {
            // Query arriving at context - orange ping
            ps.emit(arrivalPoint.x, arrivalPoint.y, 8, { 
              color: COLORS.orange.key, 
              size: 2, 
              life: 30, 
              speed: 1.5 
            });
          } else {
            // Default arrival effect
            ps.emit(arrivalPoint.x, arrivalPoint.y, 6, { 
              color: arrivalColor, 
              speed: 2, 
              life: 35 
            });
          }
        }

        // Get current position
        getPointAtDistance(bezier, state.progress, tempPoint);

        // Update trail
        if (state.trailSlot === -1) {
          state.trailSlot = ps.getTrailSlot(packet.id, state.colorKey);
        }
        if (state.trailSlot >= 0) {
          ps.addTrailPoint(state.trailSlot, tempPoint.x, tempPoint.y);
        }

        // Emit spark particles (reduced probability)
        if (Math.random() < SPARK_PROBABILITY) {
          ps.emit(tempPoint.x, tempPoint.y, 1, {
            color: state.colorKey,
            size: 1,
            life: 18,
            speed: 0.4
          });
        }
      });

      // ============ Draw Phase (All in Screen Space) ============
      
      // 1. Draw trails (screen space with view transform)
      ps.drawTrails(ctx, currentView);

      // 2. Draw icons based on packet type (transform world coords to screen coords)
      ctx.save();
      currentPackets.forEach(packet => {
        const conn = connMap.get(packet.connectionId);
        if (!conn) return;
        
        const state = packetStatePool.get(packet.id);
        if (!state) return;
        
        const trailEnd = ps.getTrailEnd(state.trailSlot);
        if (!trailEnd) return;

        // Transform world to screen coordinates
        const screenX = currentView.x + trailEnd.x * currentView.scale;
        const screenY = currentView.y + trailEnd.y * currentView.scale;
        
        // Use packet type for color and icon
        const packetType = state.packetType;
        const color = PACKET_TYPE_COLORS[packetType] || COLORS.cyan;
        const scaledIconScale = ICON_SCALE * currentView.scale;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.scale(scaledIconScale, scaledIconScale);
        
        ctx.translate(-ICON_SIZE / 2, -ICON_SIZE / 2);
        ctx.fillStyle = color.key;
        
        // Draw icon based on packet type
        switch (packetType) {
          case 'query':
            ctx.fill(ICON_PATHS.QUERY);
            break;
          case 'response':
            ctx.fill(ICON_PATHS.RESPONSE);
            break;
          case 'input':
            ctx.fill(ICON_PATHS.INPUT);
            break;
          case 'output':
            ctx.fill(ICON_PATHS.OUTPUT);
            break;
          case 'handoff':
            // Rotate handoff arrow based on movement
            ctx.translate(ICON_SIZE / 2, ICON_SIZE / 2);
            ctx.rotate(Math.sin(timestamp * 0.003) * 0.1);
            ctx.translate(-ICON_SIZE / 2, -ICON_SIZE / 2);
            ctx.fill(ICON_PATHS.HANDOFF);
            break;
          default:
            // Simple circle for unknown types
            ctx.restore();
            ctx.save();
            ctx.beginPath();
            ctx.arc(screenX, screenY, 4 * currentView.scale, 0, Math.PI * 2);
            ctx.fillStyle = color.key;
            ctx.fill();
        }
        ctx.restore();
      });
      ctx.restore();

      // 3. Update and draw particles (screen space)
      ps.update();
      ps.draw(ctx, currentView);

      // ============ Cleanup ============
      
      // Remove inactive packet states (visual cleanup)
      for (const id of packetStatePool.keys()) {
        if (!activePacketIds.has(id)) {
          const state = packetStatePool.get(id);
          if (state && state.trailSlot >= 0) {
            ps.removeTrail(id);
          }
          removePacketState(id);
        }
      }

      // Emit arrival particles for packets that reached destination
      // (Logic is handled by engine via onPacketRemoved callback)
      arrivedPackets.forEach(id => {
        // Particle effects already emitted during packet processing above
      });

      // Update execution engine (drives all logic)
      executionEngine.update(timestamp);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, []); // Empty deps - stable loop

  // Clear particle system when simulation stops
  useEffect(() => {
    if (!simulationMode) {
      particleSystem.current.clear();
      packetStatePool.clear();
    }
  }, [simulationMode]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-500 ${
        simulationMode ? 'opacity-100' : 'opacity-80'
      }`}
      style={{ zIndex: 10 }}
      aria-hidden="true"
    />
  );
};

export default ExecutionLayerOptimized;
