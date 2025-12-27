# AI Kitchen Copilot Instructions

You are an expert React developer working on "AI Kitchen" (Gotuj z AI), a visual node-based editor for AI agent workflows with execution simulation.

## 🏗 Tech Stack
- **Core**: React 19, Vite 7, TypeScript 5.9
- **State**: Zustand 5 (with `zundo` for undo/redo, `persist` for localStorage)
- **Styling**: Tailwind CSS 3.4, Lucide React (icons), clsx, tailwind-merge
- **Animation**: Framer Motion 12
- **Canvas**: `react-draggable` (blocks), `react-rnd` (resizing), SVG (connections)
- **Graph Utils**: `dagre` (auto-layout)
- **Testing**: Vitest, Testing Library

## 🏛 Architecture & State

### Main Store (`src/store/useStore.ts`)
The application state is centralized here. **Single Source of Truth** - do not create local state for board data.

**Data Models** (`src/types.ts`):
- `Block`: Nodes on canvas (`chef`, `ingredients`, `dish`, `note`, `context_file`, `input_file`)
- `Connection`: Links between blocks (`fromId`, `toId`, `type`, `label`)
- `Group`: Container that can collapse/expand, containing other blocks
- `OutputFile`: File definition for AI Agent outputs (`id`, `filename`, `format`, `description`)
- `BlockData`: Type-specific properties including `outputs[]` for chefs and `outputFolder` for dishes

**View State**: `view` object with `x`, `y`, `scale` for pan/zoom.

**Persistence**: Auto-saved to `localStorage` key `ai-kitchen-storage`.

### Execution Store (`src/store/useExecutionStore.ts`)
Manages simulation/animation state:
- `isRunning`, `simulationMode`, `executionSpeed`
- `dataPackets[]` - Visual packets traveling on connections
- `agentPhases` - Map of agent states (idle/collecting/processing/outputting)
- `contextStates`, `inputStates`, `dishStates` - Block visual feedback

### Execution Engine (`src/lib/executionEngineV2.ts`)
Event-driven state machine for simulation:
- Manages packet creation, movement, and arrival
- Triggers agent phase transitions
- Handles connection activation for glow effects

## 🧩 Component Architecture

### Layout Structure
```
App.tsx
├── Sidebar (fixed left, 280px)
│   ├── Logo & title
│   ├── Block palette (scrollable)
│   ├── SidebarExecutionSection (when simulation active)
│   └── Export/Import tools
├── Board (main canvas, flex-1)
│   ├── Background grid
│   ├── ConnectionsLayer (SVG, z-index: 1)
│   ├── Blocks & Groups (DOM, z-index: 2)
│   └── ExecutionLayer (particles, z-index: 3)
├── ContextPanel (slide-in right, 320px)
│   └── Properties editor for selected block
└── BottomBar (fixed bottom)
    └── Simulation controls (play/pause, speed)
```

### Key Components
| Component | Purpose |
|-----------|---------|
| `Board.tsx` | Main canvas - pan/zoom, selection box, keyboard shortcuts |
| `Block.tsx` | Individual node - drag, select, anchor points |
| `Group.tsx` | Collapsible container with connection rerouting |
| `ConnectionsLayer.tsx` | SVG paths with glow effects during execution |
| `ExecutionLayer.tsx` | Animated packets traveling on connections |
| `Sidebar.tsx` | Left panel - block palette, execution section |
| `SidebarExecutionSection.tsx` | Compact execution monitor in sidebar |
| `ContextPanel.tsx` | Right slide-in panel for block properties |
| `BottomBar.tsx` | Play/pause, speed slider, keyboard shortcuts |
| `ExecutionMonitor.tsx` | Detailed packet and agent state viewer |
| `ExecutionLog.tsx` | Event history for debugging |

## 🎨 Design System

- **Theme**: Dark mode, premium aesthetic
- **Colors**: 
  - Background: `#0a0a0f` to `#1a1a2e`
  - Accents: Cyan (`#00d4ff`), Purple (`#8b5cf6`), Green (`#10b981`)
- **Glassmorphism**: `backdrop-blur-xl`, `bg-white/5`, subtle borders
- **Motion**: Framer Motion for pop-in, hover, pulse animations
- **Typography**: `Inter` (UI), `JetBrains Mono` (code/data)

## ⚡ Execution Simulation

### Packet Types
| Type | Color | Direction | Purpose |
|------|-------|-----------|---------|
| `input` | Blue | → Agent | Data from input_file blocks |
| `query` | Orange | Agent → Context | Agent requesting context |
| `response` | Green | Context → Agent | Context reply (reverse) |
| `output` | Purple | Agent → Dish | Final results |
| `handoff` | Cyan | Agent → Agent | Inter-agent communication |

### Agent Phases
1. `idle` - Waiting for input
2. `collecting` - Receiving packets (shows progress X/Y)
3. `processing` - Computing (animated spinner)
4. `outputting` - Sending results

### Connection Glow
Active connections get animated glow effect matching packet type color.

## 🎮 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Play/Pause Simulation | `Shift + Space` |
| Speed Up | `+` / `=` |
| Speed Down | `-` |
| Slow (0.5x) | `1` |
| Normal (1x) | `2` |
| Fast (2x) | `3` |
| Delete | `Delete` / `Backspace` |
| Undo | `Ctrl + Z` |
| Redo | `Ctrl + Y` / `Ctrl + Shift + Z` |
| Group | `Ctrl + G` |
| Ungroup | `Ctrl + Shift + G` |

## 🛠 Development Guidelines

1. **State Logic**: All mutations in store actions. Components only dispatch.
2. **IDs**: Use `crypto.randomUUID()` for unique identifiers.
3. **Coordinates**: Calculate positions relative to current `view` center.
4. **Type Safety**: Update `src/types.ts` when modifying data structures.
5. **Performance**: 
   - Use `React.memo` for expensive components
   - Use `useShallow` from Zustand for selective subscriptions
   - Use `will-change: transform` for animated elements
6. **Execution Store**: Always reset states when simulation stops.
7. **Panel System**: Sidebar is fixed, ContextPanel slides in, BottomBar is fixed.

## 🚀 Commands
```bash
npm run dev      # Start dev server
npm run build    # Type-check and build
npm run lint     # ESLint
npm test         # Run tests
npx tsc --noEmit # Type check only
```

## 📚 Documentation
- `README.md` - Project overview
- `VISION.md` - Long-term direction
- `docs/ARCHITECTURE.md` - Technical deep-dive
- `docs/FEATURES.md` - Feature documentation
- `docs/technical/` - Technical specifications
