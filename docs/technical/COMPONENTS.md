# Components Reference

API reference for AI Kitchen React components.

---

## Layout Components

### App.tsx

Root component that composes the application layout.

```tsx
<App>
  <Sidebar />
  <Board />
  <ExecutionLayer />
  <BottomBar />
  <ContextPanel />
</App>
```

---

### Board.tsx

Main canvas component handling pan/zoom and block rendering.

**Props:** None (uses store)

**Store Dependencies:**
- `blocks`, `connections`, `groups`
- `selectedIds`
- `view`

**Features:**
- Infinite canvas with pan (Space + drag)
- Zoom (scroll wheel)
- Selection box (Shift + drag)
- Background grid pattern
- Keyboard shortcuts

**Events:**
- `onMouseDown` - Start pan/selection
- `onMouseMove` - Update pan/selection
- `onMouseUp` - End pan/selection
- `onWheel` - Zoom
- `onKeyDown` - Shortcuts

---

### Sidebar.tsx

Left panel with block palette and tools.

**Props:** None

**Store Dependencies:**
- `addBlock`
- `simulationMode` (from useExecutionStore)

**Structure:**
```
┌─────────────────┐
│ Logo & Title    │  ← Fixed header
├─────────────────┤
│ Block Palette   │  ← Scrollable
│ - Chef          │
│ - Ingredients   │
│ - Context File  │
│ - Input File    │
│ - Dish          │
│ - Note          │
├─────────────────┤
│ Execution Stats │  ← When running
├─────────────────┤
│ Export/Import   │  ← Fixed footer
└─────────────────┘
```

---

### SidebarExecutionSection.tsx

Compact execution monitoring panel for sidebar.

**Props:** None

**Store Dependencies:**
- `dataPackets`
- `agentPhases`
- `executionSpeed`

**Features:**
- Packet count by type
- Agent phase indicators
- Mini event log
- Collapsible sections

---

### ContextPanel.tsx

Right slide-in panel for block properties.

**Props:** None

**Store Dependencies:**
- `selectedIds`
- `blocks`
- `updateBlock`

**Behavior:**
- Slides in when block selected
- Slides out when deselected
- Shows different fields per block type

---

### BottomBar.tsx

Fixed bottom bar with execution controls.

**Props:** None

**Store Dependencies:**
- `simulationMode`, `setSimulationMode`
- `executionSpeed`, `setExecutionSpeed`

**Structure:**
```
┌──────────────────────────────────────────────────┐
│ [▶/⏸] │ [====●====] │ [1] [2] [3] │ Shortcuts   │
│ Play   │ Speed       │ Presets     │ Hint        │
└──────────────────────────────────────────────────┘
```

---

## Canvas Components

### Block.tsx

Individual node component.

**Props:**
```typescript
interface BlockProps {
  block: Block;
  isSelected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onMove: (id: string, x: number, y: number) => void;
}
```

**Store Dependencies:**
- `agentPhases` (from useExecutionStore)
- `collectingProgress`
- `contextStates`, `inputStates`, `dishStates`

**Features:**
- Drag to move (react-draggable)
- Resize handles (react-rnd)
- Anchor points for connections
- Visual state feedback during execution

**Sub-components:**
- `BlockHeader` - Icon, title, type badge
- `BlockContent` - Description, properties
- `AnchorPoints` - Connection handles

---

### Group.tsx

Collapsible group container.

**Props:**
```typescript
interface GroupProps {
  group: Group;
  blocks: Block[];
  isSelected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onToggleCollapse: (id: string) => void;
}
```

**Features:**
- Collapse/expand toggle
- Color customization
- Resize handles
- Connection rerouting when collapsed

---

### ConnectionsLayer.tsx

SVG layer for rendering connections.

**Props:** None

**Store Dependencies:**
- `connections`
- `blocks`
- `groups`
- `dataPackets` (from useExecutionStore)

**Features:**
- Curved bezier paths
- Auto-anchor positioning
- Glow effects during execution
- Label rendering

**Path Calculation:**
```typescript
function calculatePath(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} 
          C ${midX} ${from.y}, 
            ${midX} ${to.y}, 
            ${to.x} ${to.y}`;
}
```

---

### ExecutionLayer.tsx

Animated packet visualization layer.

**Props:** None

**Store Dependencies:**
- `dataPackets`
- `connections`
- `blocks`

**Features:**
- Packet animation along paths
- Color-coded by packet type
- Progress-based positioning
- Particle effects

**Animation:**
```typescript
// Packet position along bezier curve
function getPositionOnPath(
  path: SVGPathElement, 
  progress: number
): Point {
  const length = path.getTotalLength();
  return path.getPointAtLength(length * progress);
}
```

---

## Monitoring Components

### ExecutionMonitor.tsx

Detailed execution state viewer.

**Props:** None

**Store Dependencies:**
- `dataPackets`
- `agentPhases`
- `collectingProgress`

**Sections:**
- Active packets table
- Agent states list
- Connection activity

---

### ExecutionLog.tsx

Event history log.

**Usage:**
```typescript
// Add event
ExecutionLogManager.addEvent('packet_created', { 
  packetId, 
  type, 
  connectionId 
});

// Get events
const events = ExecutionLogManager.getEvents();

// Clear
ExecutionLogManager.clear();
```

**Event Types:**
- `simulation_start`
- `simulation_stop`
- `packet_created`
- `packet_arrived`
- `agent_phase_change`

---

## Block Type Components

Located in `src/components/blocks/`

### ChefBlock.tsx

AI Agent block variant.

**Additional Props:**
- `model?: string`
- `temperature?: number`
- `maxTokens?: number`

**Visual States:**
- Idle: Gray border
- Collecting: Blue pulse + progress
- Processing: Spinning animation
- Outputting: Purple glow

---

### ContextFileBlock.tsx

Static reference document block.

**Additional Props:**
- `filePath?: string`
- `content?: string`

**Visual States:**
- Idle: Normal
- Receiving: Blue highlight
- Processing: Spinning
- Sending: Green glow

---

### InputFileBlock.tsx

Dynamic user input block.

**Additional Props:**
- `filePath?: string`
- `isExternal?: boolean`

**Visual States:**
- Idle: Normal
- Sending: Blue pulse

---

### DishBlock.tsx

Output result block.

**Additional Props:**
- `outputFormat?: 'markdown' | 'json' | 'text' | 'file'`
- `savePath?: string`

**Visual States:**
- Idle: Normal
- Receiving: Purple highlight
- Complete: Success glow

---

### IngredientsBlock.tsx

Raw data resource block.

**Visual:** Orange accent, ingredient icon

---

### NoteBlock.tsx

Annotation block.

**Visual:** Yellow accent, sticky note style

---

## Utility Components

### SpeedSlider.tsx

Speed control slider with presets.

**Props:**
```typescript
interface SpeedSliderProps {
  value: number;
  onChange: (speed: number) => void;
  min?: number;  // default: 0.25
  max?: number;  // default: 4
}
```

---

### AnchorPoint.tsx

Connection anchor handle.

**Props:**
```typescript
interface AnchorPointProps {
  position: 'left' | 'right' | 'top' | 'bottom';
  blockId: string;
  onDragStart: (blockId: string, position: string) => void;
  onDrop: (blockId: string, position: string) => void;
}
```

---

## Styling Patterns

### Glassmorphism

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
```

### Selection Glow

```css
.block.selected {
  box-shadow: 
    0 0 0 2px rgba(0, 212, 255, 0.5),
    0 0 20px rgba(0, 212, 255, 0.3);
}
```

### Animation Classes

```css
/* Pop-in animation */
.block-enter {
  animation: popIn 0.2s ease-out;
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Pulse animation */
.block.collecting {
  animation: pulse 1s ease-in-out infinite;
}
```

---

## See Also

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Overall architecture
- [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) - Store patterns
- [FEATURES.md](../FEATURES.md) - User features
