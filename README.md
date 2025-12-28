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
| **Chef** | 👨‍🍳 | AI Agent / LLM processor with output files |
| **Ingredients** | 🥕 | Raw data / Resources |
| **Context File** | 📄 | Static reference documents |
| **Input File** | 📥 | Dynamic user inputs |
| **Dish** | 📁 | Output Folder / File collection |
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

Generate workflow schemas using AI and import them directly into AI Kitchen.

### Generation Prompt

Copy this prompt to your LLM to generate importable schemas:

<details>
<summary><b>📋 Click to expand full prompt</b></summary>

```
You are an AI system architect. Analyze the provided system description and generate a JSON schema for the "AI Kitchen" visual workflow editor.

## OUTPUT FORMAT

Generate valid JSON with this structure:

{
  "groups": [
    {
      "id": "unique-group-id",
      "title": "Group Name",
      "x": 0, "y": 0,
      "width": 800, "height": 400,
      "color": "blue|purple|green|orange|cyan|yellow|pink",
      "collapsed": false
    }
  ],
  "blocks": [
    {
      "id": "unique-block-id",
      "type": "chef|ingredients|context_file|input_file|dish|note",
      "title": "Block Title",
      "description": "What this block does",
      "x": 100, "y": 100,
      "width": 280,
      "height": 160,
      "data": {
        // Optional properties based on type
      }
    }
  ],
  "connections": [
    {
      "id": "unique-conn-id",
      "fromId": "source-block-id",
      "toId": "target-block-id",
      "type": "flow|default|sync",
      "label": "optional label"
    }
  ]
}

## BLOCK TYPES

| Type | Purpose | Execution Role |
|------|---------|----------------|
| `chef` | AI Agent / LLM | Processes inputs → produces output files |
| `input_file` | User inputs, variables | TRIGGERS workflow (sends first packets) |
| `context_file` | Reference docs, prompts | RESPONDS to agent queries |
| `ingredients` | Data sources, APIs | Static reference (no execution) |
| `dish` | Output folder / collection | COLLECTS output files from connected agents |
| `note` | Annotations | No execution, documentation only |

## BLOCK DATA PROPERTIES (optional)

For `chef` blocks:
- model: "gpt-4o", "claude-3", etc.
- temperature: 0.0-2.0
- maxTokens: number
- outputs: array of output files this agent produces
  - Each output: { id, filename, format, description }
  - Formats: "markdown", "json", "text", "yaml", "csv", "other"

For `context_file` / `input_file`:
- filePath: "path/to/file.md"
- content: "inline content if no file"
- isExternal: true/false

For `dish` (output folder):
- outputFolder: "campaigns/[DATE]_[NAME]/" (supports placeholders)
- Placeholders: [DATE], [NAME], [YYYY-MM]

## CONNECTION TYPES

| Type | Visual | Purpose |
|------|--------|---------|
| `flow` | Animated dashes | Main data flow (input→agent→output) |
| `default` | Solid line | Context reference (context→agent) |
| `sync` | Dotted line | Synchronization / dependencies |

## LAYOUT GUIDELINES

1. **Flow direction**: Left-to-right or top-to-bottom
2. **Spacing**: ~300px horizontal, ~200px vertical between blocks
3. **Groups**: Use to organize related blocks (scenarios, phases)
4. **Context files**: Place on left side, agents center, outputs right
5. **Notes**: Use as section headers above groups

## EXECUTION FLOW RULES

When simulating, the engine follows these rules:
1. `input_file` blocks START the flow (send packets to connected agents)
2. `chef` blocks RECEIVE inputs, may QUERY context files, then OUTPUT files
3. `context_file` blocks only RESPOND when queried by agents
4. `dish` blocks COLLECT output files from all connected agents

Connection direction matters:
- input_file → chef (input packet)
- context_file → chef (will be queried, response goes back)
- chef → chef (handoff packet)
- chef → dish (output packet - dish aggregates files from all connected chefs)

## IMPORTANT: Chef Output Files

Each chef/agent can define output files in its `data.outputs` array. These files are:
1. Displayed on the Chef block under "Output Files"
2. Automatically aggregated by connected Dish blocks
3. Shown in the Dish block's file collection

Always define meaningful output files for agents that produce deliverables.

## EXAMPLE

System: "Research assistant that gathers info and writes summaries"

{
  "groups": [
    {
      "id": "g_main",
      "title": "Research Pipeline",
      "x": -50, "y": -50,
      "width": 1000, "height": 400,
      "color": "blue"
    }
  ],
  "blocks": [
    {
      "id": "input_query",
      "type": "input_file",
      "title": "Research Query",
      "description": "User's research question",
      "x": 0, "y": 100
    },
    {
      "id": "ctx_style",
      "type": "context_file",
      "title": "Writing Style Guide",
      "description": "Tone, format, length requirements",
      "x": 0, "y": 250,
      "data": { "filePath": "prompts/style_guide.md" }
    },
    {
      "id": "agent_researcher",
      "type": "chef",
      "title": "Research Agent",
      "description": "Gathers and analyzes information",
      "x": 350, "y": 100,
      "data": {
        "model": "gpt-4o",
        "temperature": 0.3,
        "outputs": [
          { "id": "o1", "filename": "research_notes.md", "format": "markdown" }
        ]
      }
    },
    {
      "id": "agent_writer",
      "type": "chef",
      "title": "Writer Agent",
      "description": "Creates polished summary",
      "x": 650, "y": 100,
      "data": {
        "model": "gpt-4o",
        "temperature": 0.7,
        "outputs": [
          { "id": "o2", "filename": "final_summary.md", "format": "markdown", "description": "Polished research summary" }
        ]
      }
    },
    {
      "id": "output_folder",
      "type": "dish",
      "title": "Research Output",
      "description": "Collects all research deliverables",
      "x": 900, "y": 100,
      "data": { "outputFolder": "research/[DATE]_[NAME]/" }
    }
  ],
  "connections": [
    { "id": "c1", "fromId": "input_query", "toId": "agent_researcher", "type": "flow" },
    { "id": "c2", "fromId": "ctx_style", "toId": "agent_writer", "type": "default" },
    { "id": "c3", "fromId": "agent_researcher", "toId": "agent_writer", "type": "flow", "label": "findings" },
    { "id": "c4", "fromId": "agent_researcher", "toId": "output_folder", "type": "flow" },
    { "id": "c5", "fromId": "agent_writer", "toId": "output_folder", "type": "flow" }
  ]
}

Now analyze the following system and generate the JSON schema:
```

</details>

### Quick Reference

**Block Types:**
| Type | Icon | Role |
|------|------|------|
| `chef` | 👨‍🍳 | AI Agent (processes data, produces files) |
| `input_file` | 📥 | Workflow trigger (user inputs) |
| `context_file` | 📄 | Reference docs (agent queries) |
| `ingredients` | 🥕 | Static data sources |
| `dish` | 📁 | Output folder (collects agent files) |
| `note` | 📝 | Annotations |

**Connection Types:**
| Type | Style | Use |
|------|-------|-----|
| `flow` | ━━▶ | Main data flow |
| `default` | ───▶ | Context reference |
| `sync` | ┄┄▶ | Dependencies |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [VISION.md](VISION.md) | Long-term vision and design philosophy |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture deep-dive |
| [docs/FEATURES.md](docs/FEATURES.md) | Complete feature documentation |
| [docs/JSON_SCHEMA.md](docs/JSON_SCHEMA.md) | Complete JSON import/export reference |
| [docs/BUSINESS_ANALYSIS.md](docs/BUSINESS_ANALYSIS.md) | Market analysis & commercialization strategy |
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
