# Execution Engine v2.0

> **Implementation:** `src/lib/executionEngineV2.ts`  
> **Status:** ✅ Implemented

---

## Overview

The ExecutionEngine is an event-driven state machine that simulates AI agent workflow execution. It manages data packets traveling between blocks and coordinates agent state transitions.

### Key Features
- Event-driven architecture (transitions on packet arrivals)
- Visual packet animation with typed packets
- Agent phase system (idle → collecting → processing → outputting)
- Connection glow effects during transfer
- Adjustable simulation speed (0.25x - 4x)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ExecutionEngine                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐     ┌────────────────┐                      │
│  │  PacketManager │     │  AgentManager  │                      │
│  │  - create      │     │  - phases      │                      │
│  │  - update      │     │  - transitions │                      │
│  │  - arrival     │     │  - progress    │                      │
│  └───────┬────────┘     └───────┬────────┘                      │
│          │                      │                                │
│          └──────────┬───────────┘                                │
│                     │                                            │
│          ┌──────────▼──────────┐                                │
│          │    Event Loop       │                                │
│          │  (requestAnimFrame) │                                │
│          └──────────┬──────────┘                                │
│                     │                                            │
│          ┌──────────▼──────────┐                                │
│          │  Store Updates      │                                │
│          │  (useExecutionStore)│                                │
│          └─────────────────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Packet Types

| Type | Color | Direction | Purpose |
|------|-------|-----------|---------|
| `input` | 🔵 Blue | Input → Agent | Data from input_file blocks |
| `query` | 🟠 Orange | Agent → Context | Agent requesting context |
| `response` | 🟢 Green | Context → Agent | Context reply (reverse) |
| `output` | 🟣 Purple | Agent → Dish | Final results |
| `handoff` | 🔷 Cyan | Agent → Agent | Inter-agent communication |

### Flow Diagram

```
┌──────────┐         ┌──────────────┐         ┌─────────────┐
│ INPUT    │─packet──►│  AI AGENT    │─packet──►│ CONTEXT     │
│ FILE     │   🔵     │  (triggered) │   🟠     │ FILE        │
└──────────┘         └──────┬───────┘         └──────┬──────┘
                           │                        │
                           │◄───────packet──────────┘
                           │          🟢
                           ▼
                    ┌──────────────┐
                    │  AI AGENT    │
                    │ (processing) │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ NEXT     │    │ OUTPUT   │    │ DISH     │
    │ AGENT    │    │ FILE     │    │ (output) │
    │   🔷     │    │   🟣     │    │   🟣     │
    └──────────┘    └──────────┘    └──────────┘
```

---

## Agent Phases

### State Machine

```
         ┌─────────────────────────────────────────────────┐
         │                                                 │
         ▼                                                 │
    ┌─────────┐  input/handoff   ┌────────────┐           │
    │  IDLE   │ ──────────────►  │ COLLECTING │           │
    └─────────┘   arrives        └─────┬──────┘           │
                                       │                   │
                              all inputs received          │
                                       │                   │
                                       ▼                   │
                               ┌──────────────┐           │
                               │  PROCESSING  │           │
                               └──────┬───────┘           │
                                      │                   │
                             processing complete          │
                                      │                   │
                                      ▼                   │
                               ┌──────────────┐           │
                               │  OUTPUTTING  │ ──────────┘
                               └──────────────┘
                                 outputs sent
```

### Phase Descriptions

| Phase | Visual | Behavior |
|-------|--------|----------|
| `idle` | Gray ring | Waiting for trigger |
| `collecting` | Blue pulse + "2/3" | Receiving packets, counting progress |
| `processing` | Spinning animation | Computing (timed visual) |
| `outputting` | Purple glow | Sending results to outputs |

### Collecting Progress

During `collecting` phase, agents display progress: `X/Y`
- X = packets received
- Y = total expected inputs

---

## Implementation Details

### Core Types

```typescript
// Agent phase type
type AgentPhase = 'idle' | 'collecting' | 'processing' | 'outputting';

// Packet representation
interface DataPacket {
  id: string;
  connectionId: string;
  progress: number;      // 0.0 - 1.0
  type: PacketType;
  fromAgentId?: string;
  isReverse?: boolean;   // For response packets
}

// Agent state tracking
interface AgentState {
  phase: AgentPhase;
  receivedInputs: number;
  expectedInputs: number;
  pendingContexts: Set<string>;
}
```

### Engine Methods

```typescript
class ExecutionEngine {
  // Lifecycle
  start(): void;           // Begin simulation
  stop(): void;            // End simulation
  
  // Animation loop
  update(deltaTime: number): void;
  
  // Packet management
  createPacket(connectionId: string, type: PacketType): void;
  updatePackets(dt: number): void;
  handlePacketArrival(packetId: string): void;
  
  // Agent management
  transitionAgent(agentId: string, phase: AgentPhase): void;
  getAgentPhase(agentId: string): AgentPhase;
}
```

### Event Handling

```typescript
handlePacketArrival(packetId: string) {
  const packet = this.packets.get(packetId);
  const targetBlock = this.getTargetBlock(packet);
  
  switch (packet.type) {
    case 'input':
    case 'handoff':
      // Trigger agent to start collecting
      this.startCollecting(targetBlock.id);
      break;
      
    case 'query':
      // Context file schedules response
      this.scheduleContextResponse(targetBlock.id, packet);
      break;
      
    case 'response':
      // Agent receives context, check if all received
      this.receiveContextResponse(agentId, contextId);
      break;
      
    case 'output':
      // Dish receives output
      this.markDishComplete(targetBlock.id);
      break;
  }
}
```

---

## Store Integration

### useExecutionStore

```typescript
interface ExecutionState {
  // Core state
  isRunning: boolean;
  simulationMode: boolean;
  executionSpeed: number;
  
  // Visual state
  dataPackets: DataPacket[];
  agentPhases: Map<string, AgentPhase>;
  
  // Block visual states
  contextStates: Map<string, ContextBlockState>;
  inputStates: Map<string, InputBlockState>;
  dishStates: Map<string, DishBlockState>;
  
  // Progress tracking
  collectingProgress: Map<string, CollectingProgress>;
}
```

### Store Updates

The engine updates the store to trigger React re-renders:

```typescript
// Update packets (every frame)
useExecutionStore.setState({ dataPackets: [...packets] });

// Update agent phase (on transition)
useExecutionStore.getState().setAgentPhase(agentId, phase);

// Update block states
useExecutionStore.getState().setContextState(blockId, state);
useExecutionStore.getState().setInputState(blockId, state);
useExecutionStore.getState().setDishState(blockId, state);
```

---

## Visual Effects

### Connection Glow

Active connections get animated glow matching packet color:

```typescript
// ConnectionsLayer.tsx
const isActive = activeConnections.includes(connection.id);
const glowColor = getGlowColor(activePacketType);

<path 
  className={isActive ? 'connection-glow' : ''}
  style={{ filter: isActive ? `drop-shadow(0 0 8px ${glowColor})` : 'none' }}
/>
```

### Block State Visuals

| Block Type | States |
|------------|--------|
| Input File | `idle`, `sending` |
| Context File | `idle`, `receiving`, `processing`, `sending` |
| Dish | `idle`, `receiving`, `complete` |
| Chef (Agent) | Via `agentPhases` map |

---

## Animation Timing

### Constants

```typescript
const ANIMATION_DURATIONS = {
  packetTravel: 800,      // ms for packet to travel connection
  processingMin: 1000,    // minimum processing animation
  processingMax: 2000,    // maximum processing animation
  outputBurst: 400,       // output send animation
};
```

### Speed Multiplier

All durations are divided by `executionSpeed`:
- 0.25x = 4x slower
- 1.0x = normal speed
- 4.0x = 4x faster

---

## Usage

### Starting Simulation

```typescript
// Via store action
useExecutionStore.getState().setSimulationMode(true);

// Engine starts automatically
executionEngine.start();
```

### Stopping Simulation

```typescript
useExecutionStore.getState().setSimulationMode(false);

// Cleans up:
// - Removes all packets
// - Resets agent phases to idle
// - Clears block states
// - Clears collecting progress
```

### Speed Control

```typescript
// Via store action
useExecutionStore.getState().setExecutionSpeed(2.0);

// Engine reads speed from store
const speed = useExecutionStore.getState().executionSpeed;
```

---

## Debugging

### ExecutionLog

Events are logged to `ExecutionLogManager`:

```typescript
ExecutionLogManager.addEvent('packet_created', { packetId, type, connectionId });
ExecutionLogManager.addEvent('packet_arrived', { packetId, targetBlockId });
ExecutionLogManager.addEvent('agent_phase_change', { agentId, from, to });
```

### Console Logging

Enable verbose logging:
```typescript
executionEngine.setDebugMode(true);
```

---

## See Also

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Overall architecture
- [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) - Store patterns
- [FEATURES.md](../FEATURES.md) - User features
