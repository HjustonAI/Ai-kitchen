/**
 * Execution Store - State management for the animation/simulation system
 * 
 * Integrates with ExecutionEngine for logical flow
 */

import { create } from 'zustand';
import type { Connection } from '../types';
import { executionEngine, type FlowPacket, type AgentPhase } from '../lib/executionEngine';

export type DataPacket = {
  id: string;
  connectionId: string;
  progress: number; // 0..1
  type: 'input' | 'query' | 'response' | 'output' | 'handoff';
  fromAgentId?: string;
};

interface ExecutionState {
  isRunning: boolean;
  activeNodeIds: string[];
  dataPackets: DataPacket[];
  errors: { id: string; message: string; nodeId?: string }[];
  
  // Agent phase states for visual feedback
  agentPhases: Map<string, AgentPhase>;

  // actions
  setIsRunning: (isRunning: boolean) => void;
  startNode: (id: string) => void;
  stopNode: (id: string) => void;
  addPacket: (connectionId: string) => string; // returns packet id
  removePacket: (packetId: string) => void;
  onPacketArrived: (packetId: string, connections: Connection[]) => void;
  clearExecution: () => void;
  
  // Agent phase management
  setAgentPhase: (agentId: string, phase: AgentPhase) => void;
  getAgentPhase: (agentId: string) => AgentPhase;

  // Animation/Simulation Control
  simulationMode: boolean;
  executionSpeed: number; // 1x, 2x, etc.
  setSimulationMode: (enabled: boolean) => void;
  setExecutionSpeed: (speed: number) => void;
  
  // New: Engine-based packet management
  syncPacketsFromEngine: (packets: FlowPacket[]) => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  isRunning: false,
  activeNodeIds: [],
  dataPackets: [],
  errors: [],
  simulationMode: false,
  executionSpeed: 1,
  agentPhases: new Map(),

  setIsRunning: (isRunning) => set({ isRunning }),
  startNode: (id) => set((s) => ({ activeNodeIds: Array.from(new Set([...s.activeNodeIds, id])) })),
  stopNode: (id) => set((s) => ({ activeNodeIds: s.activeNodeIds.filter((nid) => nid !== id) })),

  addPacket: (connectionId) => {
    const id = crypto.randomUUID();
    set((s) => ({ 
      dataPackets: [...s.dataPackets, { 
        id, 
        connectionId, 
        progress: 0,
        type: 'input' as const
      }] 
    }));
    return id;
  },

  removePacket: (packetId) => set((s) => ({ 
    dataPackets: s.dataPackets.filter(p => p.id !== packetId) 
  })),

  onPacketArrived: (packetId, _connections) => {
    const state = get();
    const packet = state.dataPackets.find(p => p.id === packetId);
    
    // Remove the packet
    set((s) => ({ dataPackets: s.dataPackets.filter(p => p.id !== packetId) }));
    
    if (!packet) return;

    // Notify the execution engine
    executionEngine.handlePacketArrival(packetId);
  },

  clearExecution: () => set({ 
    activeNodeIds: [], 
    dataPackets: [], 
    errors: [],
    agentPhases: new Map()
  }),

  setAgentPhase: (agentId, phase) => set((s) => {
    const newPhases = new Map(s.agentPhases);
    newPhases.set(agentId, phase);
    
    // Update activeNodeIds based on phase
    let newActiveIds = [...s.activeNodeIds];
    if (phase === 'processing' || phase === 'querying') {
      // Agent is active/thinking
      if (!newActiveIds.includes(agentId)) {
        newActiveIds.push(agentId);
      }
    } else {
      // Agent is not actively processing
      newActiveIds = newActiveIds.filter(id => id !== agentId);
    }
    
    return { 
      agentPhases: newPhases,
      activeNodeIds: newActiveIds
    };
  }),

  getAgentPhase: (agentId) => {
    return get().agentPhases.get(agentId) || 'idle';
  },

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

  syncPacketsFromEngine: (packets) => {
    const dataPackets: DataPacket[] = packets.map(p => ({
      id: p.id,
      connectionId: p.connectionId,
      progress: p.progress,
      type: p.type,
      fromAgentId: p.fromAgentId
    }));
    set({ dataPackets });
  }
}));

// Setup engine callbacks
executionEngine.setCallbacks({
  onPacketCreated: (packet) => {
    const store = useExecutionStore.getState();
    const existing = store.dataPackets.find(p => p.id === packet.id);
    if (!existing) {
      useExecutionStore.setState((s) => ({
        dataPackets: [...s.dataPackets, {
          id: packet.id,
          connectionId: packet.connectionId,
          progress: 0,
          type: packet.type,
          fromAgentId: packet.fromAgentId
        }]
      }));
    }
  },
  onAgentPhaseChanged: (agentId, phase) => {
    useExecutionStore.getState().setAgentPhase(agentId, phase);
  }
});
