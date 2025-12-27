# State Management

> **Implementation:** `src/store/useStore.ts`, `src/store/useExecutionStore.ts`

---

## Overview

AI Kitchen uses Zustand for state management with two separate stores:

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `useStore` | Application data (blocks, connections, groups) | ✅ localStorage |
| `useExecutionStore` | Simulation state (packets, phases) | ❌ None |

---

## useStore

Main application state with undo/redo and persistence.

### State Shape

```typescript
interface AppState {
  // Data
  blocks: Block[];
  connections: Connection[];
  groups: Group[];
  
  // Selection
  selectedIds: string[];
  
  // View
  view: {
    x: number;
    y: number;
    scale: number;
  };
  
  // Connection drafting
  connectionDraft: {
    fromId: string;
    toPoint: { x: number; y: number };
  } | null;
}
```

### Middleware Stack

```typescript
const useStore = create<AppState>()(
  temporal(           // zundo - undo/redo
    persist(          // zustand/middleware - localStorage
      (set, get) => ({
        // state and actions
      }),
      {
        name: 'ai-kitchen-storage',
        partialize: (state) => ({
          blocks: state.blocks,
          connections: state.connections,
          groups: state.groups,
          view: state.view,
        }),
      }
    ),
    {
      limit: 50,  // max undo steps
    }
  )
);
```

### Key Actions

#### Block Operations

```typescript
// Add new block at canvas center
addBlock: (type: BlockType) => {
  const { view } = get();
  const block: Block = {
    id: crypto.randomUUID(),
    type,
    title: getDefaultTitle(type),
    description: '',
    x: -view.x + window.innerWidth / 2 - 100,
    y: -view.y + window.innerHeight / 2 - 50,
  };
  set({ blocks: [...get().blocks, block] });
}

// Update block properties
updateBlock: (id: string, updates: Partial<Block>) => {
  set({
    blocks: get().blocks.map(b =>
      b.id === id ? { ...b, ...updates } : b
    ),
  });
}

// Move block position
moveBlock: (id: string, x: number, y: number) => {
  set({
    blocks: get().blocks.map(b =>
      b.id === id ? { ...b, x, y } : b
    ),
  });
}

// Delete block and its connections
deleteBlock: (id: string) => {
  set({
    blocks: get().blocks.filter(b => b.id !== id),
    connections: get().connections.filter(
      c => c.fromId !== id && c.toId !== id
    ),
    selectedIds: get().selectedIds.filter(sid => sid !== id),
  });
}
```

#### Connection Operations

```typescript
// Create new connection
addConnection: (fromId: string, toId: string, type?: ConnectionType) => {
  // Prevent duplicates
  const exists = get().connections.some(
    c => c.fromId === fromId && c.toId === toId
  );
  if (exists) return;
  
  const connection: Connection = {
    id: crypto.randomUUID(),
    fromId,
    toId,
    type: type || 'default',
  };
  set({ connections: [...get().connections, connection] });
}

// Delete connection
deleteConnection: (id: string) => {
  set({
    connections: get().connections.filter(c => c.id !== id),
    selectedIds: get().selectedIds.filter(sid => sid !== id),
  });
}
```

#### Selection Operations

```typescript
// Set selected IDs (replace)
setSelectedIds: (ids: string[]) => {
  set({ selectedIds: ids });
}

// Toggle selection (add/remove)
toggleSelect: (id: string) => {
  const { selectedIds } = get();
  if (selectedIds.includes(id)) {
    set({ selectedIds: selectedIds.filter(sid => sid !== id) });
  } else {
    set({ selectedIds: [...selectedIds, id] });
  }
}

// Clear selection
clearSelection: () => {
  set({ selectedIds: [] });
}
```

#### Group Operations

```typescript
// Create group from selected blocks
createGroup: () => {
  const { selectedIds, blocks } = get();
  const selectedBlocks = blocks.filter(b => selectedIds.includes(b.id));
  
  if (selectedBlocks.length < 2) return;
  
  // Calculate bounding box
  const bounds = calculateBounds(selectedBlocks);
  
  const group: Group = {
    id: crypto.randomUUID(),
    title: 'New Group',
    x: bounds.x - 20,
    y: bounds.y - 40,
    width: bounds.width + 40,
    height: bounds.height + 60,
    color: 'blue',
    collapsed: false,
  };
  
  set({
    groups: [...get().groups, group],
    selectedIds: [group.id],
  });
}

// Collapse/expand group
toggleGroupCollapse: (groupId: string) => {
  set({
    groups: get().groups.map(g =>
      g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
    ),
  });
}
```

#### View Operations

```typescript
// Set view transform
setView: (updates: Partial<View>) => {
  set({ view: { ...get().view, ...updates } });
}

// Zoom to fit content
fitToContent: () => {
  const { blocks, groups } = get();
  if (blocks.length === 0 && groups.length === 0) return;
  
  const bounds = calculateAllBounds(blocks, groups);
  const scale = Math.min(
    window.innerWidth / bounds.width,
    window.innerHeight / bounds.height,
    1
  ) * 0.9;
  
  set({
    view: {
      x: -bounds.centerX + window.innerWidth / 2,
      y: -bounds.centerY + window.innerHeight / 2,
      scale,
    },
  });
}
```

#### History Operations

```typescript
// Access temporal store for undo/redo
const { undo, redo, pastStates, futureStates } = useStore.temporal.getState();

// Check if can undo/redo
const canUndo = pastStates.length > 0;
const canRedo = futureStates.length > 0;
```

---

## useExecutionStore

Simulation state for visual feedback during execution.

### State Shape

```typescript
interface ExecutionState {
  // Core state
  isRunning: boolean;
  simulationMode: boolean;
  executionSpeed: number;
  
  // Active elements
  activeNodeIds: string[];
  dataPackets: DataPacket[];
  
  // Agent states
  agentPhases: Map<string, AgentPhase>;
  collectingProgress: Map<string, CollectingProgress>;
  
  // Block visual states
  contextStates: Map<string, ContextBlockState>;
  inputStates: Map<string, InputBlockState>;
  dishStates: Map<string, DishBlockState>;
}
```

### Key Actions

```typescript
// Toggle simulation
setSimulationMode: (enabled: boolean) => {
  set({ simulationMode: enabled, isRunning: enabled });
  
  if (enabled) {
    executionEngine.start();
  } else {
    executionEngine.stop();
    // Reset all states
    set({
      dataPackets: [],
      agentPhases: new Map(),
      contextStates: new Map(),
      inputStates: new Map(),
      dishStates: new Map(),
      collectingProgress: new Map(),
    });
  }
}

// Set execution speed
setExecutionSpeed: (speed: number) => {
  set({ executionSpeed: Math.max(0.25, Math.min(4, speed)) });
}

// Set agent phase
setAgentPhase: (agentId: string, phase: AgentPhase) => {
  const phases = new Map(get().agentPhases);
  phases.set(agentId, phase);
  set({ agentPhases: phases });
}

// Set collecting progress
setCollectingProgress: (agentId: string, received: number, total: number) => {
  const progress = new Map(get().collectingProgress);
  progress.set(agentId, { received, total });
  set({ collectingProgress: progress });
}
```

---

## Patterns

### Selective Subscriptions

Use `useShallow` to prevent unnecessary re-renders:

```typescript
import { useShallow } from 'zustand/shallow';

// ❌ Bad - re-renders on ANY state change
const state = useStore();

// ✅ Good - re-renders only when blocks change
const blocks = useStore(useShallow(state => state.blocks));

// ✅ Good - re-renders only when specific values change
const { blocks, connections } = useStore(
  useShallow(state => ({
    blocks: state.blocks,
    connections: state.connections,
  }))
);
```

### Transient Updates

For high-frequency updates (like dragging), avoid store updates:

```typescript
// During drag - update DOM directly
const handleDrag = (e: DragEvent, data: DraggableData) => {
  // Direct DOM manipulation
  elementRef.current.style.transform = `translate(${data.x}px, ${data.y}px)`;
};

// On drag end - commit to store
const handleDragEnd = (e: DragEvent, data: DraggableData) => {
  moveBlock(block.id, data.x, data.y);
};
```

### Derived State

Compute derived state in components, not store:

```typescript
// In component
const selectedBlocks = useMemo(() => {
  return blocks.filter(b => selectedIds.includes(b.id));
}, [blocks, selectedIds]);

// Or use a selector
const selectedBlocks = useStore(
  useShallow(state => 
    state.blocks.filter(b => state.selectedIds.includes(b.id))
  )
);
```

### Maps in State

For Map-based state (like agentPhases), create new Maps on update:

```typescript
// ✅ Correct - create new Map
setAgentPhase: (agentId, phase) => {
  const phases = new Map(get().agentPhases);
  phases.set(agentId, phase);
  set({ agentPhases: phases });
}

// ❌ Wrong - mutating existing Map
setAgentPhase: (agentId, phase) => {
  get().agentPhases.set(agentId, phase);  // Won't trigger re-render!
}
```

---

## Persistence

### localStorage Structure

```typescript
// Key: 'ai-kitchen-storage'
{
  state: {
    blocks: Block[],
    connections: Connection[],
    groups: Group[],
    view: { x, y, scale },
  },
  version: 0,
}
```

### Migration

Handle version changes with migration:

```typescript
persist(
  // ... state
  {
    name: 'ai-kitchen-storage',
    version: 1,
    migrate: (persisted, version) => {
      if (version === 0) {
        // Migrate from v0 to v1
        return {
          ...persisted,
          // Add new fields with defaults
        };
      }
      return persisted;
    },
  }
)
```

---

## Testing

### Mocking Store

```typescript
import { create } from 'zustand';

// Create test store with initial state
const createTestStore = (initialState = {}) => 
  create(() => ({
    blocks: [],
    connections: [],
    ...initialState,
  }));

// In tests
const store = createTestStore({ blocks: [mockBlock] });
```

### Reset Between Tests

```typescript
beforeEach(() => {
  useStore.setState({
    blocks: [],
    connections: [],
    groups: [],
    selectedIds: [],
    view: { x: 0, y: 0, scale: 1 },
  });
});
```

---

## See Also

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Overall architecture
- [EXECUTION_ENGINE.md](EXECUTION_ENGINE.md) - Engine details
- [COMPONENTS.md](COMPONENTS.md) - Component API
