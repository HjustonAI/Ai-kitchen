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

// Visual packet representation for rendering
export type DataPacket = {
  id: string;
  connectionId: string;
  progress: number; // 0..1
  type: 'input' | 'query' | 'response' | 'output' | 'handoff';
  fromAgentId?: string;
  isReverse?: boolean; // For response packets traveling backwards
};

interface ExecutionState {
  // Core state
  isRunning: boolean;
  simulationMode: boolean;
  executionSpeed: number;
  
  // Active elements
  activeNodeIds: string[];
  dataPackets: DataPacket[];
  agentPhases: Map<string, AgentPhase>;

  // Actions
  setSimulationMode: (enabled: boolean) => void;
  setExecutionSpeed: (speed: number) => void;
  setAgentPhase: (agentId: string, phase: AgentPhase) => void;
  getAgentPhase: (agentId: string) => AgentPhase;
  onPacketArrived: (packetId: string) => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  // Initial state
  isRunning: false,
  simulationMode: false,
  executionSpeed: 1,
  activeNodeIds: [],
  dataPackets: [],
  agentPhases: new Map(),

  setSimulationMode: (enabled) => {
    set({ simulationMode: enabled, isRunning: enabled });
    if (enabled) {
      executionEngine.start();
    } else {
      executionEngine.stop();
      set({ dataPackets: [], agentPhases: new Map(), activeNodeIds: [] });
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
}));

// ============ Engine Callbacks ============
// Connect engine events to store updates
// Engine is the SINGLE SOURCE OF TRUTH for packet state

executionEngine.setCallbacks({
  onPacketCreated: (packet) => {
    const store = useExecutionStore.getState();
    // Avoid duplicates
    if (store.dataPackets.some(p => p.id === packet.id)) return;
    
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
    useExecutionStore.getState().setAgentPhase(agentId, phase);
  }
});
