import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Board } from './components/Board';
import { BottomBar } from './components/BottomBar';
import { Block } from './components/Block';
import { Group } from './components/Group';
import { ConnectionsLayer } from './components/ConnectionsLayer';
import { PropertiesPanel } from './components/PropertiesPanel';
import { useStore } from './store/useStore';

function App() {
  // Global State
  const blocks = useStore((state) => state.blocks);
  const groups = useStore((state) => state.groups);
  const connections = useStore((state) => state.connections);
  const selectedId = useStore((state) => state.selectedId);
  const selectedGroupId = useStore((state) => state.selectedGroupId);
  const selectedConnectionId = useStore((state) => state.selectedConnectionId);
  const view = useStore((state) => state.view);
  const connectingSourceId = useStore((state) => state.connectingSourceId);
  const hoveredBlockId = useStore((state) => state.hoveredBlockId);

  // Actions
  const deleteBlock = useStore((state) => state.deleteBlock);
  const deleteGroup = useStore((state) => state.deleteGroup);
  const deleteConnection = useStore((state) => state.deleteConnection);
  const updateView = useStore((state) => state.updateView);
  const selectBlock = useStore((state) => state.selectBlock);
  const selectGroup = useStore((state) => state.selectGroup);
  const selectConnection = useStore((state) => state.selectConnection);
  const setConnectingSourceId = useStore((state) => state.setConnectingSourceId);
  const setTempConnectionPos = useStore((state) => state.setTempConnectionPos);
  const addConnection = useStore((state) => state.addConnection);

  // Local Interaction State
  const [prompt, setPrompt] = useState('');
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
      if (ctrlKey || metaKey) {
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
        // Pan with scroll wheel
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
          onClick={() => {
            selectBlock(null);
            selectGroup(null);
            selectConnection(null);
          }}
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
          {blocks.map(block => (
            <Block
              key={block.id}
              block={block}
              scale={view.scale}
            />
          ))}
        </Board>
        
        <BottomBar prompt={prompt} setPrompt={setPrompt} />
        <PropertiesPanel />
      </div>
    </div>
  );
}

export default App;
