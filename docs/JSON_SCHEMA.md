# JSON Schema Reference

Complete reference for AI Kitchen import/export JSON format.

---

## Overview

AI Kitchen uses JSON files to save and load workflow diagrams. The schema supports:
- **Blocks** - Nodes representing workflow components
- **Connections** - Links defining data flow between blocks
- **Groups** - Visual containers for organizing blocks

---

## Schema Structure

```json
{
  "groups": [...],
  "blocks": [...],
  "connections": [...]
}
```

All three arrays are optional. A minimal valid file:
```json
{
  "blocks": []
}
```

---

## Blocks

### Base Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | ✅ | Unique identifier |
| `type` | BlockType | ✅ | Block type (see below) |
| `title` | string | ✅ | Display title |
| `description` | string | ✅ | Detailed description |
| `x` | number | ✅ | X position (canvas coords) |
| `y` | number | ✅ | Y position (canvas coords) |
| `width` | number | ❌ | Width in pixels (default: 256) |
| `height` | number | ❌ | Height in pixels (default: 140) |
| `data` | BlockData | ❌ | Type-specific properties |

### Block Types

```typescript
type BlockType = 'chef' | 'ingredients' | 'dish' | 'note' | 'context_file' | 'input_file';
```

| Type | Purpose | Execution Behavior |
|------|---------|-------------------|
| `chef` | AI Agent / LLM processor | Receives inputs → processes → sends outputs |
| `input_file` | Dynamic user inputs | **Triggers workflow** - sends first packets |
| `context_file` | Static reference docs | Responds to agent queries |
| `ingredients` | Raw data / resources | Static reference (no execution) |
| `dish` | Output / results | Receives final results |
| `note` | Annotations | No execution (documentation only) |

### BlockData Properties

Type-specific optional properties:

```typescript
// Output file definition for AI Agent file production
interface OutputFile {
  id: string;              // Unique identifier
  filename: string;        // e.g. "01_brief.md"
  format: OutputFileFormat; // markdown, json, text, yaml, csv, other
  description?: string;    // What this file contains
}

type OutputFileFormat = 'markdown' | 'json' | 'text' | 'yaml' | 'csv' | 'other';

interface BlockData {
  // Chef properties
  model?: string;           // "gpt-4o", "claude-3", etc.
  temperature?: number;     // 0.0 - 2.0
  maxTokens?: number;       // Output limit
  outputs?: OutputFile[];   // Files this AI Agent produces
  
  // File/Context properties
  filePath?: string;        // Path to file
  isExternal?: boolean;     // External source flag
  content?: string;         // Inline content

  // Dish properties (folder/collection settings)
  outputFolder?: string;    // Base folder path for outputs (supports placeholders)
  outputFormat?: 'markdown' | 'json' | 'text' | 'file'; // Legacy
  savePath?: string;        // Legacy - kept for backward compatibility
}
```

### Block Examples

**Chef (AI Agent) with Output Files:**
```json
{
  "id": "agent_writer",
  "type": "chef",
  "title": "Content Writer",
  "description": "Writes engaging marketing copy",
  "x": 400, "y": 200,
  "width": 320, "height": 180,
  "data": {
    "model": "gpt-4o",
    "temperature": 0.7,
    "maxTokens": 2000,
    "outputs": [
      {
        "id": "out1",
        "filename": "01_content.md",
        "format": "markdown",
        "description": "Main content document"
      },
      {
        "id": "out2",
        "filename": "02_social_posts.json",
        "format": "json",
        "description": "Social media post variations"
      }
    ]
  }
}
    "temperature": 0.7,
    "maxTokens": 2000
  }
}
```

**Input File:**
```json
{
  "id": "input_brief",
  "type": "input_file",
  "title": "Project Brief",
  "description": "Client requirements and constraints",
  "x": 0, "y": 200,
  "data": {
    "filePath": "inputs/brief.md"
  }
}
```

**Context File:**
```json
{
  "id": "ctx_brand",
  "type": "context_file",
  "title": "Brand Guidelines",
  "description": "Voice, tone, and style rules",
  "x": 0, "y": 350,
  "data": {
    "filePath": "context/brand_guide.md",
    "isExternal": false
  }
}
```

**Dish (Output Folder):**
```json
{
  "id": "output_campaign",
  "type": "dish",
  "title": "Campaign Folder",
  "description": "All campaign deliverables",
  "x": 800, "y": 200,
  "data": {
    "outputFolder": "campaigns/[DATE]_[NAME]/"
  }
}
```

**Note:**
```json
{
  "id": "note_phase1",
  "type": "note",
  "title": "PHASE 1: Research",
  "description": "Initial research and data gathering",
  "x": 0, "y": 0
}
```

---

## Connections

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | ✅ | Unique identifier |
| `fromId` | string | ✅ | Source block ID |
| `toId` | string | ✅ | Target block ID |
| `type` | ConnectionType | ✅ | Connection style |
| `label` | string | ❌ | Optional label text |

### Connection Types

```typescript
type ConnectionType = 'default' | 'flow' | 'sync';
```

| Type | Visual | Purpose |
|------|--------|---------|
| `flow` | Animated dashes | Main data flow (active during execution) |
| `default` | Solid line | Context/reference links |
| `sync` | Dotted line | Synchronization / dependencies |

### Execution Flow Rules

**Direction matters for simulation:**

| From → To | Packet Type | Behavior |
|-----------|-------------|----------|
| `input_file` → `chef` | `input` | Triggers agent processing |
| `context_file` → `chef` | `query`/`response` | Agent queries, context responds |
| `chef` → `chef` | `handoff` | Passes work to next agent |
| `chef` → `dish` | `output` | Final result delivery |

### Connection Examples

**Input to Agent (flow):**
```json
{
  "id": "c_input_agent",
  "fromId": "input_query",
  "toId": "agent_research",
  "type": "flow"
}
```

**Context to Agent (default):**
```json
{
  "id": "c_ctx_agent",
  "fromId": "ctx_guidelines",
  "toId": "agent_writer",
  "type": "default"
}
```

**Agent to Agent with label (flow):**
```json
{
  "id": "c_handoff",
  "fromId": "agent_research",
  "toId": "agent_writer",
  "type": "flow",
  "label": "research findings"
}
```

---

## Groups

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | ✅ | Unique identifier |
| `title` | string | ✅ | Display title |
| `x` | number | ✅ | X position |
| `y` | number | ✅ | Y position |
| `width` | number | ✅ | Width in pixels |
| `height` | number | ✅ | Height in pixels |
| `color` | string | ✅ | Color name |
| `collapsed` | boolean | ❌ | Collapsed state (default: false) |

### Available Colors

```
blue | purple | green | orange | cyan | yellow | pink | red
```

### Group-Block Relationship

Blocks are **visually** contained by groups based on geometry:
- A block is "in" a group if its position falls within the group's bounds
- No explicit `groupId` property on blocks
- Groups can be nested

### Group Example

```json
{
  "id": "g_research",
  "title": "Research Phase",
  "x": -50,
  "y": 150,
  "width": 800,
  "height": 400,
  "color": "blue",
  "collapsed": false
}
```

---

## Complete Example

```json
{
  "groups": [
    {
      "id": "g_pipeline",
      "title": "Content Pipeline",
      "x": -50,
      "y": -50,
      "width": 1200,
      "height": 500,
      "color": "blue"
    }
  ],
  "blocks": [
    {
      "id": "note_header",
      "type": "note",
      "title": "CONTENT GENERATION SYSTEM",
      "description": "Automated content pipeline for marketing",
      "x": 0, "y": -30
    },
    {
      "id": "input_brief",
      "type": "input_file",
      "title": "Content Brief",
      "description": "Topic, audience, goals",
      "x": 0, "y": 100,
      "data": { "filePath": "inputs/brief.yaml" }
    },
    {
      "id": "ctx_brand",
      "type": "context_file",
      "title": "Brand Voice",
      "description": "Tone and style guidelines",
      "x": 0, "y": 260,
      "data": { "filePath": "context/brand.md" }
    },
    {
      "id": "ctx_examples",
      "type": "context_file",
      "title": "Example Posts",
      "description": "Reference content samples",
      "x": 0, "y": 410,
      "data": { "filePath": "context/examples.md" }
    },
    {
      "id": "agent_research",
      "type": "chef",
      "title": "Research Agent",
      "description": "Gathers relevant information",
      "x": 350, "y": 100,
      "width": 300, "height": 180,
      "data": { "model": "gpt-4o", "temperature": 0.3 }
    },
    {
      "id": "agent_writer",
      "type": "chef",
      "title": "Writer Agent",
      "description": "Creates draft content",
      "x": 700, "y": 100,
      "width": 300, "height": 180,
      "data": { "model": "gpt-4o", "temperature": 0.7 }
    },
    {
      "id": "output_content",
      "type": "dish",
      "title": "Final Content",
      "description": "Ready-to-publish content",
      "x": 1050, "y": 100,
      "data": { "outputFormat": "markdown" }
    }
  ],
  "connections": [
    { "id": "c1", "fromId": "input_brief", "toId": "agent_research", "type": "flow" },
    { "id": "c2", "fromId": "ctx_brand", "toId": "agent_writer", "type": "default" },
    { "id": "c3", "fromId": "ctx_examples", "toId": "agent_writer", "type": "default" },
    { "id": "c4", "fromId": "agent_research", "toId": "agent_writer", "type": "flow", "label": "research" },
    { "id": "c5", "fromId": "agent_writer", "toId": "output_content", "type": "flow" }
  ]
}
```

---

## Layout Guidelines

### Positioning

1. **Flow Direction**: Left-to-right (inputs left, outputs right)
2. **Horizontal Spacing**: ~300-350px between blocks
3. **Vertical Spacing**: ~150-200px between rows
4. **Origin**: (0, 0) is a good starting point

### Block Sizes (recommended)

| Type | Width | Height |
|------|-------|--------|
| `note` | 256 | 160 |
| `input_file` | 256 | 140 |
| `context_file` | 256 | 140 |
| `chef` | 300-320 | 180-350 |
| `dish` | 280 | 180 |
| `ingredients` | 256 | 140 |

### Group Sizing

- Add ~50px padding around contained blocks
- Header needs ~40px extra height at top
- Width should accommodate horizontal flow

### ID Conventions

Use semantic prefixes for readability:
- `input_*` - Input files
- `ctx_*` - Context files
- `agent_*` or step number - Chef blocks
- `output_*` - Dish blocks
- `note_*` - Notes
- `g_*` - Groups
- `c_*` - Connections

---

## Validation

### Required Fields

Every block must have: `id`, `type`, `title`, `description`, `x`, `y`

Every connection must have: `id`, `fromId`, `toId`, `type`

Every group must have: `id`, `title`, `x`, `y`, `width`, `height`, `color`

### ID Uniqueness

All IDs must be unique across the entire file (blocks, connections, groups).

### Connection Validity

- `fromId` and `toId` must reference existing block IDs
- Self-connections (same from/to) are ignored

---

## See Also

- [FEATURES.md](FEATURES.md) - Feature documentation
- [guides/BLOCK_TYPES.md](guides/BLOCK_TYPES.md) - Block type details
- [technical/EXECUTION_ENGINE.md](technical/EXECUTION_ENGINE.md) - Execution behavior
