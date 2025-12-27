/**
 * Execution Store - State management for the animation/simulation system
 * 
 * Integrates with ExecutionEngine v2.0 (Event-Driven State Machine)
 * 
 * Flow:
 * 1. User clicks Play → setSimulationMode(true) → engine.start()
 * 2. Engine sends packets only from input_file blocks
 * 3. Packets trigger agent state transitions (idle → collecting → processing → outputting)
 * 4. Context files only respond to query packets from agents
 */

import { create } from 'zustand';
import { executionEngine, type AgentPhase } from '../lib/executionEngineV2';
import { ExecutionLogManager } from '../components/ExecutionLog';
import { useStore } from './useStore';

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
  // Core state
  isRunning: boolean;
  simulationMode: boolean;
  executionSpeed: number;
  
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

  // Actions
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
  isRunning: false,
  simulationMode: false,
  executionSpeed: 1,
  activeNodeIds: [],
  dataPackets: [],
  agentPhases: new Map(),
  contextStates: new Map(),
  inputStates: new Map(),
  dishStates: new Map(),
  collectingProgress: new Map(),

  setSimulationMode: (enabled) => {
    set({ simulationMode: enabled, isRunning: enabled });
    if (enabled) {
      ExecutionLogManager.addEvent('simulation_start', {});
      executionEngine.start();
    } else {
      ExecutionLogManager.addEvent('simulation_stop', {});
      executionEngine.stop();
      set({ 
        dataPackets: [], 
        agentPhases: new Map(), 
        activeNodeIds: [],
        contextStates: new Map(),
        inputStates: new Map(),
        dishStates: new Map(),
        collectingProgress: new Map(),
      });
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
  
  onPacketProgressUpdated: (packetId, progress) => {
    // Sync progress from engine to store for visualization
    useExecutionStore.setState((s) => ({
      dataPackets: s.dataPackets.map(p => 
        p.id === packetId ? { ...p, progress } : p
      )
    }));
  },
  
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
