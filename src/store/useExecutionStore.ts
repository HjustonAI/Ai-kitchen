/**
 * Execution Store - State management for the animation/simulation system
 * 
 * Integrates with ExecutionEngine v2.0 (Event-Driven State Machine)
 * 
 * States:
 * - stopped: No simulation, everything reset
 * - ready: Simulation mode active, waiting for user to trigger inputs
 * - running: Packets are moving, simulation is live
 * - paused: Simulation frozen, can inspect packets
 * 
 * Flow:
 * 1. User enters simulation mode → 'ready' state
 * 2. User clicks Play or triggers input → 'running' state  
 * 3. User can pause → 'paused' state (packets frozen)
 * 4. User exits simulation → 'stopped' state (reset)
 */

import { create } from 'zustand';
import { executionEngine, type AgentPhase } from '../lib/executionEngineV2';
import { ExecutionLogManager } from '../components/ExecutionLog';
import { useStore } from './useStore';

// Simulation state machine
export type SimulationState = 'stopped' | 'ready' | 'running' | 'paused';

// Visual packet representation for rendering
export type DataPacket = {
  id: string;
  connectionId: string;
  progress: number; // 0..1
  type: 'input' | 'query' | 'response' | 'output' | 'handoff';
  fromAgentId?: string;
  isReverse?: boolean; // For response packets traveling backwards
};

// Block visual states for execution feedback
export type ContextBlockState = 'idle' | 'receiving' | 'processing' | 'sending';
export type InputBlockState = 'idle' | 'sending';
export type DishBlockState = 'idle' | 'receiving' | 'complete';

// Collecting progress for agent
export interface CollectingProgress {
  received: number;
  total: number;
}

interface ExecutionState {
  // Core state - new state machine
  simulationState: SimulationState;
  executionSpeed: number;
  
  // Legacy compatibility (derived from simulationState)
  isRunning: boolean;
  simulationMode: boolean;
  
  // Active elements
  activeNodeIds: string[];
  dataPackets: DataPacket[];
  agentPhases: Map<string, AgentPhase>;
  
  // Block visual states (Phase 2 feedback)
  contextStates: Map<string, ContextBlockState>;
  inputStates: Map<string, InputBlockState>;
  dishStates: Map<string, DishBlockState>;
  
  // Collecting progress (Phase 4)
  collectingProgress: Map<string, CollectingProgress>;
  
  // Packet inspection (for paused state)
  selectedPacketId: string | null;

  // Actions - new state machine
  enterSimulation: () => void;     // stopped → ready
  exitSimulation: () => void;      // * → stopped  
  play: () => void;                // ready/paused → running (auto-triggers all inputs)
  pause: () => void;               // running → paused
  resume: () => void;              // paused → running
  triggerInput: (blockId: string) => void;  // Manual trigger single input (in ready/running)
  selectPacket: (packetId: string | null) => void;
  
  // Legacy action (for backward compatibility)
  setSimulationMode: (enabled: boolean) => void;
  
  setExecutionSpeed: (speed: number) => void;
  setAgentPhase: (agentId: string, phase: AgentPhase) => void;
  getAgentPhase: (agentId: string) => AgentPhase;
  onPacketArrived: (packetId: string) => void;
  
  // Block state actions
  setContextState: (blockId: string, state: ContextBlockState) => void;
  setInputState: (blockId: string, state: InputBlockState) => void;
  setDishState: (blockId: string, state: DishBlockState) => void;
  setCollectingProgress: (agentId: string, received: number, total: number) => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  // Initial state
  simulationState: 'stopped',
  executionSpeed: 1,
  
  // Legacy compatibility (derived)
  isRunning: false,
  simulationMode: false,
  
  activeNodeIds: [],
  dataPackets: [],
  agentPhases: new Map(),
  contextStates: new Map(),
  inputStates: new Map(),
  dishStates: new Map(),
  collectingProgress: new Map(),
  selectedPacketId: null,

  // Enter simulation mode (stopped → ready)
  enterSimulation: () => {
    ExecutionLogManager.addEvent('simulation_enter', {});
    executionEngine.enterReady();
    set({ 
      simulationState: 'ready',
      simulationMode: true,
      isRunning: false,
    });
  },

  // Exit simulation (reset everything)
  exitSimulation: () => {
    ExecutionLogManager.addEvent('simulation_exit', {});
    executionEngine.stop();
    set({ 
      simulationState: 'stopped',
      simulationMode: false,
      isRunning: false,
      dataPackets: [], 
      agentPhases: new Map(), 
      activeNodeIds: [],
      contextStates: new Map(),
      inputStates: new Map(),
      dishStates: new Map(),
      collectingProgress: new Map(),
      selectedPacketId: null,
    });
  },

  // Play (ready → running, triggers all inputs)
  play: () => {
    const state = get().simulationState;
    if (state !== 'ready' && state !== 'paused') return;
    
    ExecutionLogManager.addEvent('simulation_play', {});
    
    if (state === 'ready') {
      // Start fresh - trigger all inputs
      executionEngine.start();
    } else {
      // Resume from pause
      executionEngine.resume();
    }
    
    set({ 
      simulationState: 'running',
      isRunning: true,
    });
  },

  // Pause (running → paused)
  pause: () => {
    if (get().simulationState !== 'running') return;
    
    ExecutionLogManager.addEvent('simulation_pause', {});
    executionEngine.pause();
    set({ 
      simulationState: 'paused',
      isRunning: false,
    });
  },

  // Resume (paused → running)
  resume: () => {
    if (get().simulationState !== 'paused') return;
    
    ExecutionLogManager.addEvent('simulation_resume', {});
    executionEngine.resume();
    set({ 
      simulationState: 'running',
      isRunning: true,
    });
  },

  // Trigger single input block manually
  triggerInput: (blockId: string) => {
    const state = get().simulationState;
    if (state !== 'ready' && state !== 'running') return;
    
    ExecutionLogManager.addEvent('manual_trigger', { blockId });
    
    // If in ready state, transition to running
    if (state === 'ready') {
      executionEngine.startWithoutAutoTrigger();
      set({ 
        simulationState: 'running',
        isRunning: true,
      });
    }
    
    // Trigger the specific input
    executionEngine.triggerInputBlock(blockId);
  },

  // Select packet for inspection
  selectPacket: (packetId) => {
    set({ selectedPacketId: packetId });
  },

  // Legacy compatibility
  setSimulationMode: (enabled) => {
    if (enabled) {
      get().enterSimulation();
      get().play();
    } else {
      get().exitSimulation();
    }
  },
  
  setExecutionSpeed: (speed) => {
    set({ executionSpeed: speed });
    executionEngine.setSpeed(speed);
  },

  setAgentPhase: (agentId, phase) => set((s) => {
    const newPhases = new Map(s.agentPhases);
    newPhases.set(agentId, phase);
    
    // Update activeNodeIds based on phase
    // Agent is "active" when collecting or processing
    let newActiveIds = s.activeNodeIds.filter(id => id !== agentId);
    if (phase === 'collecting' || phase === 'processing') {
      newActiveIds = [...newActiveIds, agentId];
    }
    
    return { agentPhases: newPhases, activeNodeIds: newActiveIds };
  }),

  getAgentPhase: (agentId) => {
    return get().agentPhases.get(agentId) || 'idle';
  },

  onPacketArrived: (packetId) => {
    // Only remove packet from visual state
    // Engine handles all logic internally via its own update loop
    set((s) => ({ dataPackets: s.dataPackets.filter(p => p.id !== packetId) }));
  },
  
  // Block state setters
  setContextState: (blockId, state) => set((s) => {
    const newStates = new Map(s.contextStates);
    if (state === 'idle') {
      newStates.delete(blockId);
    } else {
      newStates.set(blockId, state);
    }
    return { contextStates: newStates };
  }),
  
  setInputState: (blockId, state) => set((s) => {
    const newStates = new Map(s.inputStates);
    if (state === 'idle') {
      newStates.delete(blockId);
    } else {
      newStates.set(blockId, state);
    }
    return { inputStates: newStates };
  }),
  
  setDishState: (blockId, state) => set((s) => {
    const newStates = new Map(s.dishStates);
    if (state === 'idle') {
      newStates.delete(blockId);
    } else {
      newStates.set(blockId, state);
    }
    return { dishStates: newStates };
  }),
  
  setCollectingProgress: (agentId, received, total) => set((s) => {
    const newProgress = new Map(s.collectingProgress);
    if (total === 0) {
      newProgress.delete(agentId);
    } else {
      newProgress.set(agentId, { received, total });
    }
    return { collectingProgress: newProgress };
  }),
}));

// ============ Engine Callbacks ============
// Connect engine events to store updates
// Engine is the SINGLE SOURCE OF TRUTH for packet state

// Helper to get block name for logging
const getBlockName = (blockId: string): string => {
  const block = useStore.getState().blocks.find(b => b.id === blockId);
  return block?.title || blockId.slice(0, 8);
};

// Helper to get connection endpoints for logging
const getConnectionEndpoints = (connectionId: string): { from: string; to: string } => {
  const conn = useStore.getState().connections.find(c => c.id === connectionId);
  if (!conn) return { from: '?', to: '?' };
  return { from: getBlockName(conn.fromId), to: getBlockName(conn.toId) };
};

executionEngine.setCallbacks({
  onPacketCreated: (packet) => {
    const store = useExecutionStore.getState();
    // Avoid duplicates
    if (store.dataPackets.some(p => p.id === packet.id)) return;
    
    // Log event
    const endpoints = getConnectionEndpoints(packet.connectionId);
    ExecutionLogManager.addEvent('packet_created', {
      packetType: packet.type,
      fromBlock: (packet as any).isReverse ? endpoints.to : endpoints.from,
      toBlock: (packet as any).isReverse ? endpoints.from : endpoints.to,
    });
    
    useExecutionStore.setState((s) => ({
      dataPackets: [...s.dataPackets, {
        id: packet.id,
        connectionId: packet.connectionId,
        progress: 0,
        type: packet.type,
        fromAgentId: packet.fromAgentId,
        isReverse: (packet as any).isReverse,
      }]
    }));
  },
  
  onPacketRemoved: (packetId) => {
    // Engine says packet is done - remove from visual state
    const packet = useExecutionStore.getState().dataPackets.find(p => p.id === packetId);
    if (packet) {
      ExecutionLogManager.addEvent('packet_completed', {
        packetType: packet.type,
      });
    }
    
    useExecutionStore.setState((s) => ({
      dataPackets: s.dataPackets.filter(p => p.id !== packetId)
    }));
  },
  
  // NOTE: onPacketProgressUpdated REMOVED for performance!
  // Progress is managed directly by executionEngine, canvas reads via engine.getPackets()
  // This was causing 60+ setState calls per packet per second
  
  onAgentPhaseChanged: (agentId, phase) => {
    ExecutionLogManager.addEvent('phase_changed', {
      agentName: getBlockName(agentId),
      phase: phase,
    });
    useExecutionStore.getState().setAgentPhase(agentId, phase);
  },
  
  // Block state callbacks (Phase 2 visual feedback)
  onContextStateChanged: (blockId, state) => {
    if (state !== 'idle') {
      ExecutionLogManager.addEvent('context_state', {
        contextName: getBlockName(blockId),
        state: state,
      });
    }
    useExecutionStore.getState().setContextState(blockId, state);
  },
  
  onInputStateChanged: (blockId, state) => {
    useExecutionStore.getState().setInputState(blockId, state);
  },
  
  onDishStateChanged: (blockId, state) => {
    if (state !== 'idle') {
      ExecutionLogManager.addEvent('dish_state', {
        dishName: getBlockName(blockId),
        state: state,
      });
    }
    useExecutionStore.getState().setDishState(blockId, state);
  },
  
  // Collecting progress callback (Phase 4)
  onCollectingProgress: (agentId, received, total) => {
    useExecutionStore.getState().setCollectingProgress(agentId, received, total);
  },
});
