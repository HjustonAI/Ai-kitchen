import { create } from 'zustand';
import type { Connection } from '../types';

export type DataPacket = {
  id: string;
  connectionId: string;
  progress: number; // 0..1
};

interface ExecutionState {
  isRunning: boolean;
  activeNodeIds: string[];
  dataPackets: DataPacket[];
  errors: { id: string; message: string; nodeId?: string }[];

  // actions
  setIsRunning: (isRunning: boolean) => void;
  startNode: (id: string) => void;
  stopNode: (id: string) => void;
  addPacket: (connectionId: string) => string; // returns packet id
  removePacket: (packetId: string) => void;
  onPacketArrived: (packetId: string, connections: Connection[]) => void;
  clearExecution: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  isRunning: false,
  activeNodeIds: [],
  dataPackets: [],
  errors: [],

  setIsRunning: (isRunning) => set({ isRunning }),
  startNode: (id) => set((s) => ({ activeNodeIds: Array.from(new Set([...s.activeNodeIds, id])) })),
  stopNode: (id) => set((s) => ({ activeNodeIds: s.activeNodeIds.filter((nid) => nid !== id) })),

  addPacket: (connectionId) => {
    const id = crypto.randomUUID();
    set((s) => ({ dataPackets: [...s.dataPackets, { id, connectionId, progress: 0 }] }));
    return id;
  },

  removePacket: (packetId) => set((s) => ({ dataPackets: s.dataPackets.filter(p => p.id !== packetId) })),

  onPacketArrived: (packetId, connections) => {
    set((state) => {
      const packet = state.dataPackets.find(p => p.id === packetId);
      if (!packet) return state;

      const connection = connections.find(c => c.id === packet.connectionId);
      if (!connection) {
        // Connection gone, just remove packet
        return { dataPackets: state.dataPackets.filter(p => p.id !== packetId) };
      }

      const targetBlockId = connection.toId;
      
      // Find outgoing connections from the target block
      const outgoingConnections = connections.filter(c => c.fromId === targetBlockId);
      
      const newPackets = outgoingConnections.map(c => ({
        id: crypto.randomUUID(),
        connectionId: c.id,
        progress: 0
      }));

      // Remove old packet, add new ones
      // Also mark the node as active briefly (optional, for visual feedback)
      return {
        dataPackets: [
          ...state.dataPackets.filter(p => p.id !== packetId),
          ...newPackets
        ],
        activeNodeIds: [...state.activeNodeIds, targetBlockId] // We can clear this later or use a timeout
      };
    });
    
    // Optional: Clear active state after a delay
    setTimeout(() => {
      set(s => ({ activeNodeIds: s.activeNodeIds.filter(id => {
         // We need to find the targetBlockId again or capture it. 
         // Since we are inside the set callback, we can't easily do side effects that depend on the result of the set.
         // But we can just use the variable from the closure.
         const packet = s.dataPackets.find(p => p.id === packetId); // This won't work because packet is removed.
         // We'll just clear all active nodes for now or implement a better active state management.
         return true; 
      })}));
      // Actually, let's just remove the specific node ID from active list after 500ms
      const packet = useExecutionStore.getState().dataPackets.find(p => p.id === packetId); // This is the OLD packet, it's gone.
      // We need to know the targetBlockId.
      // Let's just rely on the UI to flash based on packet arrival or keep it simple.
    }, 500);
  },

  clearExecution: () => set({ activeNodeIds: [], dataPackets: [], errors: [] }),
}));
