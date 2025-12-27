/**
 * Execution Engine - Logical Flow for Agentic System Animation
 * 
 * This models the real flow of an agentic system:
 * 1. Input arrives at agent
 * 2. Agent queries context files (request-response pattern)
 * 3. Agent processes the combined information
 * 4. Agent outputs to next stage or produces final output
 */

import type { Block, Connection } from '../types';

// ============ Types ============

export type AgentPhase = 
  | 'idle'           // Waiting for input
  | 'receiving'      // Input packet arriving
  | 'querying'       // Sending queries to context files
  | 'awaiting'       // Waiting for context responses
  | 'processing'     // "Thinking" - combining input with context
  | 'outputting';    // Sending output to next stage

export interface AgentState {
  id: string;
  phase: AgentPhase;
  phaseStartTime: number;
  inputReceived: boolean;
  contextQueriesSent: Set<string>;    // IDs of context files queried
  contextResponsesReceived: Set<string>; // IDs of responses received
  outputsSent: Set<string>;           // IDs of connections used for output
  cycleCount: number;                 // How many full cycles completed
}

export interface FlowPacket {
  id: string;
  connectionId: string;
  type: 'input' | 'query' | 'response' | 'output' | 'handoff';
  fromAgentId?: string;  // For queries/outputs, which agent initiated
  progress: number;
  createdAt: number;
}

export interface ExecutionEngineState {
  agents: Map<string, AgentState>;
  packets: Map<string, FlowPacket>;
  isRunning: boolean;
  speed: number;
}

// ============ Configuration ============

const PHASE_DURATIONS: Record<AgentPhase, number> = {
  idle: 0,           // Instant transition when input arrives
  receiving: 0,      // Handled by packet arrival
  querying: 500,     // Time to "decide" to query context
  awaiting: 0,       // Handled by response arrival
  processing: 1500,  // "Thinking" time
  outputting: 500,   // Time to send outputs
};

const BASE_CYCLE_DELAY = 3000; // Delay before starting a new cycle

// ============ Engine Class ============

export class ExecutionEngine {
  private agents: Map<string, AgentState> = new Map();
  private packets: Map<string, FlowPacket> = new Map();
  private blocks: Block[] = [];
  private connections: Connection[] = [];
  private speed: number = 1;
  private isRunning: boolean = false;
  private lastUpdate: number = 0;
  private packetIdCounter: number = 0;
  
  // Callbacks
  private onPacketCreated?: (packet: FlowPacket) => void;
  private onPacketArrived?: (packet: FlowPacket) => void;
  private onAgentPhaseChanged?: (agentId: string, phase: AgentPhase) => void;

  // ============ Setup ============

  setCallbacks(callbacks: {
    onPacketCreated?: (packet: FlowPacket) => void;
    onPacketArrived?: (packet: FlowPacket) => void;
    onAgentPhaseChanged?: (agentId: string, phase: AgentPhase) => void;
  }) {
    this.onPacketCreated = callbacks.onPacketCreated;
    this.onPacketArrived = callbacks.onPacketArrived;
    this.onAgentPhaseChanged = callbacks.onAgentPhaseChanged;
  }

  updateTopology(blocks: Block[], connections: Connection[]) {
    this.blocks = blocks;
    this.connections = connections;
    
    // Initialize/update agent states for chef blocks
    const chefBlocks = blocks.filter(b => b.type === 'chef');
    
    // Add new agents
    for (const chef of chefBlocks) {
      if (!this.agents.has(chef.id)) {
        this.agents.set(chef.id, this.createAgentState(chef.id));
      }
    }
    
    // Remove agents for deleted blocks
    for (const [id] of this.agents) {
      if (!chefBlocks.find(b => b.id === id)) {
        this.agents.delete(id);
      }
    }
  }

  private createAgentState(id: string): AgentState {
    return {
      id,
      phase: 'idle',
      phaseStartTime: Date.now(),
      inputReceived: false,
      contextQueriesSent: new Set(),
      contextResponsesReceived: new Set(),
      outputsSent: new Set(),
      cycleCount: 0,
    };
  }

  // ============ Control ============

  start() {
    this.isRunning = true;
    this.lastUpdate = Date.now();
    
    // Start initial inputs after a short delay
    setTimeout(() => {
      if (this.isRunning) {
        this.triggerInitialInputs();
      }
    }, 500);
  }

  stop() {
    this.isRunning = false;
    this.packets.clear();
    
    // Reset all agents to idle
    for (const [id] of this.agents) {
      this.agents.set(id, this.createAgentState(id));
    }
  }

  setSpeed(speed: number) {
    this.speed = speed;
  }

  // ============ Main Update Loop ============

  update(timestamp: number): FlowPacket[] {
    if (!this.isRunning) return [];

    const dt = (timestamp - this.lastUpdate) * this.speed;
    this.lastUpdate = timestamp;

    // Update agent states
    this.updateAgents(dt);

    // Return current packets for rendering
    return Array.from(this.packets.values());
  }

  private updateAgents(_dt: number) {
    const now = Date.now();

    for (const [, agent] of this.agents) {
      const phaseDuration = PHASE_DURATIONS[agent.phase] / this.speed;
      const phaseElapsed = now - agent.phaseStartTime;

      switch (agent.phase) {
        case 'idle':
          // Check if enough time passed for a new cycle
          if (agent.cycleCount > 0) {
            const cycleDelay = BASE_CYCLE_DELAY / this.speed;
            if (phaseElapsed < cycleDelay) continue;
          }
          // Look for incoming connections from input_file or other agents
          this.checkForInputs(agent);
          break;

        case 'querying':
          // After querying phase, send context queries
          if (phaseElapsed >= phaseDuration) {
            this.sendContextQueries(agent);
            this.transitionAgent(agent, 'awaiting');
          }
          break;

        case 'awaiting':
          // Check if all context responses received
          if (this.allContextResponsesReceived(agent)) {
            this.transitionAgent(agent, 'processing');
          }
          break;

        case 'processing':
          // After processing, send outputs
          if (phaseElapsed >= phaseDuration) {
            this.transitionAgent(agent, 'outputting');
          }
          break;

        case 'outputting':
          // Send outputs and reset
          if (phaseElapsed >= phaseDuration) {
            this.sendOutputs(agent);
            this.resetAgentCycle(agent);
          }
          break;
      }
    }
  }

  // ============ Flow Logic ============

  private triggerInitialInputs() {
    // Find input_file blocks and trigger their flow
    const inputFiles = this.blocks.filter(b => b.type === 'input_file');
    
    for (const input of inputFiles) {
      const outConnections = this.connections.filter(c => c.fromId === input.id);
      
      // Stagger the inputs
      outConnections.forEach((conn, index) => {
        setTimeout(() => {
          if (this.isRunning) {
            this.createPacket(conn.id, 'input');
          }
        }, index * 400);
      });
    }
  }

  private checkForInputs(agent: AgentState) {
    // Find connections TO this agent from input_file or other chef blocks
    const incomingFromInput = this.connections.filter(c => 
      c.toId === agent.id && 
      this.blocks.find(b => b.id === c.fromId)?.type === 'input_file'
    );
    
    const incomingFromAgents = this.connections.filter(c =>
      c.toId === agent.id &&
      this.blocks.find(b => b.id === c.fromId)?.type === 'chef'
    );

    // If there are input connections and agent is idle, start a new cycle
    if (incomingFromInput.length > 0 || incomingFromAgents.length > 0) {
      // Trigger input packets
      for (const conn of incomingFromInput) {
        this.createPacket(conn.id, 'input');
      }
      
      // For agent handoffs, the packets will come from the outputting agent
      // Just transition to receiving
      if (incomingFromInput.length > 0) {
        this.transitionAgent(agent, 'querying');
      }
    }
  }

  private sendContextQueries(agent: AgentState) {
    // Find connections FROM this agent TO context_file blocks
    const contextConnections = this.connections.filter(c =>
      c.fromId === agent.id &&
      this.blocks.find(b => b.id === c.toId)?.type === 'context_file'
    );

    if (contextConnections.length === 0) {
      // No context to query, skip to processing
      return;
    }

    // Send query packets
    for (const conn of contextConnections) {
      this.createPacket(conn.id, 'query', agent.id);
      agent.contextQueriesSent.add(conn.toId);
    }
  }

  private allContextResponsesReceived(agent: AgentState): boolean {
    // If no queries were sent, we're done
    if (agent.contextQueriesSent.size === 0) return true;
    
    // Check if all queried contexts have responded
    for (const contextId of agent.contextQueriesSent) {
      if (!agent.contextResponsesReceived.has(contextId)) {
        return false;
      }
    }
    return true;
  }

  private sendOutputs(agent: AgentState) {
    // Find connections FROM this agent TO dish or other chef blocks
    const outputConnections = this.connections.filter(c =>
      c.fromId === agent.id &&
      this.blocks.find(b => b.id === c.toId && (b.type === 'dish' || b.type === 'chef'))
    );

    for (const conn of outputConnections) {
      const targetBlock = this.blocks.find(b => b.id === conn.toId);
      const packetType = targetBlock?.type === 'chef' ? 'handoff' : 'output';
      this.createPacket(conn.id, packetType, agent.id);
      agent.outputsSent.add(conn.id);
    }
  }

  private resetAgentCycle(agent: AgentState) {
    agent.inputReceived = false;
    agent.contextQueriesSent.clear();
    agent.contextResponsesReceived.clear();
    agent.outputsSent.clear();
    agent.cycleCount++;
    this.transitionAgent(agent, 'idle');
  }

  // ============ Packet Management ============

  private createPacket(connectionId: string, type: FlowPacket['type'], fromAgentId?: string): FlowPacket {
    const packet: FlowPacket = {
      id: `packet-${this.packetIdCounter++}`,
      connectionId,
      type,
      fromAgentId,
      progress: 0,
      createdAt: Date.now(),
    };
    
    this.packets.set(packet.id, packet);
    this.onPacketCreated?.(packet);
    
    return packet;
  }

  /**
   * Called by the render layer when a packet reaches its destination
   */
  handlePacketArrival(packetId: string) {
    const packet = this.packets.get(packetId);
    if (!packet) return;

    const connection = this.connections.find(c => c.id === packet.connectionId);
    if (!connection) return;

    this.onPacketArrived?.(packet);

    // Handle different packet types
    switch (packet.type) {
      case 'input':
        // Input arrived at agent, agent should start querying
        // (handled in checkForInputs)
        break;

      case 'query':
        // Query arrived at context file - schedule response
        this.scheduleContextResponse(connection, packet.fromAgentId);
        break;

      case 'response':
        // Response arrived at agent
        if (packet.fromAgentId) {
          const agent = this.agents.get(packet.fromAgentId);
          if (agent) {
            agent.contextResponsesReceived.add(connection.fromId);
          }
        }
        break;

      case 'handoff':
        // Handoff arrived at next agent - trigger their cycle
        const targetAgent = this.agents.get(connection.toId);
        if (targetAgent && targetAgent.phase === 'idle') {
          this.transitionAgent(targetAgent, 'querying');
        }
        break;

      case 'output':
        // Output arrived at dish - celebration effect handled by render layer
        break;
    }

    // Remove the packet
    this.packets.delete(packetId);
  }

  private scheduleContextResponse(queryConnection: Connection, requestingAgentId?: string) {
    // Find the reverse connection (context_file → agent)
    // Or create a virtual response on the same connection in reverse
    
    // Look for existing reverse connection
    const reverseConnection = this.connections.find(c =>
      c.fromId === queryConnection.toId &&
      c.toId === queryConnection.fromId
    );

    // If there's a reverse connection, use it
    if (reverseConnection) {
      setTimeout(() => {
        if (this.isRunning) {
          const responsePacket = this.createPacket(reverseConnection.id, 'response', requestingAgentId);
          responsePacket.fromAgentId = requestingAgentId;
        }
      }, 300 + Math.random() * 400); // Simulate "lookup" time
    } else {
      // No reverse connection - immediately mark as received
      if (requestingAgentId) {
        const agent = this.agents.get(requestingAgentId);
        if (agent) {
          setTimeout(() => {
            agent.contextResponsesReceived.add(queryConnection.toId);
          }, 500);
        }
      }
    }
  }

  // ============ State Transitions ============

  private transitionAgent(agent: AgentState, newPhase: AgentPhase) {
    agent.phase = newPhase;
    agent.phaseStartTime = Date.now();
    this.onAgentPhaseChanged?.(agent.id, newPhase);
  }

  // ============ Getters ============

  getAgentState(agentId: string): AgentState | undefined {
    return this.agents.get(agentId);
  }

  getAllAgentStates(): AgentState[] {
    return Array.from(this.agents.values());
  }

  getPackets(): FlowPacket[] {
    return Array.from(this.packets.values());
  }

  getActivePacketIds(): Set<string> {
    return new Set(this.packets.keys());
  }
}

// Singleton instance
export const executionEngine = new ExecutionEngine();
