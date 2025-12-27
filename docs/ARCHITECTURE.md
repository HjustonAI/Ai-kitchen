# Architecture

Technical architecture documentation for AI Kitchen.

---

## Overview

AI Kitchen is a visual node-based editor for designing AI agent workflows. The application follows a **unidirectional data flow** pattern with centralized state management.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Application                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌──────────────────────────┐  ┌──────────────┐   │
│  │ Sidebar │  │         Board            │  │ ContextPanel │   │
│  │  280px  │  │    (Infinite Canvas)     │  │    320px     │   │
│  │  fixed  │  │       flex-1             │  │  slide-in    │   │
│  │         │  │                          │  │              │   │
│  │ ┌─────┐ │  │  ┌────────────────────┐  │  │              │   │
│  │ │Blocks│ │  │  │ ConnectionsLayer  │  │  │              │   │
│  │ └─────┘ │  │  │      (SVG)         │  │  │              │   │
│  │         │  │  └────────────────────┘  │  │              │   │
│  │ ┌─────┐ │  │  ┌────────────────────┐  │  │              │   │
│  │ │Exec │ │  │  │ Blocks & Groups    │  │  │              │   │
│  │ │Stats│ │  │  │      (DOM)         │  │  │              │   │
│  │ └─────┘ │  │  └────────────────────┘  │  │              │   │
│  │         │  │  ┌────────────────────┐  │  │              │   │
│  │ ┌─────┐ │  │  │ ExecutionLayer     │  │  │              │   │
│  │ │Tools│ │  │  │   (Particles)      │  │  │              │   │
│  │ └─────┘ │  │  └────────────────────┘  │  │              │   │
│  └─────────┘  └──────────────────────────┘  └──────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                        BottomBar (fixed)                         │
│              [Play/Pause] [Speed Slider] [Shortcuts]             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### Blocks
The fundamental unit of the workflow. Each block represents a component in an AI system.

```typescript
type BlockType = 'chef' | 'ingredients' | 'dish' | 'note' | 'context_file' | 'input_file';

interface Block {
  id: string;
  type: BlockType;
  title: string;
  description: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  data?: BlockData;
}
```

| Type | Role | Execution Behavior |
|------|------|-------------------|
| `chef` | AI Agent / LLM | Receives inputs → processes → sends outputs |
| `ingredients` | Raw data | Static data source |
| `context_file` | Reference docs | Responds to query packets |
| `input_file` | User inputs | Initiates data flow (sends packets) |
| `dish` | Output | Receives final results |
| `note` | Annotation | No execution behavior |

### Connections
Links between blocks that define data flow.

```typescript
interface Connection {
  id: string;
  fromId: string;
  toId: string;
  type: 'default' | 'flow' | 'sync';
  label?: string;
}
```

### Groups
Containers that can hold multiple blocks and collapse into a single node.

```typescript
interface Group {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  collapsed?: boolean;
}
```

When collapsed, connections to internal blocks are automatically rerouted to the group boundary.

### View
Canvas transformation state.

```typescript
interface View {
  x: number;      // Pan offset X
  y: number;      // Pan offset Y
  scale: number;  // Zoom level (0.1 - 2.0)
}
```

---

## State Management

### Store Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Zustand Stores                           │
├─────────────────────────────┬────────────────────────────────┤
│        useStore             │      useExecutionStore          │
│    (Application State)      │     (Simulation State)          │
├─────────────────────────────┼────────────────────────────────┤
│ • blocks[]                  │ • isRunning                     │
│ • connections[]             │ • simulationMode                │
│ • groups[]                  │ • executionSpeed                │
│ • selectedIds[]             │ • dataPackets[]                 │
│ • view { x, y, scale }      │ • agentPhases Map               │
│ • connectionDraft           │ • contextStates Map             │
│                             │ • inputStates Map               │
│ Middleware:                 │ • dishStates Map                │
│ • zundo (undo/redo)         │ • collectingProgress Map        │
│ • persist (localStorage)    │                                 │
└─────────────────────────────┴────────────────────────────────┘
```

### useStore (`src/store/useStore.ts`)

Main application state with persistence.

**Key Actions:**
```typescript
// Block operations
addBlock(type: BlockType): void
updateBlock(id: string, updates: Partial<Block>): void
deleteBlock(id: string): void
moveBlock(id: string, x: number, y: number): void

// Connection operations
addConnection(fromId: string, toId: string): void
deleteConnection(id: string): void

// Selection
setSelectedIds(ids: string[]): void
toggleSelect(id: string): void

// View
setView(view: Partial<View>): void
zoomIn(): void
zoomOut(): void
fitToContent(): void

// Grouping
createGroup(): void
ungroup(groupId: string): void
collapseGroup(groupId: string): void
expandGroup(groupId: string): void

// History
undo(): void
redo(): void
```

**Persistence:**
- Key: `ai-kitchen-storage`
- Stored: `blocks`, `connections`, `groups`, `view`
- Auto-saves on every change

### useExecutionStore (`src/store/useExecutionStore.ts`)

Simulation state (not persisted).

**Key Actions:**
```typescript
setSimulationMode(enabled: boolean): void
setExecutionSpeed(speed: number): void
setAgentPhase(agentId: string, phase: AgentPhase): void
setContextState(blockId: string, state: ContextBlockState): void
setInputState(blockId: string, state: InputBlockState): void
setDishState(blockId: string, state: DishBlockState): void
setCollectingProgress(agentId: string, received: number, total: number): void
```

---

## Component Hierarchy

```
App.tsx
├── Sidebar.tsx
│   ├── Logo & Title
│   ├── BlockPalette (scrollable)
│   │   └── BlockTypeButton (x6)
│   ├── SidebarExecutionSection.tsx (conditional)
│   │   ├── PacketIndicators
│   │   ├── AgentStates
│   │   └── MiniLog
│   └── ExportTools
│
├── Board.tsx
│   ├── Background (grid pattern)
│   ├── ConnectionsLayer.tsx (SVG)
│   │   └── Connection paths with glow
│   ├── Group.tsx (x N)
│   │   └── GroupHeader
│   ├── Block.tsx (x N)
│   │   ├── BlockHeader
│   │   ├── BlockContent
│   │   └── AnchorPoints
│   └── ExecutionLayer.tsx
│       └── DataPacket (x N)
│
├── ContextPanel.tsx (slide-in)
│   └── PropertiesEditor
│
└── BottomBar.tsx
    ├── PlayPauseButton
    ├── SpeedSlider
    ├── SpeedPresets
    └── ShortcutsHint
```

---

## Rendering Layers

The canvas uses layered rendering for performance and visual separation:

```
z-index: 3  ┌─────────────────────────────┐
            │    ExecutionLayer           │  Animated packets
            │    (Canvas/SVG overlay)     │
z-index: 2  ├─────────────────────────────┤
            │    Blocks & Groups          │  DOM elements
            │    (Draggable components)   │
z-index: 1  ├─────────────────────────────┤
            │    ConnectionsLayer         │  SVG paths
            │    (SVG element)            │
z-index: 0  ├─────────────────────────────┤
            │    Background               │  Grid pattern
            │    (CSS background)         │
            └─────────────────────────────┘
```

---

## Event Flow

### User Interactions

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ User Action  │───>│  Component   │───>│    Store     │
│ (click/drag) │    │  Handler     │    │   Action     │
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
                                               ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Render     │<───│  Subscribers │<───│ State Update │
│   Update     │    │  (useShallow)│    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Execution Simulation

```
┌────────────────┐
│ User: Play     │
└───────┬────────┘
        │
        ▼
┌────────────────┐     ┌─────────────────────┐
│ setSimulation  │────>│  ExecutionEngine    │
│ Mode(true)     │     │  .start()           │
└────────────────┘     └──────────┬──────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐    ┌────────────────────┐    ┌────────────────┐
│ Input blocks  │    │ Create packets     │    │ Set agent      │
│ start sending │    │ on connections     │    │ phases         │
└───────────────┘    └────────────────────┘    └────────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Animation Loop (RAF)    │
                    │ - Update packet progress│
                    │ - Trigger arrivals      │
                    │ - Update visual states  │
                    └─────────────────────────┘
```

---

## Performance Patterns

### React Optimization

```typescript
// Use React.memo for expensive components
const Block = React.memo(function Block({ block, ... }) {
  // ...
});

// Use useShallow for selective store subscriptions
const blocks = useStore(useShallow(state => state.blocks));

// Avoid inline object/function creation in render
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

### CSS Optimization

```css
/* Promote animated elements to GPU layers */
.animated-element {
  will-change: transform;
}

/* Reduce blur during drag for performance */
.dragging .glassmorphism {
  backdrop-filter: none;
}
```

### State Batching

```typescript
// Batch multiple state updates
const moveMultipleBlocks = (updates: Array<{id: string, x: number, y: number}>) => {
  set(state => ({
    blocks: state.blocks.map(block => {
      const update = updates.find(u => u.id === block.id);
      return update ? { ...block, x: update.x, y: update.y } : block;
    })
  }));
};
```

---

## File Structure

```
src/
├── components/
│   ├── Board.tsx                 # Main canvas
│   ├── Block.tsx                 # Node component
│   ├── Group.tsx                 # Group container
│   ├── ConnectionsLayer.tsx      # SVG connections
│   ├── ExecutionLayer.tsx        # Packet animations
│   ├── ExecutionLayerOptimized.tsx # Optimized version
│   ├── Sidebar.tsx               # Left panel
│   ├── SidebarExecutionSection.tsx # Execution stats
│   ├── ContextPanel.tsx          # Right panel
│   ├── BottomBar.tsx             # Execution controls
│   ├── ExecutionMonitor.tsx      # Detailed monitoring
│   ├── ExecutionLog.tsx          # Event log
│   └── blocks/                   # Block type variants
│
├── store/
│   ├── useStore.ts               # Main state
│   └── useExecutionStore.ts      # Simulation state
│
├── lib/
│   ├── executionEngineV2.ts      # Simulation engine
│   ├── graphUtils.ts             # Path calculations
│   ├── layoutUtils.ts            # Auto-layout
│   ├── animationUtils.ts         # Animation helpers
│   ├── particleSystem.ts         # Particle effects
│   └── utils.ts                  # General utilities
│
├── types.ts                      # TypeScript definitions
├── App.tsx                       # Root component
├── main.tsx                      # Entry point
└── index.css                     # Global styles
```

---

## See Also

- [FEATURES.md](FEATURES.md) - Feature documentation
- [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) - Implementation progress
- [technical/EXECUTION_ENGINE.md](technical/EXECUTION_ENGINE.md) - Engine details
- [technical/STATE_MANAGEMENT.md](technical/STATE_MANAGEMENT.md) - Store patterns
