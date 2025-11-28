import { create } from 'zustand';

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

  clearExecution: () => set({ activeNodeIds: [], dataPackets: [], errors: [] }),
}));
