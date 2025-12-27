import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useExecutionStore } from '../store/useExecutionStore';
import type { Block, BlockType } from '../types';

const getBlockDimensions = (type: BlockType, scale: number) => {
  if (scale < 0.3) return { width: 56, height: 32 };
  if (scale < 0.6) return type === 'note' ? { width: 176, height: 176 } : { width: 176, height: 48 };
  switch (type) {
    case 'chef': return { width: 320, height: 180 };
    case 'ingredients': return { width: 256, height: 160 };
    case 'dish': return { width: 288, height: 180 };
    case 'note': return { width: 256, height: 256 };
    default: return { width: 288, height: 120 };
  }
};

const getBlockCenter = (block: Block, scale: number) => {
  let width, height;
  if (block.width && block.height) {
    width = block.width;
    height = block.height;
  } else {
    const dims = getBlockDimensions(block.type, scale);
    width = dims.width;
    height = dims.height;
  }
  return { x: block.x + width / 2, y: block.y + height / 2 };
};

export const ExecutionLayer: React.FC = () => {
  const blocks = useStore((s) => s.blocks);
  const groups = useStore((s) => s.groups);
  const connections = useStore((s) => s.connections);
  const view = useStore((s) => s.view);

  const isRunning = useExecutionStore((s) => s.isRunning);
  const dataPackets = useExecutionStore((s) => s.dataPackets);
  const onPacketArrived = useExecutionStore((s) => s.onPacketArrived);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressMap = useRef<Map<string, number>>(new Map());
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  // Sync store packets with local progress map
  useEffect(() => {
    const currentIds = new Set(dataPackets.map(p => p.id));
    
    // Add new packets
    dataPackets.forEach(p => {
      if (!progressMap.current.has(p.id)) {
        progressMap.current.set(p.id, 0);
      }
    });

    // Remove old packets
    for (const id of progressMap.current.keys()) {
      if (!currentIds.has(id)) {
        progressMap.current.delete(id);
      }
    }
  }, [dataPackets]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Animation Loop
  useEffect(() => {
    const blockMap = new Map(blocks.map(b => [b.id, b]));
    const connMap = new Map(connections.map(c => [c.id, c]));

    const getEffectiveBlock = (blockId: string): Block | null => {
      const block = blockMap.get(blockId);
      if (!block) return null;

      const collapsedGroup = groups.find(g => 
        g.collapsed && 
        (block.x + (block.width || 0)/2) >= g.x && 
        (block.x + (block.width || 0)/2) <= g.x + g.width &&
        (block.y + (block.height || 0)/2) >= g.y && 
        (block.y + (block.height || 0)/2) <= g.y + g.height
      );

      if (collapsedGroup) {
        return {
          ...block,
          id: collapsedGroup.id,
          x: collapsedGroup.x,
          y: collapsedGroup.y,
          width: 300,
          height: 60,
        };
      }
      return block;
    };

    const render = (ts: number) => {
      if (lastRef.current == null) lastRef.current = ts;
      const dt = ts - lastRef.current;
      lastRef.current = ts;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !canvasRef.current) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // Update and Draw
      const packetsToProcess: string[] = [];

      progressMap.current.forEach((progress, id) => {
        // Update progress if running
        let nextProgress = progress;
        if (isRunning) {
          const speed = 0.0012; // progress per ms
          nextProgress = Math.min(1, progress + speed * dt);
          progressMap.current.set(id, nextProgress);
        }

        if (nextProgress >= 1) {
          packetsToProcess.push(id);
        }
      });

      // We need to iterate `dataPackets` to draw, using the progress from the map.
      dataPackets.forEach(p => {
        const progress = progressMap.current.get(p.id) ?? 0;
        const conn = connMap.get(p.connectionId);
        if (!conn) return;
        
        const from = getEffectiveBlock(conn.fromId);
        const to = getEffectiveBlock(conn.toId);
        if (!from || !to) return;

        // Don't draw if internal to collapsed group
        if (from.id === to.id) return;

        const start = getBlockCenter(from, view.scale);
        const end = getBlockCenter(to, view.scale);

        // Interpolate in World Space
        const worldX = start.x + (end.x - start.x) * progress;
        const worldY = start.y + (end.y - start.y) * progress;

        // Transform to Screen Space
        const screenX = view.x + worldX * view.scale;
        const screenY = view.y + worldY * view.scale;

        // Draw Glow
        ctx.beginPath();
        ctx.arc(screenX, screenY, 6 * view.scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 243, 255, 0.3)';
        ctx.fill();

        // Draw Core
        ctx.beginPath();
        ctx.arc(screenX, screenY, 3 * view.scale, 0, Math.PI * 2);
        ctx.fillStyle = '#00f3ff';
        ctx.fill();
      });

      // Process finished packets
      if (packetsToProcess.length > 0) {
        // We need to pass the current connections to the store action
        // Since we are in a closure, we use the `connections` from the hook scope
        packetsToProcess.forEach(id => onPacketArrived(id, connections));
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [blocks, connections, groups, view, isRunning, dataPackets, onPacketArrived]);

  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      aria-hidden="true"
    />
  );
};

export default ExecutionLayer;
