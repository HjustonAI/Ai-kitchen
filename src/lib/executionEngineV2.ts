/**
 * Execution Engine v2.0 - Event-Driven State Machine
 * 
 * ARCHITECTURE:
 * - Agent transitions are EVENT-DRIVEN, not time-based
 * - Context responses only sent AFTER query arrives
 * - Agent waits for ALL context responses before processing
 * 
 * FLOW:
 * 1. Input/Handoff packet arrives → TRIGGER_RECEIVED event → Agent starts
 * 2. Agent sends query packets to context files
 * 3. Query packets travel → arrive at context → QUERY_ARRIVED event
 * 4. Context file sends response packet back
 * 5. Response packets travel → arrive at agent → RESPONSE_RECEIVED event
 * 6. When ALL responses received → Agent processes
 * 7. Agent outputs → cycle complete
 */

import type { Block, Connection } from '../types';

// ============ Types ============

export type AgentPhase = 
  | 'idle'           // Waiting for trigger (shows "Waiting for input...")
  | 'collecting'     // Collecting context - sending queries & waiting for responses
  | 'processing'     // "Thinking" - has visual duration
  | 'outputting';    // Sending outputs (brief visual phase)

export interface AgentState {
  id: string;
  phase: AgentPhase;
  phaseStartTime: number;
  
  // Computed from topology
  contextBlockIds: Set<string>;        // Context blocks this agent can query
  hasInputConnection: boolean;          // True if connected to input_file or upstream agent
  
  // Trigger state
  isTriggered: boolean;
  triggerConnectionId: string | null;
  
  // Context tracking - KEY FOR EVENT-DRIVEN FLOW
  queriesSent: boolean;                 // True after queries dispatched
  pendingContexts: Set<string>;         // Context IDs we're waiting for
  receivedContexts: Set<string>;        // Context IDs that responded
  
  // Output tracking
  outputsSent: boolean;
  cycleCount: number;
}

export interface FlowPacket {
  id: string;
  connectionId: string;
  type: 'input' | 'query' | 'response' | 'output' | 'handoff';
  fromAgentId?: string;
  targetContextId?: string;  // For query packets
  progress: number;
  createdAt: number;
}

// ============ Configuration ============

// ONLY visual durations - state transitions are EVENT-DRIVEN
const VISUAL_DURATIONS = {
  collectingQueryDelay: 300,  // Brief delay before sending queries
  processingPhase: 1200,      // Visual "thinking" time
  outputtingPhase: 300,       // Brief visual before outputs sent
};

const PACKET_BASE_SPEED = 0.0015; // Progress per ms (adjust for visual speed)

// ============ Engine Class ============

export class ExecutionEngine {
  private agents: Map<string, AgentState> = new Map();
  private packets: Map<string, FlowPacket> = new Map();
  private blocks: Block[] = [];
  private connections: Connection[] = [];
  private speed: number = 1;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private lastUpdate: number = 0;
  private packetIdCounter: number = 0;
  
  // Performance cache: O(1) block lookups
  private blockMap: Map<string, Block> = new Map();
  
  // Callbacks
  onPacketCreated?: (packet: FlowPacket) => void;
  onPacketRemoved?: (packetId: string) => void;
  onPacketProgressUpdated?: (packetId: string, progress: number) => void;
  onAgentPhaseChanged?: (agentId: string, phase: AgentPhase) => void;
  
  // Block state callbacks (for visual feedback)
  onContextStateChanged?: (blockId: string, state: 'idle' | 'receiving' | 'processing' | 'sending') => void;
  onInputStateChanged?: (blockId: string, state: 'idle' | 'sending') => void;
  onDishStateChanged?: (blockId: string, state: 'idle' | 'receiving' | 'complete') => void;
  
  // Collecting progress callback (for UI display)
  onCollectingProgress?: (agentId: string, received: number, total: number) => void;
  
  // Helper: O(1) block lookup
  private getBlock(id: string): Block | undefined {
    return this.blockMap.get(id);
  }

  // ============ Setup ============

  setCallbacks(callbacks: {
    onPacketCreated?: (packet: FlowPacket) => void;
    onPacketRemoved?: (packetId: string) => void;
    onPacketProgressUpdated?: (packetId: string, progress: number) => void;
    onAgentPhaseChanged?: (agentId: string, phase: AgentPhase) => void;
    onContextStateChanged?: (blockId: string, state: 'idle' | 'receiving' | 'processing' | 'sending') => void;
    onInputStateChanged?: (blockId: string, state: 'idle' | 'sending') => void;
    onDishStateChanged?: (blockId: string, state: 'idle' | 'receiving' | 'complete') => void;
    onCollectingProgress?: (agentId: string, received: number, total: number) => void;
  }) {
    this.onPacketCreated = callbacks.onPacketCreated;
    this.onPacketRemoved = callbacks.onPacketRemoved;
    this.onPacketProgressUpdated = callbacks.onPacketProgressUpdated;
    this.onAgentPhaseChanged = callbacks.onAgentPhaseChanged;
    this.onContextStateChanged = callbacks.onContextStateChanged;
    this.onInputStateChanged = callbacks.onInputStateChanged;
    this.onDishStateChanged = callbacks.onDishStateChanged;
    this.onCollectingProgress = callbacks.onCollectingProgress;
  }

  updateTopology(blocks: Block[], connections: Connection[]) {
    this.blocks = blocks;
    this.connections = connections;
    
    // Rebuild block cache for O(1) lookups
    this.blockMap.clear();
    for (const block of blocks) {
      this.blockMap.set(block.id, block);
    }
    
    const chefBlocks = blocks.filter(b => b.type === 'chef');
    
    // Add/update agents
    for (const chef of chefBlocks) {
      if (!this.agents.has(chef.id)) {
        this.agents.set(chef.id, this.createAgentState(chef.id));
      } else {
        // Update dependencies
        const agent = this.agents.get(chef.id)!;
        agent.contextBlockIds = this.computeContextDependencies(chef.id);
        agent.hasInputConnection = this.hasInputConnection(chef.id);
      }
    }
    
    // Remove agents for deleted blocks
    for (const [id] of this.agents) {
      if (!chefBlocks.find(b => b.id === id)) {
        this.agents.delete(id);
      }
    }
  }

  private computeContextDependencies(agentId: string): Set<string> {
    const contextIds = new Set<string>();
    
    for (const conn of this.connections) {
      // Context connections: Context → Agent (context files connect TO agent)
      if (conn.toId === agentId) {
        const fromBlock = this.getBlock(conn.fromId);
        if (fromBlock?.type === 'context_file') {
          contextIds.add(conn.fromId);
        }
      }
    }
    
    return contextIds;
  }

  private hasInputConnection(agentId: string): boolean {
    // Check if agent has any incoming connection from input_file or another chef
    for (const conn of this.connections) {
      if (conn.toId === agentId) {
        const fromBlock = this.getBlock(conn.fromId);
        if (fromBlock?.type === 'input_file' || fromBlock?.type === 'chef') {
          return true;
        }
      }
    }
    return false;
  }

  private createAgentState(id: string): AgentState {
    return {
      id,
      phase: 'idle',
      phaseStartTime: Date.now(),
      contextBlockIds: this.computeContextDependencies(id),
      hasInputConnection: this.hasInputConnection(id),
      isTriggered: false,
      triggerConnectionId: null,
      queriesSent: false,
      pendingContexts: new Set(),
      receivedContexts: new Set(),
      outputsSent: false,
      cycleCount: 0,
    };
  }

  // ============ Control ============

  // Enter ready mode (simulation mode but not auto-triggering)
  enterReady() {
    this.isRunning = false;
    this.isPaused = false;
    this.packets.clear();
    
    // Reset all agents to idle
    for (const [id] of this.agents) {
      this.agents.set(id, this.createAgentState(id));
    }
  }

  // Start with auto-trigger (play from ready state)
  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.lastUpdate = Date.now();
    
    // Send initial triggers after short delay
    setTimeout(() => {
      if (this.isRunning && !this.isPaused) {
        this.sendInitialTriggers();
      }
    }, 500);
  }

  // Start without auto-trigger (for manual input triggering)
  startWithoutAutoTrigger() {
    this.isRunning = true;
    this.isPaused = false;
    this.lastUpdate = Date.now();
  }

  // Pause (freeze packets in place)
  pause() {
    this.isPaused = true;
  }

  // Resume from pause
  resume() {
    this.isPaused = false;
    this.lastUpdate = Date.now(); // Reset delta to avoid time jump
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.packets.clear();
    
    for (const [id] of this.agents) {
      this.agents.set(id, this.createAgentState(id));
    }
  }

  // Manually trigger a specific input_file block
  triggerInputBlock(blockId: string) {
    const block = this.getBlock(blockId);
    if (!block || block.type !== 'input_file') {
      console.warn(`[Engine] Block ${blockId} not found or not input_file`);
      return;
    }

    const outConnections = this.connections.filter(c => c.fromId === blockId);
    
    // Visual feedback: input file sending
    this.onInputStateChanged?.(blockId, 'sending');
    
    for (const conn of outConnections) {
      this.createPacket(conn.id, 'input');
    }
    
    // Reset to idle after brief visual
    setTimeout(() => {
      this.onInputStateChanged?.(blockId, 'idle');
    }, 500);
  }

  setSpeed(speed: number) {
    this.speed = speed;
  }

  // Direct access to packets for canvas rendering (bypasses store for performance)
  getPackets(): FlowPacket[] {
    return Array.from(this.packets.values());
  }

  // ============ Main Update Loop ============

  update(timestamp: number): FlowPacket[] {
    if (!this.isRunning || this.isPaused) return Array.from(this.packets.values());

    const dt = timestamp - this.lastUpdate;
    this.lastUpdate = timestamp;

    // Update packet positions
    this.updatePackets(dt);
    
    // Update agent visual timers (processing animation etc)
    this.updateAgentTimers();

    return Array.from(this.packets.values());
  }

  private updatePackets(dt: number) {
    const arrivedPackets: string[] = [];
    
    for (const [id, packet] of this.packets) {
      // Update progress based on speed
      const oldProgress = packet.progress;
      packet.progress += dt * PACKET_BASE_SPEED * this.speed;
      
      // Notify progress update for visualization sync
      if (packet.progress !== oldProgress) {
        this.onPacketProgressUpdated?.(id, Math.min(packet.progress, 1.0));
      }
      
      // Check if arrived
      if (packet.progress >= 1.0) {
        arrivedPackets.push(id);
      }
    }
    
    // Process arrivals (EVENT-DRIVEN!)
    for (const packetId of arrivedPackets) {
      this.handlePacketArrival(packetId);
    }
  }

  private updateAgentTimers() {
    const now = Date.now();

    for (const [, agent] of this.agents) {
      const phaseElapsed = now - agent.phaseStartTime;

      switch (agent.phase) {
        case 'idle':
          // Waiting for trigger event - no timer needed
          // Agent stays here until input/handoff packet arrives
          break;

        case 'collecting':
          // Collecting context phase - send queries after brief delay, then wait for responses
          if (!agent.queriesSent && phaseElapsed >= VISUAL_DURATIONS.collectingQueryDelay / this.speed) {
            this.executeContextQueries(agent);
            agent.queriesSent = true;
            
            // If no context to collect, move directly to processing
            if (agent.pendingContexts.size === 0) {
              this.transitionAgent(agent, 'processing');
            }
            // Otherwise stay in 'collecting' until all responses arrive (EVENT-DRIVEN)
          }
          // Note: Transition to 'processing' happens in handlePacketArrival when all responses received
          break;

        case 'processing':
          // Visual "thinking" animation
          if (phaseElapsed >= VISUAL_DURATIONS.processingPhase / this.speed) {
            this.transitionAgent(agent, 'outputting');
          }
          break;

        case 'outputting':
          // Brief visual, then send outputs
          if (phaseElapsed >= VISUAL_DURATIONS.outputtingPhase / this.speed) {
            this.executeOutputs(agent);
            this.resetAgentCycle(agent);
          }
          break;
      }
    }
  }

  // ============ Event Handlers ============

  /**
   * CORE EVENT HANDLER - Called when packet reaches destination
   * This drives ALL state transitions (except visual timers)
   */
  private handlePacketArrival(packetId: string) {
    const packet = this.packets.get(packetId);
    if (!packet) return;

    const connection = this.connections.find(c => c.id === packet.connectionId);
    if (!connection) {
      this.packets.delete(packetId);
      return;
    }

    // Packet arrival is handled internally - no external callback needed

    console.log(`[Packet ${packet.type}] Arrived via connection ${connection.id.slice(0,8)}`);

    switch (packet.type) {
      case 'input':
      case 'handoff': {
        // TRIGGER EVENT - Start agent cycle (collecting context)
        const agent = this.agents.get(connection.toId);
        console.log(`[Input/Handoff] Target agent: ${connection.toId.slice(0,8)}, found: ${!!agent}, phase: ${agent?.phase}`);
        if (agent && agent.phase === 'idle' && !agent.isTriggered) {
          agent.isTriggered = true;
          agent.triggerConnectionId = connection.id;
          this.transitionAgent(agent, 'collecting');
        }
        break;
      }

      case 'query': {
        // QUERY ARRIVED at context file
        // Query travels REVERSE on connection (Agent → Context via Context→Agent connection)
        // So destination is connection.fromId (the context file)
        const isReverse = (packet as any).isReverse === true;
        const contextBlockId = isReverse ? connection.fromId : connection.toId;
        const requestingAgentId = packet.fromAgentId;
        
        console.log(`[Query] Arrived at context ${contextBlockId.slice(0,8)} from agent ${requestingAgentId?.slice(0,8)}`);
        
        // Visual feedback: context file receiving query
        this.onContextStateChanged?.(contextBlockId, 'receiving');
        
        if (requestingAgentId) {
          // Brief processing delay then send response
          setTimeout(() => {
            this.onContextStateChanged?.(contextBlockId, 'processing');
          }, 100);
          
          setTimeout(() => {
            this.sendContextResponse(contextBlockId, requestingAgentId);
          }, 200);
        }
        break;
      }

      case 'response': {
        // RESPONSE ARRIVED at agent
        const agent = packet.fromAgentId ? this.agents.get(packet.fromAgentId) : null;
        const contextBlockId = connection.fromId;
        
        console.log(`[Response] From context ${contextBlockId.slice(0,8)} to agent ${packet.fromAgentId?.slice(0,8)}, pending: ${agent?.pendingContexts.size}`);
        
        // Agent must be in 'collecting' phase to receive responses
        if (agent && agent.phase === 'collecting') {
          // Mark this context as received
          agent.receivedContexts.add(contextBlockId);
          agent.pendingContexts.delete(contextBlockId);
          
          console.log(`[Response] Received! Remaining pending: ${agent.pendingContexts.size}`);
          
          // Notify collecting progress for UI display
          const total = agent.contextBlockIds.size;
          const received = agent.receivedContexts.size;
          this.onCollectingProgress?.(agent.id, received, total);
          
          // Check if ALL responses received → transition to processing
          if (agent.pendingContexts.size === 0) {
            this.transitionAgent(agent, 'processing');
          }
        }
        break;
      }

      case 'output': {
        // Output arrived at dish/assets - task complete
        const dishBlockId = connection.toId;
        
        // Visual feedback: dish receiving then complete
        this.onDishStateChanged?.(dishBlockId, 'receiving');
        
        setTimeout(() => {
          this.onDishStateChanged?.(dishBlockId, 'complete');
        }, 300);
        
        setTimeout(() => {
          this.onDishStateChanged?.(dishBlockId, 'idle');
        }, 2000);
        break;
      }
    }

    // Remove packet after processing and notify store
    this.packets.delete(packetId);
    this.onPacketRemoved?.(packetId);
  }

  // ============ Flow Actions ============

  private sendInitialTriggers() {
    const inputFiles = this.blocks.filter(b => b.type === 'input_file');
    const triggeredAgents = new Set<string>();
    
    let delay = 0;
    for (const input of inputFiles) {
      const outConnections = this.connections.filter(c => c.fromId === input.id);
      
      for (const conn of outConnections) {
        if (triggeredAgents.has(conn.toId)) continue;
        triggeredAgents.add(conn.toId);
        
        const inputId = input.id; // Capture for closure
        setTimeout(() => {
          if (this.isRunning) {
            // Visual feedback: input file sending
            this.onInputStateChanged?.(inputId, 'sending');
            
            this.createPacket(conn.id, 'input');
            
            // Reset to idle after brief visual
            setTimeout(() => {
              this.onInputStateChanged?.(inputId, 'idle');
            }, 500);
          }
        }, delay);
        delay += 800;
      }
    }
  }

  private executeContextQueries(agent: AgentState) {
    // Find all context connections TO this agent (Context → Agent)
    const contextConnections = this.connections.filter(c =>
      c.toId === agent.id &&
      this.getBlock(c.fromId)?.type === 'context_file'
    );

    // Clear previous state
    agent.pendingContexts.clear();
    agent.receivedContexts.clear();

    console.log(`[Agent ${agent.id.slice(0,8)}] Sending queries to ${contextConnections.length} context files`);

    // Send query packets (traveling "backwards" along the connection)
    for (const conn of contextConnections) {
      const contextBlockId = conn.fromId;
      agent.pendingContexts.add(contextBlockId);
      
      // Query travels FROM agent TO context (reverse direction of connection)
      // isReverse=true makes packet travel visually from Agent to Context
      const packet = this.createPacket(conn.id, 'query', agent.id, true);
      packet.targetContextId = contextBlockId;
    }
  }

  private sendContextResponse(contextBlockId: string, requestingAgentId: string) {
    // Connection is Context → Agent, so response travels in NORMAL direction
    const responseConnection = this.connections.find(c =>
      c.fromId === contextBlockId &&
      c.toId === requestingAgentId
    );

    if (responseConnection) {
      console.log(`[Context ${contextBlockId.slice(0,8)}] Sending response to Agent ${requestingAgentId.slice(0,8)}`);
      
      // Visual feedback: context file sending response
      this.onContextStateChanged?.(contextBlockId, 'sending');
      
      // Reset to idle after brief visual
      setTimeout(() => {
        this.onContextStateChanged?.(contextBlockId, 'idle');
      }, 500);
      
      // Response travels normally along Context → Agent connection
      const packet = this.createPacket(responseConnection.id, 'response', requestingAgentId);
      packet.fromAgentId = requestingAgentId;
      // isReverse = false (default) - travels in normal direction
    } else {
      // Fallback: directly mark as received (no visual packet)
      console.warn(`[Context ${contextBlockId.slice(0,8)}] No connection to agent - marking as received`);
      const agent = this.agents.get(requestingAgentId);
      if (agent) {
        agent.receivedContexts.add(contextBlockId);
        agent.pendingContexts.delete(contextBlockId);
        
        if (agent.pendingContexts.size === 0 && agent.phase === 'collecting') {
          this.transitionAgent(agent, 'processing');
        }
      }
    }
  }

  private executeOutputs(agent: AgentState) {
    const outputConnections = this.connections.filter(c => {
      if (c.fromId !== agent.id) return false;
      const targetBlock = this.getBlock(c.toId);
      return targetBlock?.type === 'dish' || targetBlock?.type === 'chef';
    });

    for (const conn of outputConnections) {
      const targetBlock = this.getBlock(conn.toId);
      const packetType = targetBlock?.type === 'chef' ? 'handoff' : 'output';
      this.createPacket(conn.id, packetType, agent.id);
    }
    
    agent.outputsSent = true;
  }

  private resetAgentCycle(agent: AgentState) {
    agent.isTriggered = false;
    agent.triggerConnectionId = null;
    agent.queriesSent = false;
    agent.pendingContexts.clear();
    agent.receivedContexts.clear();
    agent.outputsSent = false;
    agent.cycleCount++;
    this.transitionAgent(agent, 'idle');
  }

  // ============ Packet Management ============

  private createPacket(connectionId: string, type: FlowPacket['type'], fromAgentId?: string, isReverse: boolean = false): FlowPacket {
    const packet: FlowPacket = {
      id: `packet-${this.packetIdCounter++}`,
      connectionId,
      type,
      fromAgentId,
      progress: 0,
      createdAt: Date.now(),
    };
    
    // Set isReverse BEFORE callback so store gets correct value
    (packet as any).isReverse = isReverse;
    
    this.packets.set(packet.id, packet);
    this.onPacketCreated?.(packet);
    
    return packet;
  }

  // ============ State Transitions ============

  private transitionAgent(agent: AgentState, newPhase: AgentPhase) {
    const oldPhase = agent.phase;
    agent.phase = newPhase;
    agent.phaseStartTime = Date.now();
    
    console.log(`[Agent ${agent.id.slice(0,8)}] ${oldPhase} → ${newPhase}`);
    
    // Notify collecting progress when entering collecting phase
    if (newPhase === 'collecting') {
      const total = agent.contextBlockIds.size;
      this.onCollectingProgress?.(agent.id, 0, total);
    }
    
    // Clear collecting progress when leaving collecting phase  
    if (oldPhase === 'collecting' && newPhase !== 'collecting') {
      this.onCollectingProgress?.(agent.id, 0, 0); // Reset
    }
    
    this.onAgentPhaseChanged?.(agent.id, newPhase);
  }

  // ============ Getters ============

  getAgentState(agentId: string): AgentState | undefined {
    return this.agents.get(agentId);
  }

  getAllAgentStates(): AgentState[] {
    return Array.from(this.agents.values());
  }
}

// Singleton instance
export const executionEngine = new ExecutionEngine();
