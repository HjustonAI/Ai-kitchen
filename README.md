# 🍳 AI Kitchen – Visual AI Workflow Editor

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19"/>
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-7-purple?logo=vite" alt="Vite"/>
  <img src="https://img.shields.io/badge/Tailwind-3.4-cyan?logo=tailwindcss" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Zustand-5-orange" alt="Zustand"/>
</p>

A visual node-based editor for designing and simulating AI agent workflows. Plan complex multi-agent systems with an intuitive drag-and-drop interface, then watch them execute with beautiful animated visualizations.

---

## ✨ Features

### 🎨 Visual Canvas
- **Infinite Canvas** – Pan and zoom to organize any scale of system
- **Smart Connections** – Auto-routing lines that adapt to block positions
- **Fractal Groups** – Collapse subsystems into single nodes, connections auto-reroute
- **Glassmorphism UI** – Premium dark theme with blur effects and neon accents

### 🤖 Block Types
| Type | Icon | Purpose |
|------|------|---------|
| **Chef** | 👨‍🍳 | AI Agent / LLM processor |
| **Ingredients** | 🥕 | Raw data / Resources |
| **Context File** | 📄 | Static reference documents |
| **Input File** | 📥 | Dynamic user inputs |
| **Dish** | 🍽️ | Output / Results |
| **Note** | 📝 | Comments & annotations |

### ⚡ Execution Simulation
- **Animated Data Flow** – Watch packets travel through your workflow
- **Agent States** – Visual feedback showing collecting → processing → outputting
- **Speed Control** – Adjust simulation speed (0.25x to 4x)
- **Connection Glow** – Active connections highlight during data transfer
- **Real-time Monitoring** – Track packets and agent states in sidebar

### 🎮 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| **Simulation** | |
| Play / Pause | `Shift + Space` |
| Speed Up | `+` or `=` |
| Speed Down | `-` |
| Slow (0.5x) | `1` |
| Normal (1x) | `2` |
| Fast (2x) | `3` |
| **Editing** | |
| Delete Selection | `Delete` / `Backspace` |
| Undo | `Ctrl + Z` |
| Redo | `Ctrl + Y` / `Ctrl + Shift + Z` |
| Group Selection | `Ctrl + G` |
| Ungroup | `Ctrl + Shift + G` |
| **Canvas** | |
| Pan | `Space` + Drag / Middle Mouse |
| Zoom | Scroll Wheel |

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
open http://localhost:5173
```

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🏗️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Core** | React 19, TypeScript 5.9, Vite 7 |
| **State** | Zustand 5, Zundo (undo/redo), localStorage persistence |
| **Styling** | Tailwind CSS 3.4, clsx, tailwind-merge |
| **Animation** | Framer Motion 12 |
| **Canvas** | react-draggable, react-rnd, SVG connections |
| **Layout** | dagre (auto-layout algorithm) |
| **Icons** | Lucide React |
| **Testing** | Vitest, Testing Library |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Board.tsx              # Main canvas with pan/zoom
│   ├── Block.tsx              # Individual node component
│   ├── Group.tsx              # Collapsible group container
│   ├── ConnectionsLayer.tsx   # SVG connection rendering
│   ├── ExecutionLayer.tsx     # Packet animation layer
│   ├── Sidebar.tsx            # Left panel with tools
│   ├── ContextPanel.tsx       # Right panel for properties
│   ├── BottomBar.tsx          # Execution controls
│   └── blocks/                # Block type variants
├── store/
│   ├── useStore.ts            # Main application state
│   └── useExecutionStore.ts   # Simulation state
├── lib/
│   ├── executionEngineV2.ts   # Event-driven simulation engine
│   ├── graphUtils.ts          # Connection path calculations
│   └── layoutUtils.ts         # Auto-layout algorithms
└── types.ts                   # TypeScript definitions
```

---

## 🤖 LLM Integration

Generate workflow schemas using AI and import them directly:

**Example Prompt:**
> Analyze this multi-agent system and generate a JSON schema for AI Kitchen import.

**JSON Schema:**
```json
{
  "blocks": [
    {
      "id": "agent-1",
      "type": "chef",
      "title": "Research Agent",
      "description": "Gathers information from sources",
      "x": 100, "y": 100
    },
    {
      "id": "data-1", 
      "type": "input_file",
      "title": "User Query",
      "description": "Initial user request",
      "x": 100, "y": 250
    }
  ],
  "connections": [
    {
      "id": "conn-1",
      "fromId": "data-1",
      "toId": "agent-1",
      "type": "flow"
    }
  ],
  "groups": []
}
```

**Block Types:**
- `chef` – AI Agent / LLM processor
- `ingredients` – Raw data / general resources  
- `context_file` – Static reference documents
- `input_file` – Dynamic user inputs
- `dish` – Output / Results
- `note` – Comments

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [VISION.md](VISION.md) | Long-term vision and design philosophy |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture deep-dive |
| [docs/FEATURES.md](docs/FEATURES.md) | Complete feature documentation |
| [docs/DEVELOPMENT_STATUS.md](docs/DEVELOPMENT_STATUS.md) | Implementation progress |
| [docs/technical/](docs/technical/) | Technical specifications |

---

## 🛠️ Development

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Run tests
npm test
```

### Key Patterns
- **State Management**: All mutations go through Zustand stores
- **IDs**: Use `crypto.randomUUID()` for unique identifiers
- **Coordinates**: Calculate positions relative to current view center
- **Performance**: Use `React.memo` and `useShallow` for optimization

---

## 📄 License

MIT © 2025

---

<p align="center">
  Built with ❤️ for AI system designers
</p>
