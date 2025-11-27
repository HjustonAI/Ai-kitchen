import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import { getLayoutedElements } from '../lib/layoutUtils';
import { getConnectedElements } from '../lib/graphUtils';
import type { Block, BlockType, Connection, Group } from '../types';

interface ViewState {
  x: number;
  y: number;
  scale: number;
}

interface AppState {
  blocks: Block[];
  groups: Group[];
  connections: Connection[];
  view: ViewState;
  selectedId: string | null;
  selectedBlockIds: string[]; // New: Multi-selection support
  selectedGroupId: string | null;
  selectedConnectionId: string | null;
  
  highlightedBlockIds: string[];
  highlightedConnectionIds: string[];

  connectingSourceId: string | null;
  hoveredBlockId: string | null;
  tempConnectionPos: { x: number; y: number } | null;
  draggingBlockId: string | null;
  draggingPos: { x: number; y: number } | null;
  
  // Actions
  addBlock: (type: BlockType) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  selectBlock: (id: string | null, multi?: boolean) => void;
  setDraggingBlock: (id: string | null, pos: { x: number; y: number } | null) => void;

  addGroup: () => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  selectGroup: (id: string | null) => void;
  
  addConnection: (fromId: string, toId: string) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  selectConnection: (id: string | null) => void;
  setConnectingSourceId: (id: string | null) => void;
  setHoveredBlockId: (id: string | null) => void;
  setTempConnectionPos: (pos: { x: number; y: number } | null) => void;
  
  updateView: (updates: Partial<ViewState>) => void;
  clearBoard: () => void;
  layoutBoard: () => void;
  loadState: (data: { blocks: Block[], connections: Connection[] }) => void;
}

// Helper to calculate highlights based on current selection
const calculateHighlights = (selectedBlockIds: string[], blocks: Block[], connections: Connection[]) => {
  if (selectedBlockIds.length === 0) {
    return { highlightedBlockIds: [], highlightedConnectionIds: [] };
  }

  const allConnectedBlocks = new Set<string>();
  const allConnectedConnections = new Set<string>();

  selectedBlockIds.forEach(blockId => {
    const { connectedBlockIds, connectedConnectionIds } = getConnectedElements(blockId, blocks, connections);
    connectedBlockIds.forEach(id => allConnectedBlocks.add(id));
    connectedConnectionIds.forEach(id => allConnectedConnections.add(id));
  });

  return {
    highlightedBlockIds: Array.from(allConnectedBlocks),
    highlightedConnectionIds: Array.from(allConnectedConnections)
  };
};

export const useStore = create<AppState>()(
  temporal(
    persist(
      (set, get) => ({
        blocks: [],
        groups: [],
        connections: [],
        view: { x: 0, y: 0, scale: 1 },
        selectedId: null,
        selectedBlockIds: [],
        selectedGroupId: null,
        selectedConnectionId: null,
        highlightedBlockIds: [],
        highlightedConnectionIds: [],
        connectingSourceId: null,
        hoveredBlockId: null,
        tempConnectionPos: null,
        draggingBlockId: null,
        draggingPos: null,

        addBlock: (type) => {
          const { view } = get();
          // Calculate center of current view
          const centerX = (-view.x + window.innerWidth / 2) / view.scale;
          const centerY = (-view.y + window.innerHeight / 2) / view.scale;

          const newBlock: Block = {
            id: crypto.randomUUID(),
            type,
            title: type === 'chef' ? 'Agent' : type === 'ingredients' ? 'Dane' : type === 'dish' ? 'Wynik' : 'Notatka',
            description: '',
            x: centerX - 144 + (Math.random() * 50 - 25),
            y: centerY - 100 + (Math.random() * 50 - 25),
          };

          set((state) => ({
            blocks: [...state.blocks, newBlock],
            selectedId: newBlock.id,
            selectedBlockIds: [newBlock.id],
            highlightedBlockIds: [newBlock.id],
            highlightedConnectionIds: [],
          }));
        },

        updateBlock: (id, updates) => {
          set((state) => ({
            blocks: state.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
          }));
        },

        deleteBlock: (id) => {
          set((state) => {
            // If deleting a block that is part of multi-selection, remove it from there too
            // If the main selectedId is deleted, try to pick another one from selectedBlockIds or null
            const newSelectedBlockIds = state.selectedBlockIds.filter(bid => bid !== id);
            const newSelectedId = state.selectedId === id 
              ? (newSelectedBlockIds.length > 0 ? newSelectedBlockIds[0] : null) 
              : state.selectedId;

            const newBlocks = state.blocks.filter((b) => b.id !== id);
            const newConnections = state.connections.filter((c) => c.fromId !== id && c.toId !== id);

            const { highlightedBlockIds, highlightedConnectionIds } = calculateHighlights(newSelectedBlockIds, newBlocks, newConnections);

            return {
              blocks: newBlocks,
              connections: newConnections,
              selectedId: newSelectedId,
              selectedBlockIds: newSelectedBlockIds,
              highlightedBlockIds,
              highlightedConnectionIds
            };
          });
        },

        selectBlock: (id, multi = false) => {
          set((state) => {
            if (id === null) {
              return { 
                selectedId: null, 
                selectedBlockIds: [], 
                selectedConnectionId: null, 
                selectedGroupId: null,
                highlightedBlockIds: [],
                highlightedConnectionIds: []
              };
            }

            let newSelectedBlockIds = multi ? [...state.selectedBlockIds] : [id];
            
            if (multi) {
              if (newSelectedBlockIds.includes(id)) {
                // Toggle off if already selected, unless it's the only one (optional behavior, but standard is toggle)
                newSelectedBlockIds = newSelectedBlockIds.filter(bid => bid !== id);
              } else {
                newSelectedBlockIds.push(id);
              }
            }

            // If we deselected everything via toggle, clear selectedId
            const newSelectedId = newSelectedBlockIds.length > 0 ? newSelectedBlockIds[newSelectedBlockIds.length - 1] : null;

            const { highlightedBlockIds, highlightedConnectionIds } = calculateHighlights(newSelectedBlockIds, state.blocks, state.connections);

            return { 
              selectedId: newSelectedId, 
              selectedBlockIds: newSelectedBlockIds,
              selectedConnectionId: null, 
              selectedGroupId: null,
              highlightedBlockIds,
              highlightedConnectionIds
            };
          });
        },

        setDraggingBlock: (id, pos) => set({ draggingBlockId: id, draggingPos: pos }),

        addGroup: () => {
          const { view } = get();
          const centerX = (-view.x + window.innerWidth / 2) / view.scale;
          const centerY = (-view.y + window.innerHeight / 2) / view.scale;

          const newGroup: Group = {
            id: crypto.randomUUID(),
            title: 'New Group',
            x: centerX - 200,
            y: centerY - 150,
            width: 400,
            height: 300,
            color: 'blue'
          };

          set((state) => ({
            groups: [...state.groups, newGroup],
            selectedGroupId: newGroup.id,
            selectedId: null,
            selectedConnectionId: null
          }));
        },

        updateGroup: (id, updates) => {
          set((state) => ({
            groups: state.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
          }));
        },

        deleteGroup: (id) => {
          set((state) => ({
            groups: state.groups.filter((g) => g.id !== id),
            selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
          }));
        },

        selectGroup: (id) => {
          set({ 
            selectedGroupId: id, 
            selectedId: null, 
            selectedBlockIds: [], 
            selectedConnectionId: null,
            highlightedBlockIds: [],
            highlightedConnectionIds: []
          });
        },

        addConnection: (fromId, toId) => {
          const { connections, selectedBlockIds, blocks } = get();
          const exists = connections.some(
            (c) => (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId)
          );

          if (!exists) {
            const newConnection = {
              id: crypto.randomUUID(),
              fromId,
              toId,
              type: 'default' as const,
            };
            
            const newConnections = [...connections, newConnection];
            const { highlightedBlockIds, highlightedConnectionIds } = calculateHighlights(selectedBlockIds, blocks, newConnections);

            set({
              connections: newConnections,
              highlightedBlockIds,
              highlightedConnectionIds
            });
          }
        },

        updateConnection: (id, updates) => {
          set((state) => ({
            connections: state.connections.map((c) => (c.id === id ? { ...c, ...updates } : c)),
          }));
        },

        deleteConnection: (id) => {
          set((state) => {
            const newConnections = state.connections.filter((c) => c.id !== id);
            const { highlightedBlockIds, highlightedConnectionIds } = calculateHighlights(state.selectedBlockIds, state.blocks, newConnections);

            return {
              connections: newConnections,
              selectedConnectionId: state.selectedConnectionId === id ? null : state.selectedConnectionId,
              highlightedBlockIds,
              highlightedConnectionIds
            };
          });
        },

        selectConnection: (id) => {
          set({ 
            selectedConnectionId: id, 
            selectedId: null, 
            selectedBlockIds: [], 
            selectedGroupId: null,
            highlightedBlockIds: [],
            highlightedConnectionIds: []
          });
        },

        setConnectingSourceId: (id) => set({ connectingSourceId: id }),
        setHoveredBlockId: (id) => set({ hoveredBlockId: id }),
        setTempConnectionPos: (pos) => set({ tempConnectionPos: pos }),

        updateView: (updates) => set((state) => ({ view: { ...state.view, ...updates } })),

        clearBoard: () => set({ 
          blocks: [], 
          groups: [], 
          connections: [], 
          selectedId: null, 
          selectedBlockIds: [], 
          selectedGroupId: null, 
          selectedConnectionId: null,
          highlightedBlockIds: [],
          highlightedConnectionIds: []
        }),
        
        layoutBoard: () => {
          const { blocks, connections } = get();
          const layoutedBlocks = getLayoutedElements(blocks, connections, 'LR');
          set({ blocks: layoutedBlocks });
        },

        loadState: (data) => set({ 
          blocks: data.blocks, 
          connections: data.connections,
          groups: [], // TODO: Add groups to export/import
          selectedId: null,
          selectedBlockIds: [],
          selectedGroupId: null,
          selectedConnectionId: null,
          highlightedBlockIds: [],
          highlightedConnectionIds: []
        }),
      }),
      {
        name: 'ai-kitchen-storage',
        partialize: (state) => ({
          blocks: state.blocks,
          groups: state.groups,
          connections: state.connections,
          view: state.view,
        }),
      }
    ),
    {
      partialize: (state) => {
        const { blocks, groups, connections } = state;
        return { blocks, groups, connections };
      },
    }
  )
);
