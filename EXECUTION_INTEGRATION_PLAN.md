# 🔄 AI Kitchen Execution System Integration Plan

**Data:** 27 grudnia 2025  
**Wersja:** 1.0  
**Status:** DRAFT - Do konsultacji

---

## 📋 Executive Summary

Ten dokument opisuje plan integracji systemu animacji wykonania z core'em AI Kitchen, przekształcając wizualizację przepływu w rzeczywisty silnik orkiestracji agentów.

**Cel główny:** Animacje nie mają być tylko wizualizacją - mają odzwierciedlać i sterować rzeczywistym przepływem danych w systemie agentowym.

---

## 🎯 Założenia i Wymagania

### Kluczowe zasady przepływu agentowego:
1. **Agent czeka na WSZYSTKIE wejścia** - input_file, context responses, handoffs od poprzednich agentów
2. **Dopiero po zebraniu wszystkich danych** - agent przetwarza i przekazuje dalej
3. **Bidirectional context flow** - agent wysyła query → context odpowiada response
4. **Chain execution** - agenci mogą być połączeni sekwencyjnie (handoff pattern)

### Wymagania niefunkcjonalne:
- ⚡ Performance: 60fps przy 100+ pakietach
- 🔄 Real-time sync: animacja = rzeczywisty stan
- 📊 Observable: możliwość debugowania przepływu
- 🧩 Modular: separation of concerns

---

## 🏗️ FAZA 1: Refaktoryzacja Silnika Wykonania

### 1.1 Nowy Model Stanu Agenta

**Obecny problem:** Agent nie śledzi wszystkich wymaganych wejść.

**Rozwiązanie:**

```typescript
interface AgentState {
  id: string;
  phase: AgentPhase;
  
  // === NOWE: Tracking wszystkich wymaganych wejść ===
  requiredInputs: {
    inputFiles: Set<string>;      // IDs of input_file connections
    contextFiles: Set<string>;    // IDs of context_file connections  
    upstreamAgents: Set<string>;  // IDs of chef connections (handoffs)
  };
  
  receivedInputs: {
    inputFiles: Set<string>;
    contextResponses: Set<string>;
    handoffs: Set<string>;
  };
  
  // === NOWE: Payload aggregation ===
  collectedData: Map<string, unknown>;  // Zebrane dane z wejść
  
  // Existing
  phaseStartTime: number;
  cycleCount: number;
}
```

### 1.2 Nowe Fazy Agenta

```
┌─────────┐    input     ┌───────────┐   all inputs   ┌──────────┐
│  IDLE   │ ──────────►  │ GATHERING │ ────────────►  │ QUERYING │
└─────────┘              └───────────┘                └──────────┘
     ▲                                                      │
     │                                                      ▼
     │                   ┌────────────┐               ┌──────────┐
     └───────────────────│ OUTPUTTING │◄──────────────│ AWAITING │
                         └────────────┘  all context  └──────────┘
                              │                            │
                              ▼                            ▼
                         ┌────────────┐               ┌────────────┐
                         │   DONE     │               │ PROCESSING │
                         └────────────┘               └────────────┘
```

**Nowe fazy:**
- `gathering` - Czeka na wszystkie wejściowe pakiety (input + handoffs)
- `querying` - Wysyła zapytania do context files
- `awaiting` - Czeka na odpowiedzi z context files  
- `processing` - Przetwarza zebrane dane
- `outputting` - Wysyła wyniki

### 1.3 Dependency Graph

**Plik:** `src/lib/dependencyGraph.ts`

```typescript
interface DependencyNode {
  blockId: string;
  blockType: BlockType;
  
  // Upstream dependencies (must complete before this node)
  upstream: {
    inputs: string[];      // input_file block IDs
    contexts: string[];    // context_file block IDs (bidirectional)
    agents: string[];      // chef block IDs (handoffs)
  };
  
  // Downstream dependents (wait for this node)
  downstream: {
    agents: string[];      // chef block IDs
    outputs: string[];     // dish block IDs
  };
}

class DependencyGraph {
  buildFromTopology(blocks: Block[], connections: Connection[]): Map<string, DependencyNode>;
  getRequiredInputsFor(agentId: string): RequiredInputs;
  getExecutionOrder(): string[];  // Topological sort
  detectCycles(): string[][] | null;
}
```

---

## 🏗️ FAZA 2: Separation of Concerns

### 2.1 Architektura Modułowa

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ ExecutionLayer  │  │ Block.tsx       │  │ Connections │ │
│  │ (Canvas)        │  │ (Phase badges)  │  │ Layer       │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
└───────────┼─────────────────────┼─────────────────┼─────────┘
            │                     │                 │
            ▼                     ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    STATE LAYER (Zustand)                     │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ useStore        │  │useExecutionStore│◄─────────────────┐│
│  │ (blocks, conn)  │  │ (packets, phase)│                  ││
│  └────────┬────────┘  └────────┬────────┘                  ││
└───────────┼─────────────────────┼──────────────────────────┘│
            │                     │                           │
            ▼                     ▼                           │
┌─────────────────────────────────────────────────────────────┐
│                    EXECUTION LAYER                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  ExecutionEngine                         ││
│  │  ┌───────────────┐  ┌────────────────┐  ┌────────────┐ ││
│  │  │DependencyGraph│  │ AgentStateMach │  │PacketRouter│ ││
│  │  └───────────────┘  └────────────────┘  └────────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
            │                     
            ▼                     
┌─────────────────────────────────────────────────────────────┐
│                    CORE LAYER (Future)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ AgentRuntime    │  │ LLM Connector   │  │ FileSystem  │ │
│  │ (real execution)│  │ (API calls)     │  │ (context)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Nowe Pliki / Moduły

```
src/
├── lib/
│   ├── execution/
│   │   ├── index.ts                 # Public API
│   │   ├── ExecutionEngine.ts       # Main orchestrator
│   │   ├── AgentStateMachine.ts     # FSM for agents
│   │   ├── DependencyGraph.ts       # DAG builder
│   │   ├── PacketRouter.ts          # Packet lifecycle
│   │   └── types.ts                 # Shared types
│   │
│   ├── animation/                   # Existing, renamed
│   │   ├── particleSystem.ts
│   │   ├── bezierUtils.ts
│   │   └── trailRenderer.ts
│   │
│   └── core/                        # Future: Real execution
│       ├── AgentRuntime.ts
│       ├── LLMConnector.ts
│       └── ContextLoader.ts
```

---

## 🏗️ FAZA 3: Event-Driven Architecture

### 3.1 Event Bus

**Plik:** `src/lib/execution/EventBus.ts`

```typescript
type ExecutionEvent = 
  | { type: 'PACKET_CREATED'; packet: FlowPacket }
  | { type: 'PACKET_ARRIVED'; packet: FlowPacket; targetId: string }
  | { type: 'AGENT_PHASE_CHANGED'; agentId: string; from: AgentPhase; to: AgentPhase }
  | { type: 'AGENT_READY_TO_PROCESS'; agentId: string; inputs: CollectedInputs }
  | { type: 'AGENT_OUTPUT_READY'; agentId: string; outputs: ProcessedOutput }
  | { type: 'CYCLE_COMPLETED'; agentId: string; cycleNumber: number }
  | { type: 'ERROR'; agentId?: string; error: Error };

class ExecutionEventBus {
  subscribe(eventType: string, handler: (event: ExecutionEvent) => void): () => void;
  emit(event: ExecutionEvent): void;
  
  // Debug/monitoring
  getEventHistory(): ExecutionEvent[];
  enableLogging(enabled: boolean): void;
}
```

### 3.2 Integracja z Zustand

```typescript
// W useExecutionStore.ts
import { executionEventBus } from '../lib/execution/EventBus';

// Subscribe to events and update store
executionEventBus.subscribe('AGENT_PHASE_CHANGED', (event) => {
  useExecutionStore.getState().setAgentPhase(event.agentId, event.to);
});

executionEventBus.subscribe('PACKET_CREATED', (event) => {
  useExecutionStore.getState().addPacketFromEngine(event.packet);
});
```

---

## 🏗️ FAZA 4: Integracja z Core (Future-Ready)

### 4.1 Agent Runtime Interface

```typescript
interface IAgentRuntime {
  // Simulation mode (current)
  simulateProcessing(agentId: string, inputs: CollectedInputs): Promise<ProcessedOutput>;
  
  // Real execution mode (future)
  executeAgent(agentId: string, inputs: CollectedInputs, config: AgentConfig): Promise<ProcessedOutput>;
}

// Simulation implementation
class SimulatedAgentRuntime implements IAgentRuntime {
  async simulateProcessing(agentId: string, inputs: CollectedInputs): Promise<ProcessedOutput> {
    // Symuluj delay "myślenia"
    await sleep(1000 + Math.random() * 1000);
    
    return {
      agentId,
      timestamp: Date.now(),
      data: { simulated: true },
    };
  }
}

// Future: Real LLM execution
class LLMAgentRuntime implements IAgentRuntime {
  async executeAgent(agentId: string, inputs: CollectedInputs, config: AgentConfig): Promise<ProcessedOutput> {
    const prompt = this.buildPrompt(config, inputs);
    const response = await this.llmConnector.complete(prompt);
    return this.parseResponse(response);
  }
}
```

### 4.2 Context File Loader Interface

```typescript
interface IContextLoader {
  // Simulation
  simulateContextFetch(contextId: string): Promise<ContextData>;
  
  // Real (future) - actual file reading
  loadContext(contextId: string, filePath: string): Promise<ContextData>;
}
```

---

## 🏗️ FAZA 5: Performance Optimizations

### 5.1 Batching & Throttling

```typescript
class PacketBatcher {
  private pendingPackets: FlowPacket[] = [];
  private batchTimeout: number | null = null;
  
  add(packet: FlowPacket) {
    this.pendingPackets.push(packet);
    
    if (!this.batchTimeout) {
      this.batchTimeout = requestAnimationFrame(() => {
        this.flush();
      });
    }
  }
  
  private flush() {
    const packets = this.pendingPackets;
    this.pendingPackets = [];
    this.batchTimeout = null;
    
    // Batch update store
    useExecutionStore.getState().batchAddPackets(packets);
  }
}
```

### 5.2 Worker Thread for Heavy Computation

```typescript
// execution.worker.ts
self.onmessage = (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'BUILD_DEPENDENCY_GRAPH':
      const graph = buildDependencyGraph(payload.blocks, payload.connections);
      self.postMessage({ type: 'GRAPH_BUILT', graph });
      break;
      
    case 'COMPUTE_EXECUTION_ORDER':
      const order = topologicalSort(payload.graph);
      self.postMessage({ type: 'ORDER_COMPUTED', order });
      break;
  }
};
```

---

## 📅 Timeline & Milestones

### Sprint 1: Foundation (Tydzień 1-2)
- [ ] 1.1 Refactor AgentState with required/received inputs tracking
- [ ] 1.2 Implement new phase state machine
- [ ] 1.3 Create DependencyGraph class
- [ ] Unit tests for state machine

### Sprint 2: Event System (Tydzień 2-3)  
- [ ] 3.1 Implement ExecutionEventBus
- [ ] 3.2 Integrate events with Zustand
- [ ] 2.2 Create modular file structure
- [ ] Integration tests

### Sprint 3: Animation Sync (Tydzień 3-4)
- [ ] Sync particle system with event bus
- [ ] Phase indicators on blocks
- [ ] Connection highlighting based on flow state
- [ ] Performance profiling & optimization

### Sprint 4: Future-Ready Interfaces (Tydzień 4-5)
- [ ] 4.1 IAgentRuntime interface
- [ ] 4.2 IContextLoader interface  
- [ ] Mock implementations
- [ ] Documentation

### Sprint 5: Polish & Edge Cases (Tydzień 5-6)
- [ ] Cycle detection & error handling
- [ ] Complex topology testing (fan-in, fan-out)
- [ ] Performance optimization (batching, workers)
- [ ] Final documentation

---

## 🔍 Review Checklist

### Performance Review (Senior Performance Dev)
- [ ] 60fps maintained with 100+ packets?
- [ ] Memory usage stable (no leaks)?
- [ ] TypedArrays used where beneficial?
- [ ] RAF loop optimized?
- [ ] State updates batched?

### Architecture Review (Architect)
- [ ] Separation of concerns maintained?
- [ ] Dependencies injected (testable)?
- [ ] Event-driven where appropriate?
- [ ] Future LLM integration considered?
- [ ] No circular dependencies?

### Code Review (Senior Dev)
- [ ] TypeScript strict mode passes?
- [ ] Error handling comprehensive?
- [ ] Edge cases covered?
- [ ] Tests written?
- [ ] Documentation complete?

---

## 🚨 Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance regression | High | Medium | Continuous profiling, feature flags |
| Complex topology edge cases | Medium | High | Extensive test suite with graph generators |
| State sync issues | High | Medium | Event sourcing, state snapshots |
| Breaking existing functionality | High | Low | Incremental rollout, feature flags |

---

## 📚 Appendix A: Glossary

- **Agent (Chef)**: Node that processes data, has instructions
- **Input File**: Source of user prompts/data
- **Context File**: Reference data that agents query
- **Dish**: Final output destination
- **Handoff**: Data transfer between agents
- **Query/Response**: Bidirectional flow to context files
- **Packet**: Visual representation of data in transit

---

## 📚 Appendix B: Example Topologies

### Simple Linear
```
[Input] → [Chef] → [Dish]
```

### With Context
```
[Input] → [Chef] ⟷ [Context]
              ↓
          [Dish]
```

### Multi-Agent Chain
```
[Input] → [Chef A] → [Chef B] → [Dish]
              ↕           ↕
         [Context 1] [Context 2]
```

### Fan-In (Agent waits for multiple inputs)
```
[Input 1] ─┐
           ├──→ [Chef] → [Dish]
[Input 2] ─┘
```

### Fan-Out (Agent sends to multiple)
```
              ┌──→ [Chef B] → [Dish 1]
[Chef A] ────┤
              └──→ [Chef C] → [Dish 2]
```
