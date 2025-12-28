import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Block, BlockType } from './types';
import { Sidebar } from './components/Sidebar';
import { Board } from './components/Board';
import { BottomBar } from './components/BottomBar';
import { Block as BlockComponent } from './components/Block';
import { Group } from './components/Group';
import { ConnectionsLayer } from './components/ConnectionsLayer';
import ExecutionLayer from './components/ExecutionLayerOptimized';
import { ContextPanel } from './components/ContextPanel';
import { useStore } from './store/useStore';
import { getBlockDimensions } from './lib/layoutUtils';

function App() {
  // Consolidated store subscription - single subscription instead of 17+
  const { 
    blocks, groups, connections, 
    selectedId, selectedGroupId, selectedConnectionId, 
    view, connectingSourceId, hoveredBlockId, selectionPriority 
  } = useStore(
    useShallow((s) => ({
      blocks: s.blocks,
      groups: s.groups,
      connections: s.connections,
      selectedId: s.selectedId,
      selectedGroupId: s.selectedGroupId,
      selectedConnectionId: s.selectedConnectionId,
      view: s.view,
      connectingSourceId: s.connectingSourceId,
      hoveredBlockId: s.hoveredBlockId,
      selectionPriority: s.selectionPriority,
    }))
  );

  // Actions accessed via getState() - no subscription needed
  const { 
    deleteBlock, deleteGroup, deleteConnection,
    updateView, selectBlock, selectGroup, selectConnection,
    setConnectingSourceId, setTempConnectionPos, addConnection 
  } = useStore.getState();

  // Local Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Refs for throttling
  const rAF = useRef<number | null>(null);

  // Ensure view is valid on load
  useEffect(() => {
    if (!view.scale || isNaN(view.scale) || view.scale <= 0) {
      updateView({ x: 0, y: 0, scale: 1 });
    }
  }, [view.scale, updateView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Canvas handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (rAF.current) return;

    // Capture event properties needed for async execution
    const deltaX = e.deltaX;
    const deltaY = e.deltaY;
    const clientX = e.clientX;
    const clientY = e.clientY;
    const ctrlKey = e.ctrlKey;
    const metaKey = e.metaKey;
    const currentTarget = e.currentTarget;
    const boardRect = currentTarget.getBoundingClientRect();

    rAF.current = requestAnimationFrame(() => {
      // Default behavior: Zoom on scroll (unless Ctrl is pressed, then Pan - swapping standard behavior as requested)
      // Actually, standard for "Zoom with scroll" usually means just Scroll = Zoom.
      // Let's make Scroll = Zoom, and Ctrl+Scroll = Pan (or just Pan with drag).

      if (!ctrlKey && !metaKey) {
        const zoomSensitivity = 0.001;
        const delta = -deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(0.1, view.scale + delta), 5);

        // Zoom towards mouse pointer
        const mouseX = clientX - boardRect.left;
        const mouseY = clientY - boardRect.top;

        const scaleRatio = newScale / view.scale;
        const newX = mouseX - (mouseX - view.x) * scaleRatio;
        const newY = mouseY - (mouseY - view.y) * scaleRatio;

        updateView({ x: newX, y: newY, scale: newScale });
      } else {
        // Pan with scroll wheel if Ctrl is held (optional, or just disable pan on scroll)
        updateView({
          x: view.x - deltaX,
          y: view.y - deltaY
        });
      }
      rAF.current = null;
    });
  }, [view, updateView]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Allow panning with:
    // 1. Middle Mouse Button
    // 2. Space + Left Click
    // 3. Left Click on the background (not on a block)
    const isBackground = e.target === e.currentTarget;

    if (
      e.button === 1 ||
      (e.button === 0 && isSpacePressed) ||
      (e.button === 0 && isBackground)
    ) {
      e.preventDefault();
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [isSpacePressed]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (rAF.current) return;

    const clientX = e.clientX;
    const clientY = e.clientY;
    const currentTarget = e.currentTarget;
    const boardRect = currentTarget.getBoundingClientRect();

    rAF.current = requestAnimationFrame(() => {
      // Handle Panning
      if (isPanning) {
        const dx = clientX - lastMousePos.x;
        const dy = clientY - lastMousePos.y;
        updateView({ x: view.x + dx, y: view.y + dy });
        setLastMousePos({ x: clientX, y: clientY });
      }

      // Handle Connection Dragging
      if (connectingSourceId) {
        // Transform screen coordinates to canvas coordinates
        const rawX = clientX - boardRect.left;
        const rawY = clientY - boardRect.top;

        setTempConnectionPos({
          x: (rawX - view.x) / view.scale,
          y: (rawY - view.y) / view.scale
        });
      }
      rAF.current = null;
    });
  }, [isPanning, lastMousePos, connectingSourceId, view, updateView, setTempConnectionPos]);

  const handleBoardMouseUp = useCallback(() => {
    if (rAF.current) {
      cancelAnimationFrame(rAF.current);
      rAF.current = null;
    }
    setIsPanning(false);
    if (connectingSourceId) {
      // If we are hovering over a block, try to connect
      if (hoveredBlockId && hoveredBlockId !== connectingSourceId) {
        const exists = connections.some(
          c => (c.fromId === connectingSourceId && c.toId === hoveredBlockId) ||
            (c.fromId === hoveredBlockId && c.toId === connectingSourceId)
        );
        if (!exists) {
          addConnection(connectingSourceId, hoveredBlockId);
        }
      }
      setConnectingSourceId(null);
      setTempConnectionPos(null);
    }
  }, [connectingSourceId, hoveredBlockId, connections, addConnection, setConnectingSourceId, setTempConnectionPos]);

  // Handle clicks bubbled from the Board. Uses canvas coordinates to hit-test groups and contained blocks.
  const handleBoardClick = useCallback((e: React.MouseEvent) => {
    const boardRect = (e.currentTarget as Element).getBoundingClientRect();
    const rawX = e.clientX - boardRect.left;
    const rawY = e.clientY - boardRect.top;

    const canvasX = (rawX - view.x) / view.scale;
    const canvasY = (rawY - view.y) / view.scale;

    // If click is inside a group, prefer selecting a block inside that group (nearest or directly under cursor)
    const clickedGroup = groups.slice().reverse().find((g) => {
      const width = g.collapsed ? 300 : g.width;
      const height = g.collapsed ? 60 : g.height;
      return canvasX >= g.x && canvasX <= g.x + width && canvasY >= g.y && canvasY <= g.y + height;
    });

    if (clickedGroup) {
      // If selection priority is 'group', select the group immediately and stop
      if (selectionPriority === 'group') {
        selectGroup(clickedGroup.id);
        return;
      }

      // Find blocks that overlap the group's rect
      const blocksInGroup = blocks.filter((b) => {
        const dims = getBlockDimensions(b.type as BlockType, view.scale);
        const width = b.width || dims.width;
        const height = b.height || dims.height;
        const left = b.x;
        const top = b.y;
        const right = b.x + width;
        const bottom = b.y + height;

        return !(right < clickedGroup.x || left > clickedGroup.x + clickedGroup.width || bottom < clickedGroup.y || top > clickedGroup.y + clickedGroup.height);
      });

      if (blocksInGroup.length > 0) {
        // Try to find a block directly under the cursor first
        let target = blocksInGroup.find((b) => {
          const dims = getBlockDimensions(b.type as BlockType, view.scale);
          const width = b.width || dims.width;
          const height = b.height || dims.height;
          return canvasX >= b.x && canvasX <= b.x + width && canvasY >= b.y && canvasY <= b.y + height;
        });

        // If none directly under cursor, pick nearest block center
        if (!target) {
          let best: { dist: number; block: typeof blocks[0] | null } = { dist: Infinity, block: null };
          for (const b of blocksInGroup) {
            const dims = getBlockDimensions(b.type as BlockType, view.scale);
            const width = b.width || dims.width;
            const height = b.height || dims.height;
            const cx = b.x + width / 2;
            const cy = b.y + height / 2;
            const d = (canvasX - cx) ** 2 + (canvasY - cy) ** 2;
            if (d < best.dist) best = { dist: d, block: b };
          }
          target = best.block || undefined;
        }

        if (target) {
          selectBlock(target.id, e.ctrlKey || e.metaKey);
          return;
        }
      }

      // If no blocks were selected, fallback to selecting the group
      selectGroup(clickedGroup.id);
      return;
    }

    // Default background click: clear selections
    selectBlock(null);
    selectGroup(null);
    selectConnection(null);
  }, [view, groups, blocks, selectBlock, selectGroup, selectConnection, selectionPriority]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          useStore.temporal.getState().redo();
        } else {
          useStore.temporal.getState().undo();
        }
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        // Don't delete if user is typing in an input
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          return;
        }

        if (selectedId) {
          deleteBlock(selectedId);
        } else if (selectedGroupId) {
          deleteGroup(selectedGroupId);
        } else if (selectedConnectionId) {
          deleteConnection(selectedConnectionId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedGroupId, selectedConnectionId, deleteBlock, deleteGroup, deleteConnection]);

  // Helper to check if a block is inside a collapsed group
  const isBlockHidden = (block: Block) => {
    const dims = getBlockDimensions(block.type, 1);
    const width = block.width || dims.width;
    const height = block.height || dims.height;
    const bCenterX = block.x + width / 2;
    const bCenterY = block.y + height / 2;

    return groups.some(g => {
      if (!g.collapsed) return false;
      return (
        bCenterX >= g.x &&
        bCenterX <= g.x + g.width &&
        bCenterY >= g.y &&
        bCenterY <= g.y + g.height
      );
    });
  };

  return (
    <div className="flex h-screen w-screen bg-kitchen-bg text-white overflow-hidden font-sans selection:bg-kitchen-accent/30">
      <Sidebar />

      <div
        className="flex-1 flex flex-col h-full relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleBoardMouseUp}
        onMouseDown={handleMouseDown}
      >
        <Board
          onClick={handleBoardClick}
          view={view}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleBoardMouseUp}
          onWheel={handleWheel}
        >
          {groups.map(group => (
            <Group
              key={group.id}
              group={group}
              scale={view.scale}
            />
          ))}
          <ConnectionsLayer />
          {blocks.filter(block => !isBlockHidden(block)).map(block => (
            <BlockComponent
              key={block.id}
              block={block}
              scale={view.scale}
            />
          ))}
        </Board>
        {/* ExecutionLayer outside Board for screen-space rendering */}
        <ExecutionLayer />

        <BottomBar />
        <ContextPanel />
      </div>
    </div>
  );
}

export default App;
