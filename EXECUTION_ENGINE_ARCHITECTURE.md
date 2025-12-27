# Execution Engine Architecture v2.0

## 🏗️ Senior Architect Review

### Problem Statement
Obecna implementacja ma fundamentalne problemy:
1. **Time-based transitions** - fazy używają hardcoded delays zamiast event-driven logic
2. **Context files wysyłane od razu** - responses lecą zanim agent zrobi request
3. **Brak prawdziwego event flow** - `awaiting` czeka na timer, nie na faktyczne przybycie pakietów

### Correct Flow (Real Agentic System)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EVENT-DRIVEN FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐         ┌──────────────┐         ┌─────────────┐              │
│  │ INPUT    │─packet──►│  AI AGENT    │─packet──►│ CONTEXT     │              │
│  │ FILE     │         │  (triggered) │  query   │ FILE        │              │
│  └──────────┘         └──────┬───────┘         └──────┬──────┘              │
│                              │                        │                      │
│                              │◄───────packet──────────┘                      │
│                              │      response                                 │
│                              ▼                                               │
│                       ┌──────────────┐                                       │
│                       │  AI AGENT    │                                       │
│                       │ (processing) │                                       │
│                       └──────┬───────┘                                       │
│                              │                                               │
│              ┌───────────────┼───────────────┐                               │
│              ▼               ▼               ▼                               │
│       ┌──────────┐    ┌──────────┐    ┌──────────┐                          │
│       │ NEXT     │    │ ASSETS   │    │ DISH     │                          │
│       │ AGENT    │    │ FILE     │    │ (output) │                          │
│       │(handoff) │    │          │    │          │                          │
│       └──────────┘    └──────────┘    └──────────┘                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 New Architecture: Pure Event-Driven State Machine

### Core Principles

1. **NO TIME-BASED TRANSITIONS** (except visual delays for animation)
   - Agent transitions ONLY when specific events occur
   - No "wait 800ms then check" - wait for actual packet arrival

2. **EXPLICIT EVENT TYPES**
   ```typescript
   type AgentEvent = 
     | { type: 'TRIGGER_RECEIVED'; connectionId: string }
     | { type: 'CONTEXT_RESPONSE_RECEIVED'; contextId: string }
     | { type: 'ALL_CONTEXT_RECEIVED' }  // derived event
     | { type: 'PROCESSING_COMPLETE' }   // timer-based (thinking time)
     | { type: 'OUTPUT_SENT' }
   ```

3. **STATE MACHINE WITH GUARDS**
   ```
   idle ──[TRIGGER_RECEIVED]──► querying
   
   querying ──[queries sent]──► awaiting
   querying ──[no context needed]──► processing
   
   awaiting ──[ALL_CONTEXT_RECEIVED]──► processing
   
   processing ──[PROCESSING_COMPLETE]──► outputting
   
   outputting ──[OUTPUT_SENT]──► idle
   ```

---

## 📐 Implementation Plan

### Phase 1: Refactor AgentState

```typescript
interface AgentState {
  id: string;
  phase: AgentPhase;
  phaseStartTime: number;
  
  // Required dependencies (computed from topology)
  requiredContexts: Set<string>;  // Context block IDs this agent queries
  
  // Runtime state
  isTriggered: boolean;
  triggerSource: string | null;   // Connection ID that triggered
  
  // Context tracking - THE KEY PART
  pendingContextResponses: Set<string>;  // Contexts we're waiting for
  receivedContextResponses: Set<string>; // Contexts that responded
  
  // Completion
  outputsSent: boolean;
  cycleCount: number;
}
```

### Phase 2: Refactor Event Handling

```typescript
// Called ONLY when packet reaches destination
handlePacketArrival(packetId: string) {
  const packet = this.packets.get(packetId);
  
  switch (packet.type) {
    case 'input':
    case 'handoff':
      // TRIGGER event - start agent cycle
      this.dispatchEvent(targetAgent, { type: 'TRIGGER_RECEIVED', connectionId });
      break;
      
    case 'response':
      // CONTEXT_RESPONSE event
      this.dispatchEvent(agent, { type: 'CONTEXT_RESPONSE_RECEIVED', contextId });
      // Check if all received
      if (this.allContextsReceived(agent)) {
        this.dispatchEvent(agent, { type: 'ALL_CONTEXT_RECEIVED' });
      }
      break;
  }
}

dispatchEvent(agent: AgentState, event: AgentEvent) {
  switch (agent.phase) {
    case 'idle':
      if (event.type === 'TRIGGER_RECEIVED') {
        this.transitionTo(agent, 'querying');
        this.sendContextQueries(agent);
      }
      break;
      
    case 'awaiting':
      if (event.type === 'ALL_CONTEXT_RECEIVED') {
        this.transitionTo(agent, 'processing');
        this.scheduleProcessingComplete(agent);
      }
      break;
      
    // ... etc
  }
}
```

### Phase 3: Visual Animation Layer (Separate Concern)

```typescript
// Animation durations are VISUAL ONLY
const ANIMATION_DURATIONS = {
  packetTravel: 800,      // How long packet takes to travel along connection
  processingPulse: 1200,  // Visual "thinking" animation
  outputBurst: 400,       // Output animation
};

// Phase indicators are event-driven, not time-driven
// Agent shows "Querying..." when queries sent
// Agent shows "Awaiting..." when waiting for responses
// Agent shows "Processing..." when all responses received
```

---

## 🔧 Key Changes

### Before (Time-Based)
```typescript
case 'awaiting':
  // BAD: Wait fixed time, then check
  if (phaseElapsed >= 800 && this.allContextResponsesReceived(agent)) {
    this.transitionAgent(agent, 'processing');
  }
```

### After (Event-Based)
```typescript
// In handlePacketArrival, when response packet arrives:
case 'response':
  agent.receivedContextResponses.add(contextId);
  agent.pendingContextResponses.delete(contextId);
  
  // Check if ALL responses received - transition immediately
  if (agent.pendingContextResponses.size === 0) {
    this.transitionAgent(agent, 'processing');
  }
```

---

## 🎬 Animation Timing

Animation still needs timing, but it's **visual only**:

1. **Packet Travel Time** = based on connection length (visual)
2. **Processing Animation** = fixed duration (visual "thinking" effect)
3. **State Transitions** = INSTANT when events occur

```typescript
// Packet has progress 0→1 based on animation
// When progress reaches 1.0, packet "arrives" and triggers event
updatePackets(dt: number) {
  for (const packet of this.packets.values()) {
    packet.progress += dt * this.speed / PACKET_TRAVEL_TIME;
    
    if (packet.progress >= 1.0) {
      this.handlePacketArrival(packet.id);  // EVENT!
    }
  }
}
```

---

## 📋 Implementation Checklist

### Step 1: Clean Up State
- [ ] Remove `PHASE_DURATIONS.awaiting` delay
- [ ] Add `pendingContextResponses` Set to AgentState
- [ ] Track which contexts we're waiting for

### Step 2: Fix Event Flow
- [ ] `querying` phase: Send queries, immediately transition to `awaiting`
- [ ] `awaiting` phase: NO TIMER - wait for events only
- [ ] On `response` arrival: Update pendingContextResponses, check if done

### Step 3: Fix Context Response Logic
- [ ] Context files should WAIT for query packet to arrive
- [ ] Only then schedule response packet back
- [ ] Response travels along connection (visual)
- [ ] When response arrives → event → state change

### Step 4: Visual Polish
- [ ] Show phase labels based on actual state
- [ ] Processing animation runs while in 'processing' phase
- [ ] Clear visual distinction between phases

---

## 🚀 Expected Result

```
User clicks Play
       │
       ▼
Input File sends packet ─────────────────────────────────────►
       │                                                      │
       │ (packet travels along connection)                    │
       │                                                      │
       ▼                                                      ▼
Agent receives packet ◄───────────────────────────────────────┘
       │
       │ EVENT: TRIGGER_RECEIVED
       │
       ▼
Agent → 'querying' phase
       │
       │ (sends query packets to context files)
       │
       ▼
Agent → 'awaiting' phase (shows "Waiting for context...")
       │
       │ (query packets travel to context files)
       │ (context files receive queries)
       │ (context files send response packets)
       │ (response packets travel back to agent)
       │
       ▼
Agent receives ALL response packets
       │
       │ EVENT: ALL_CONTEXT_RECEIVED
       │
       ▼
Agent → 'processing' phase (shows "Processing...")
       │
       │ (1200ms visual animation)
       │
       ▼
Agent → 'outputting' phase
       │
       │ (sends output/handoff packets)
       │
       ▼
Agent → 'idle' (cycle complete)
```

---

## 📝 Notes for Implementation

1. **Connection direction matters**:
   - Agent → Context = query (agent initiates)
   - Context → Agent = response (context responds to query)
   - Current topology might have wrong direction for context!

2. **scheduleContextResponse** should:
   - Only be called when query ARRIVES at context file
   - Create response packet going BACK to agent
   - Use existing connection or create reverse path

3. **Testing**:
   - Add console.logs for events
   - Verify: no response before query arrives
   - Verify: processing only after all responses
