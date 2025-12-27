import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import { getLayoutedElements, getBlockDimensions } from '../lib/layoutUtils';
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

  selectionPriority: 'group' | 'block';

  // Actions
  addBlock: (type: BlockType) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  selectBlock: (id: string | null, multi?: boolean) => void;
  setDraggingBlock: (id: string | null, pos: { x: number; y: number } | null) => void;
  setSelectionPriority: (priority: 'group' | 'block') => void;

  addGroup: () => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  selectGroup: (id: string | null) => void;
  toggleGroupCollapse: (id: string) => void;

  addConnection: (fromId: string, toId: string) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  selectConnection: (id: string | null) => void;
  setConnectingSourceId: (id: string | null) => void;
  setHoveredBlockId: (id: string | null) => void;
  setTempConnectionPos: (pos: { x: number; y: number } | null) => void;

  updateView: (updates: Partial<ViewState>) => void;
  focusBlock: (id: string) => void;
  clearBoard: () => void;
  layoutBoard: () => void;
  loadState: (data: { blocks: Block[], connections: Connection[], groups?: Group[] }) => void;
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
        selectionPriority: 'block',

        addBlock: (type) => {
          const { view, blocks } = get();
          // Calculate center of current view
          const centerX = (-view.x + window.innerWidth / 2) / view.scale;
          const centerY = (-view.y + window.innerHeight / 2) / view.scale;

          const dims = getBlockDimensions(type, 1);

          const newBlock: Block = {
            id: crypto.randomUUID(),
            type,
            title: type === 'chef' ? 'Agent' : type === 'ingredients' ? 'Dane' : type === 'dish' ? 'Wynik' : type === 'note' ? 'Notatka' : type === 'context_file' ? 'Kontekst' : 'Input',
            description: '',
            x: centerX - 144 + (Math.random() * 50 - 25),
            y: centerY - 100 + (Math.random() * 50 - 25),
            width: dims.width,
            height: dims.height,
            data: {},
          };

          set({
            blocks: [...blocks, newBlock],
            selectedId: newBlock.id,
            selectedBlockIds: [newBlock.id],
            highlightedBlockIds: [newBlock.id],
            highlightedConnectionIds: [],
          });
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
        setSelectionPriority: (priority) => set({ selectionPriority: priority }),

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
          const { groups, blocks } = get();
          const oldGroup = groups.find(g => g.id === id);

          // Check if this is a move operation (not a resize)
          // Resizing usually includes width/height updates
          const isResize = updates.width !== undefined || updates.height !== undefined;

          if (oldGroup && !isResize && (updates.x !== undefined || updates.y !== undefined)) {
            const dx = (updates.x !== undefined ? updates.x : oldGroup.x) - oldGroup.x;
            const dy = (updates.y !== undefined ? updates.y : oldGroup.y) - oldGroup.y;

            if (dx !== 0 || dy !== 0) {
              // Find blocks that were inside the OLD group position
              const blocksToMove = blocks.filter(b => {
                const dims = getBlockDimensions(b.type, 1);
                const bCenterX = b.x + dims.width / 2;
                const bCenterY = b.y + dims.height / 2;
                return (
                  bCenterX >= oldGroup.x &&
                  bCenterX <= oldGroup.x + oldGroup.width &&
                  bCenterY >= oldGroup.y &&
                  bCenterY <= oldGroup.y + oldGroup.height
                );
              });

              if (blocksToMove.length > 0) {
                const movedBlockIds = new Set(blocksToMove.map(b => b.id));
                set(state => ({
                  groups: state.groups.map(g => g.id === id ? { ...g, ...updates } : g),
                  blocks: state.blocks.map(b =>
                    movedBlockIds.has(b.id)
                      ? { ...b, x: b.x + dx, y: b.y + dy }
                      : b
                  )
                }));
                return;
              }
            }
          }

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
          const { groups, blocks } = get();
          const group = groups.find(g => g.id === id);
          let highlightedBlockIds: string[] = [];
          let blocksInGroup: string[] = [];

          if (group) {
            // Find blocks inside the group
            blocksInGroup = blocks.filter(b => {
              const dims = getBlockDimensions(b.type, 1);
              const bCenterX = b.x + dims.width / 2;
              const bCenterY = b.y + dims.height / 2;

              return (
                bCenterX >= group.x &&
                bCenterX <= group.x + group.width &&
                bCenterY >= group.y &&
                bCenterY <= group.y + group.height
              );
            }).map(b => b.id);

            highlightedBlockIds = blocksInGroup;
          }

          set({
            selectedGroupId: id,
            selectedId: null,
            selectedBlockIds: blocksInGroup,
            selectedConnectionId: null,
            highlightedBlockIds,
            highlightedConnectionIds: []
          });
        },

        toggleGroupCollapse: (id) => {
          set((state) => ({
            groups: state.groups.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)),
          }));
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

        focusBlock: (id) => {
          const { blocks, view } = get();
          const block = blocks.find((b) => b.id === id);
          if (block) {
            const dims = getBlockDimensions(block.type, view.scale);
            const blockCenterX = block.x + dims.width / 2;
            const blockCenterY = block.y + dims.height / 2;

            // Center the view on the block
            // view.x + blockCenterX * view.scale = window.innerWidth / 2
            // view.x = window.innerWidth / 2 - blockCenterX * view.scale

            const newX = window.innerWidth / 2 - blockCenterX * view.scale;
            const newY = window.innerHeight / 2 - blockCenterY * view.scale;

            set({ view: { ...view, x: newX, y: newY } });

            // Also select the block
            get().selectBlock(id);
          }
        },

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
          const { blocks, connections, groups } = get();
          const { layoutedBlocks, layoutedGroups } = getLayoutedElements(blocks, groups, connections, 'LR');
          set({ blocks: layoutedBlocks, groups: layoutedGroups });
        },

        loadState: (data) => set({
          blocks: data.blocks,
          connections: data.connections,
          groups: data.groups || [],
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
          selectionPriority: state.selectionPriority,
        }),
      }
    ),
    {
      limit: 50,
      partialize: (state) => {
        const { blocks, groups, connections } = state;
        return { blocks, groups, connections };
      },
      equality: (pastState, currentState) => {
        return JSON.stringify(pastState) === JSON.stringify(currentState);
      },
      onSave: () => {
        // Optional debug
        // console.log('[Zundo] Saved');
      },
    }
  )
);
