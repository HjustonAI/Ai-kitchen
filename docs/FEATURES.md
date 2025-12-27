# Features

Complete feature documentation for AI Kitchen.

---

## 🎨 Canvas Operations

### Pan (Move Canvas)
- **Mouse**: Hold `Space` + drag, or middle mouse button drag
- **Touch**: Two-finger drag
- **Reset**: Double-click empty area to reset view

### Zoom
- **Mouse Wheel**: Scroll up to zoom in, down to zoom out
- **Range**: 10% to 200%
- **Center**: Zooms toward cursor position

### Selection Box
- **Draw**: `Shift` + drag on empty area
- **Behavior**: Selects all blocks/groups within the box
- **Add to Selection**: Hold `Shift` while drawing

---

## 📦 Block Operations

### Adding Blocks
Click a block type in the sidebar to add it at canvas center:

| Type | Purpose | Icon |
|------|---------|------|
| **Chef** | AI Agent / LLM processor | 👨‍🍳 |
| **Ingredients** | Raw data / resources | 🥕 |
| **Context File** | Static reference documents | 📄 |
| **Input File** | Dynamic user inputs | 📥 |
| **Dish** | Output / results | 🍽️ |
| **Note** | Comments & annotations | 📝 |

### Moving Blocks
- **Single**: Click and drag
- **Multiple**: Select multiple, drag any one
- **Precision**: Hold `Shift` while dragging to snap to grid

### Resizing Blocks
- **Handles**: Drag corner or edge handles
- **Minimum Size**: 150x80 pixels
- **Aspect Ratio**: Hold `Shift` to maintain ratio

### Editing Blocks
- **Select**: Single click
- **Quick Edit**: Double-click to edit title inline
- **Properties**: Use right panel (ContextPanel) for full editing

### Deleting Blocks
- **Keyboard**: Select + `Delete` or `Backspace`
- **Context Menu**: Right-click → Delete
- **Multiple**: Select multiple, then delete

### Block Properties

#### Chef (Agent) Block
```
- Title: Agent name
- Description: Role/purpose
- Model: LLM model name
- Temperature: 0.0 - 2.0
- Max Tokens: Output limit
```

#### Context File Block
```
- Title: Document name
- Description: What it contains
- File Path: Reference path
- Content: Inline content (optional)
```

#### Input File Block
```
- Title: Input name
- Description: What data it provides
- File Path: Input path
- Is External: Whether from external source
```

#### Dish (Output) Block
```
- Title: Output name
- Description: What it produces
- Output Format: markdown | json | text | file
- Save Path: Where to save (optional)
```

---

## 🔗 Connections

### Creating Connections
1. Hover over source block to reveal anchor points
2. Drag from right anchor (output)
3. Drop on left anchor (input) of target block

### Connection Types
| Type | Style | Usage |
|------|-------|-------|
| `default` | Solid line | Standard data flow |
| `flow` | Animated dashes | Active data stream |
| `sync` | Dotted line | Synchronization |

### Connection Labels
- Double-click connection to add label
- Labels appear at midpoint of path

### Deleting Connections
- Click to select, then `Delete`
- Or right-click → Delete

### Auto-Routing
Connections automatically route around blocks to minimize crossings.

---

## 📁 Groups

### Creating Groups
1. Select multiple blocks (`Shift` + click or selection box)
2. Press `Ctrl + G` or click "Group" button
3. Enter group title

### Collapsing/Expanding
- **Toggle**: Double-click group header
- **Button**: Click expand/collapse icon
- **Keyboard**: Select group + `Enter`

### Connection Rerouting
When collapsed:
- External connections to internal blocks reroute to group boundary
- Internal connections are hidden
- Group acts as single node

### Nested Groups
Groups can contain other groups for hierarchical organization.

### Ungrouping
- Select group
- Press `Ctrl + Shift + G` or click "Ungroup"
- Blocks return to their original positions

### Group Colors
Available colors: Blue, Red, Green, Purple, Orange, Cyan

---

## ⚡ Execution Simulation

### Starting Simulation
- **Button**: Click Play in BottomBar
- **Keyboard**: `Shift + Space`

### What Happens
1. **Input Files** start sending packets to connected agents
2. **Agents** collect inputs, process, then output
3. **Context Files** respond to agent queries
4. **Dishes** receive final outputs

### Visual Feedback

#### Packet Types
| Type | Color | Direction |
|------|-------|-----------|
| Input | 🔵 Blue | Data → Agent |
| Query | 🟠 Orange | Agent → Context |
| Response | 🟢 Green | Context → Agent |
| Output | 🟣 Purple | Agent → Dish |
| Handoff | 🔷 Cyan | Agent → Agent |

#### Agent Phases
| Phase | Visual | Description |
|-------|--------|-------------|
| Idle | Gray ring | Waiting for input |
| Collecting | Blue pulse + counter | Receiving data (2/3) |
| Processing | Spinning animation | Computing |
| Outputting | Purple glow | Sending results |

#### Connection Glow
Active connections glow with packet color during data transfer.

### Speed Control
| Preset | Speed | Shortcut |
|--------|-------|----------|
| Slow | 0.5x | `1` |
| Normal | 1.0x | `2` |
| Fast | 2.0x | `3` |

- **Fine Control**: Use slider in BottomBar
- **Range**: 0.25x to 4.0x
- **Keyboard**: `+` / `-` to adjust

### Stopping Simulation
- **Button**: Click Pause in BottomBar
- **Keyboard**: `Shift + Space`
- **Effect**: Clears all packets, resets states

### Execution Monitor
Located in sidebar when simulation runs:
- Active packet count by type
- Agent phase indicators
- Mini event log

---

## 💾 Import/Export

### Export Board
1. Click "Export" in sidebar
2. Downloads JSON file with:
   - All blocks
   - All connections
   - All groups
   - View state

### Import Board
1. Click "Import" in sidebar
2. Select JSON file
3. Board loads with all elements

### LLM-Generated Schemas
Use AI to generate board schemas:

**Example Prompt:**
> Analyze this multi-agent system architecture and generate an AI Kitchen JSON schema.

**Schema Format:**
```json
{
  "blocks": [
    {
      "id": "unique-id",
      "type": "chef",
      "title": "Name",
      "description": "Description",
      "x": 100,
      "y": 100
    }
  ],
  "connections": [
    {
      "id": "conn-id",
      "fromId": "source-id",
      "toId": "target-id",
      "type": "flow"
    }
  ],
  "groups": []
}
```

---

## ⌨️ Keyboard Shortcuts

### Simulation
| Action | Shortcut |
|--------|----------|
| Play/Pause | `Shift + Space` |
| Speed Up | `+` or `=` |
| Speed Down | `-` |
| Slow (0.5x) | `1` |
| Normal (1x) | `2` |
| Fast (2x) | `3` |

### Editing
| Action | Shortcut |
|--------|----------|
| Delete | `Delete` / `Backspace` |
| Undo | `Ctrl + Z` |
| Redo | `Ctrl + Y` / `Ctrl + Shift + Z` |
| Select All | `Ctrl + A` |
| Deselect | `Escape` |

### Grouping
| Action | Shortcut |
|--------|----------|
| Group | `Ctrl + G` |
| Ungroup | `Ctrl + Shift + G` |

### Navigation
| Action | Shortcut |
|--------|----------|
| Pan | `Space` + Drag |
| Zoom In | `Ctrl + +` |
| Zoom Out | `Ctrl + -` |
| Fit to Content | `Ctrl + 0` |

---

## 🎨 UI Layout

### Sidebar (Left, Fixed)
- **Width**: 280px
- **Content**:
  - Logo & title
  - Block palette (scrollable)
  - Execution section (when running)
  - Export/Import tools

### Board (Center, Flexible)
- **Size**: Fills remaining space
- **Layers**:
  - Background grid
  - Connections (SVG)
  - Blocks & Groups (DOM)
  - Execution particles

### Context Panel (Right, Slide-in)
- **Width**: 320px
- **Trigger**: Appears when block selected
- **Content**: Block properties editor

### Bottom Bar (Fixed)
- **Height**: 48px
- **Content**:
  - Play/Pause button
  - Speed slider
  - Speed presets
  - Shortcuts hint

---

## 🔄 Persistence

### Auto-Save
All changes automatically save to `localStorage`:
- Key: `ai-kitchen-storage`
- Includes: Blocks, connections, groups, view state

### Manual Export
Use Export feature for:
- Backup
- Sharing with others
- Version control

### Clear Board
1. Select all (`Ctrl + A`)
2. Delete (`Delete`)
3. Or import empty JSON

---

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture
- [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) - Implementation progress
- [technical/EXECUTION_ENGINE.md](technical/EXECUTION_ENGINE.md) - Engine details
