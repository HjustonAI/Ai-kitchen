import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useExecutionStore } from '../store/useExecutionStore';
import { getPointOnBezier, getBezierLength } from '../lib/animationUtils';
import { ParticleSystem } from '../lib/particleSystem';
import { getBlockCenter, getEffectiveBlock } from '../lib/layoutUtils';

// Icon Paths (Simplified SVGs scaled for canvas)
const ICONS = {
  GEAR: new Path2D("M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z M19.14 12.936C19.524 13.32 20.172 13.32 20.556 12.936L21.936 11.556C22.32 11.172 22.32 10.524 21.936 10.14L20.556 8.76C20.424 8.628 20.364 8.448 20.376 8.268C20.448 7.332 20.316 6.384 19.98 5.508C19.92 5.34 19.944 5.148 20.064 5.016L21.036 3.9C21.432 3.444 21.372 2.76 20.928 2.316L19.536 0.924C19.092 0.48 18.408 0.42 17.952 0.816L16.836 1.788C16.692 1.908 16.5 1.932 16.332 1.872C15.456 1.548 14.508 1.416 13.572 1.488C13.392 1.5 13.212 1.44 13.08 1.308L11.7 0.084C11.316 -0.192 10.668 -0.192 10.284 0.084L8.904 1.308C8.772 1.44 8.592 1.5 8.412 1.488C7.476 1.416 6.528 1.548 5.652 1.872C5.484 1.932 5.292 1.908 5.148 1.788L4.032 0.816C3.576 0.42 2.892 0.48 2.448 0.924L1.056 2.316C0.612 2.76 0.552 3.444 0.948 3.9L1.92 5.016C2.04 5.148 2.064 5.34 2.004 5.508C1.668 6.384 1.536 7.332 1.608 8.268C1.62 8.448 1.56 8.628 1.428 8.76L0.048 10.14C-0.336 10.524 -0.336 11.172 0.048 11.556L1.428 12.936C1.56 13.068 1.62 13.248 1.608 13.428C1.536 14.364 1.668 15.312 2.004 16.188C2.064 16.356 2.04 16.548 1.92 16.68L0.948 17.796C0.552 18.252 0.612 18.936 1.056 19.38L2.448 20.772C2.892 21.216 3.576 21.276 4.032 20.88L5.148 19.908C5.292 19.788 5.484 19.764 5.652 19.824C6.528 20.148 7.476 20.28 8.412 20.208C8.592 20.196 8.772 20.256 8.904 20.388L10.284 21.768C10.668 22.152 11.316 22.152 11.7 21.768L13.08 20.388C13.212 20.256 13.392 20.196 13.572 20.208C14.508 20.28 15.456 20.148 16.332 19.824C16.5 19.764 16.692 19.788 16.836 19.908L17.952 20.88C18.408 21.276 19.092 21.216 19.536 20.772L20.928 19.38C21.372 18.936 21.432 18.252 21.036 17.796L20.064 16.68C19.944 16.548 19.92 16.356 19.98 16.188C20.316 15.312 20.448 14.364 20.376 13.428C20.364 13.248 20.424 13.068 20.556 12.936L21.936 11.556Z"),
  DATABASE: new Path2D("M12 3C17.5228 3 22 4.34315 22 6C22 7.65685 17.5228 9 12 9C6.47715 9 2 7.65685 2 6C2 4.34315 6.47715 3 12 3ZM22 12C22 13.6569 17.5228 15 12 15C6.47715 15 2 13.6569 2 12V6.6C2.68 7.9 6.8 9.2 12 9.2C17.2 9.2 21.32 7.9 22 6.6V12ZM22 18C22 19.6569 17.5228 21 12 21C6.47715 21 2 19.6569 2 18V12.6C2.68 13.9 6.8 15.2 12 15.2C17.2 15.2 21.32 13.9 22 12.6V18Z"),
  MESSAGE: new Path2D("M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z"),
};

export const ExecutionLayer: React.FC = () => {
  const blocks = useStore((s) => s.blocks);
  const groups = useStore((s) => s.groups);
  const connections = useStore((s) => s.connections);
  const view = useStore((s) => s.view);

  const isRunning = useExecutionStore((s) => s.isRunning);
  const simulationMode = useExecutionStore((s) => s.simulationMode);
  const dataPackets = useExecutionStore((s) => s.dataPackets);
  const onPacketArrived = useExecutionStore((s) => s.onPacketArrived);

  // Performance Optimization: Refs to hold latest state
  // This allows the animation loop to run without dependencies, avoiding restart overhead.
  const blocksRef = useRef(blocks);
  const groupsRef = useRef(groups);
  const connectionsRef = useRef(connections);
  const viewRef = useRef(view);

  // Sync refs
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);
  useEffect(() => { viewRef.current = view; }, [view]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State for smooth animation
  const progressMap = useRef<Map<string, number>>(new Map());
  const trailMap = useRef<Map<string, { x: number, y: number }[]>>(new Map());
  const particleSystem = useRef(new ParticleSystem());

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  // Sync store packets with local progress map
  useEffect(() => {
    const currentIds = new Set(dataPackets.map(p => p.id));

    // Add new packets
    dataPackets.forEach(p => {
      if (!progressMap.current.has(p.id)) {
        progressMap.current.set(p.id, 0);
        trailMap.current.set(p.id, []);
      }
    });

    // Remove old packets
    for (const id of progressMap.current.keys()) {
      if (!currentIds.has(id)) {
        progressMap.current.delete(id);
        trailMap.current.delete(id);
      }
    }
  }, [dataPackets]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        // High DPI support
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = window.innerWidth * dpr;
        canvasRef.current.height = window.innerHeight * dpr;
        canvasRef.current.style.width = `${window.innerWidth}px`;
        canvasRef.current.style.height = `${window.innerHeight}px`;

        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
        // Note: We do NOT apply view.scale here because we are inside a CSS transformed container.
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Animation Loop - STABLE
  useEffect(() => {
    const render = (ts: number) => {
      if (lastRef.current == null) lastRef.current = ts;
      const dt = ts - lastRef.current;
      lastRef.current = ts;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !canvasRef.current) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // Optimization: Disable expensive shadowBlur for the clear
      ctx.shadowBlur = 0;
      ctx.clearRect(0, 0, canvasRef.current.width / (window.devicePixelRatio || 1), canvasRef.current.height / (window.devicePixelRatio || 1));

      // Get state from refs
      const currentBlocks = blocksRef.current;
      const currentGroups = groupsRef.current;
      const currentConnections = connectionsRef.current;
      const currentView = viewRef.current;

      const blockMap = new Map(currentBlocks.map(b => [b.id, b]));
      const connMap = new Map(currentConnections.map(c => [c.id, c]));

      // Particles
      particleSystem.current.update();
      particleSystem.current.draw(ctx, currentView);

      const packetsToProcess: string[] = [];
      const executionState = useExecutionStore.getState();
      const currentPackets = executionState.dataPackets;
      const executionSpeed = executionState.executionSpeed;

      // We need dragging state from main store for accurate positioning
      const draggingBlockId = useStore.getState().draggingBlockId;
      const draggingPos = useStore.getState().draggingPos;

      currentPackets.forEach(p => {
        const conn = connMap.get(p.connectionId);
        if (!conn) return;

        // Use shared layout logic to match ConnectionsLayer exactly
        const from = getEffectiveBlock(conn.fromId, blockMap, currentGroups);
        const to = getEffectiveBlock(conn.toId, blockMap, currentGroups);

        if (!from || !to) return;
        if (from.id === to.id) return;

        // Calculate geometry using shared utility and include dragging state (Critical for alignment)
        const start = getBlockCenter(from, draggingBlockId, draggingPos, currentView.scale);
        const end = getBlockCenter(to, draggingBlockId, draggingPos, currentView.scale);

        // Logic check: ensure progressMap has this packet
        if (!progressMap.current.has(p.id)) {
          progressMap.current.set(p.id, p.progress || 0);
        }

        let rawProgress = progressMap.current.get(p.id) ?? 0;

        // --- NEW PHYSICS LOGIC ---
        // 1. Calculate Path Length
        const pathLength = getBezierLength(start, end);

        // 2. Define Constant Velocity (Pixels per Second)
        const TARGET_SPEED_PPS = 250 * executionSpeed;
        const speedPerMs = TARGET_SPEED_PPS / 1000;

        if (executionState.isRunning) {
          // Increment based on length
          const increment = pathLength > 0 ? (speedPerMs * dt) / pathLength : 0.05;
          rawProgress = Math.min(1, rawProgress + increment);
          progressMap.current.set(p.id, rawProgress);
        }

        // Use Linear progress for steady "wire" flow, minor ease only if needed.
        const easedProgress = rawProgress;

        if (rawProgress >= 1 && !packetsToProcess.includes(p.id)) {
          packetsToProcess.push(p.id);
          // Spawn impact particles
          if (to.type === 'dish') {
            particleSystem.current.emit(end.x, end.y, 30, { color: '#bc13fe', size: 3, life: 60, speed: 5, spread: Math.PI * 2 });
          } else {
            particleSystem.current.emit(end.x, end.y, 8, { color: '#00f3ff', speed: 2, life: 40 });
          }
        }

        const worldPos = getPointOnBezier(start, end, easedProgress);

        // Update Trail - Store World Positions directly
        const trail = trailMap.current.get(p.id) || [];
        trail.push(worldPos);
        if (trail.length > 25) trail.shift();
        trailMap.current.set(p.id, trail);

        // Draw Trail (World Space)
        if (trail.length > 1) {
          // Switch to Additive Blending for "Glow" effect
          ctx.globalCompositeOperation = 'lighter';

          ctx.beginPath();
          ctx.moveTo(trail[0].x, trail[0].y);
          for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(trail[i].x, trail[i].y);
          }

          let trailColorKey = '0, 243, 255';
          if (from.type === 'input_file') trailColorKey = '255, 255, 255';
          if (from.type === 'context_file') trailColorKey = '255, 215, 0';
          if (from.type === 'dish') trailColorKey = '188, 19, 254';

          const gradient = ctx.createLinearGradient(
            trail[0].x, trail[0].y,
            worldPos.x, worldPos.y
          );
          gradient.addColorStop(0, `rgba(${trailColorKey}, 0)`);
          gradient.addColorStop(1, `rgba(${trailColorKey}, 0.8)`);

          ctx.strokeStyle = gradient;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Reset Composite
          ctx.globalCompositeOperation = 'source-over';
        }

        // Draw Icon
        const screenX = worldPos.x;
        const screenY = worldPos.y;

        ctx.save();
        ctx.translate(screenX, screenY);
        const iconScale = 0.8;
        ctx.scale(iconScale, iconScale);
        if (from.type === 'chef') ctx.rotate(ts * 0.005);
        ctx.translate(-12, -12);

        if (from.type === 'input_file') {
          ctx.fillStyle = '#ffffff';
          ctx.fill(ICONS.MESSAGE);
        } else if (from.type === 'context_file') {
          ctx.fillStyle = '#ffd700';
          ctx.fill(ICONS.DATABASE);
        } else if (from.type === 'chef') {
          ctx.fillStyle = '#00f3ff';
          ctx.fill(ICONS.GEAR);
        } else {
          ctx.restore();
          ctx.beginPath();
          ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
          ctx.fillStyle = from.type === 'dish' ? '#bc13fe' : '#00f3ff';
          ctx.fill();
          ctx.save();
        }
        ctx.restore();

        if (Math.random() < 0.1) {
          particleSystem.current.emit(worldPos.x, worldPos.y, 1, {
            color: from.type === 'context_file' ? '#ffd700' : '#00f3ff',
            size: 1, life: 20, speed: 0.5
          });
        }
      });

      // Cleanup local maps against store data
      const activeIds = new Set(currentPackets.map(p => p.id));
      for (const id of progressMap.current.keys()) {
        if (!activeIds.has(id)) {
          progressMap.current.delete(id);
          trailMap.current.delete(id);
        }
      }

      if (packetsToProcess.length > 0) {
        packetsToProcess.forEach(id => onPacketArrived(id, currentConnections));
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, []); // DEPENDENCY ARRAY EMPTY - Stable loop

  // Continuous Spawner Logic
  const addPacket = useExecutionStore((s) => s.addPacket);
  const lastSpawnTime = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!simulationMode || !isRunning) return;

    const spawnInterval = setInterval(() => {
      const now = Date.now();
      const currentBlocks = blocksRef.current;
      const currentConnections = connectionsRef.current;

      const sources = currentBlocks.filter(b => b.type === 'input_file' || b.type === 'context_file' || b.type === 'ingredients');

      sources.forEach(source => {
        const lastTime = lastSpawnTime.current.get(source.id) || 0;
        const delay = source.type === 'input_file' ? 2000 : 4000;

        if (now - lastTime > delay + Math.random() * 2000) {
          const outgoing = currentConnections.filter(c => c.fromId === source.id);
          if (outgoing.length > 0) {
            // Staggered Spawning
            outgoing.forEach((c, index) => {
              setTimeout(() => {
                if (useExecutionStore.getState().simulationMode) {
                  addPacket(c.id);
                }
              }, index * 300);
            });
            lastSpawnTime.current.set(source.id, now);
          }
        }
      });
    }, 1000);

    return () => clearInterval(spawnInterval);
  }, [simulationMode, isRunning, addPacket]); // Dependencies reduced

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none mix-blend-screen transition-opacity duration-500 ${simulationMode ? 'opacity-100' : 'opacity-80'}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
};

export default ExecutionLayer;
