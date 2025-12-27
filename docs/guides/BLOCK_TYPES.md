# Block Types Reference

Detailed documentation of all block types in AI Kitchen.

---

## Overview

AI Kitchen supports 6 block types, each representing a component in an AI agent workflow:

| Type | Icon | Role | Execution Behavior |
|------|------|------|-------------------|
| **Chef** | 👨‍🍳 | AI Agent / LLM | Processes inputs → outputs |
| **Ingredients** | 🥕 | Raw Data | Static data source |
| **Context File** | 📄 | Reference Docs | Responds to queries |
| **Input File** | 📥 | User Inputs | Triggers workflow |
| **Dish** | 🍽️ | Output | Receives results |
| **Note** | 📝 | Annotation | No execution |

---

## Chef (AI Agent)

The central processing unit of a workflow. Represents an AI agent or LLM.

### Visual
- **Color**: Purple accent
- **Icon**: Chef hat 👨‍🍳
- **Shape**: Card with rounded corners

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Agent name |
| `description` | string | Role/purpose description |
| `model` | string | LLM model (e.g., "gpt-4") |
| `temperature` | number | Creativity (0.0 - 2.0) |
| `maxTokens` | number | Output limit |

### Execution Behavior

**Phases:**
1. **Idle** - Waiting for input packets
2. **Collecting** - Receiving inputs (shows progress "2/3")
3. **Processing** - "Thinking" animation
4. **Outputting** - Sending results

**Data Flow:**
```
[Input] ──→ [Chef] ──→ [Context Query] ──→
                   ←── [Context Response] ←──
           [Chef] ──→ [Output/Handoff]
```

### Example Use Cases
- Research agent gathering information
- Code generation assistant
- Document summarizer
- Multi-step reasoning agent

---

## Ingredients (Raw Data)

General-purpose data resource. Represents raw data, APIs, or databases.

### Visual
- **Color**: Orange accent
- **Icon**: Carrot 🥕
- **Shape**: Standard card

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Data source name |
| `description` | string | What data it provides |

### Execution Behavior

Static block - no active execution behavior. Used for documentation and visual organization.

### Example Use Cases
- Database reference
- API endpoint
- Knowledge base
- Training data source

---

## Context File

Static reference document that agents can query during processing.

### Visual
- **Color**: Blue accent
- **Icon**: Document 📄
- **Shape**: File card

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Document name |
| `description` | string | Content summary |
| `filePath` | string | Reference path |
| `content` | string | Inline content (optional) |

### Execution Behavior

**States:**
1. **Idle** - Waiting for queries
2. **Receiving** - Query packet arriving
3. **Processing** - Preparing response
4. **Sending** - Response packet departing

**Data Flow:**
```
[Chef] ──query──→ [Context File]
[Chef] ←─response─ [Context File]
```

### Example Use Cases
- System instructions
- Code templates
- Reference documentation
- Configuration files
- Style guides

---

## Input File

Dynamic user input that triggers workflow execution.

### Visual
- **Color**: Cyan accent
- **Icon**: Download/Import 📥
- **Shape**: Input card

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Input name |
| `description` | string | What data it provides |
| `filePath` | string | Input path |
| `isExternal` | boolean | External source flag |

### Execution Behavior

**States:**
1. **Idle** - Before simulation starts
2. **Sending** - Emitting input packets

**Data Flow:**
```
[Input File] ──input──→ [Chef]
```

**Note:** Input files are the **trigger** for workflow execution. When simulation starts, input files begin sending packets to connected agents.

### Example Use Cases
- User prompt
- Uploaded document
- API request
- Form data
- Variable input

---

## Dish (Output)

Final output destination that receives results from agents.

### Visual
- **Color**: Green accent
- **Icon**: Plate 🍽️
- **Shape**: Result card

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Output name |
| `description` | string | What it produces |
| `outputFormat` | enum | markdown, json, text, file |
| `savePath` | string | Save location (optional) |

### Execution Behavior

**States:**
1. **Idle** - Waiting for output
2. **Receiving** - Output packet arriving
3. **Complete** - Success state

**Data Flow:**
```
[Chef] ──output──→ [Dish]
```

### Example Use Cases
- Generated document
- API response
- Saved file
- Report
- Transformed data

---

## Note (Annotation)

Comment or annotation for documentation purposes.

### Visual
- **Color**: Yellow accent
- **Icon**: Sticky note 📝
- **Shape**: Note card

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Note title |
| `description` | string | Note content |

### Execution Behavior

**None** - Notes do not participate in execution. They are for documentation and visual organization only.

### Example Use Cases
- Section headers
- Process descriptions
- Team notes
- Workflow explanations
- TODO items

---

## Connection Rules

### Valid Connections

| From | To | Connection Type | Packet Type |
|------|-----|-----------------|-------------|
| Input File | Chef | flow | `input` |
| Chef | Context File | flow | `query` |
| Context File | Chef | flow (reverse) | `response` |
| Chef | Chef | flow | `handoff` |
| Chef | Dish | flow | `output` |
| Ingredients | Chef | default | - |

### Invalid Connections

- Dish → anything (outputs can't be sources)
- Note → anything (annotations don't connect)
- Self-connections (block to itself)

---

## Execution Data Types

### Input Packet
```typescript
{
  type: 'input',
  fromBlockId: 'input-file-1',
  toBlockId: 'chef-1',
  data: { /* user input data */ }
}
```

### Query Packet
```typescript
{
  type: 'query',
  fromBlockId: 'chef-1',
  toBlockId: 'context-file-1',
  query: 'What is the code style?'
}
```

### Response Packet
```typescript
{
  type: 'response',
  fromBlockId: 'context-file-1',
  toBlockId: 'chef-1',
  data: { /* context data */ },
  isReverse: true
}
```

### Output Packet
```typescript
{
  type: 'output',
  fromBlockId: 'chef-1',
  toBlockId: 'dish-1',
  data: { /* result data */ }
}
```

### Handoff Packet
```typescript
{
  type: 'handoff',
  fromBlockId: 'chef-1',
  toBlockId: 'chef-2',
  data: { /* intermediate result */ }
}
```

---

## Visual States Summary

| Block Type | Idle | Active | Complete |
|------------|------|--------|----------|
| Chef | Gray | Blue (collecting), Spin (processing), Purple (outputting) | Gray |
| Context File | Gray | Blue (receiving), Green (sending) | Gray |
| Input File | Gray | Blue (sending) | Gray |
| Dish | Gray | Purple (receiving) | Green ✓ |
| Ingredients | Gray | - | - |
| Note | Yellow | - | - |

---

## See Also

- [FEATURES.md](../FEATURES.md) - Feature documentation
- [EXECUTION_ENGINE.md](../technical/EXECUTION_ENGINE.md) - Engine details
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Overall architecture
