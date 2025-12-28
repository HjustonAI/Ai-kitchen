# Performance Optimizations Summary

## 🚀 Implemented Optimizations

### 1. Store Subscription Consolidation

**Problem**: Multiple components had 8-17 individual Zustand subscriptions, each creating separate re-render triggers.

**Solution**: Consolidated subscriptions using `useShallow` from `zustand/react/shallow`.

| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| App.tsx | 17 subscriptions | 1 subscription | 94% |
| Sidebar.tsx | 11 subscriptions | 1 subscription | 91% |
| ContextPanel.tsx | 10 subscriptions | 1 subscription | 90% |
| Block.tsx | 9 subscriptions | 1 subscription | 89% |
| Group.tsx | 7 subscriptions | 1 subscription | 86% |

### 2. Action Functions via getState()

**Problem**: Action functions (like `updateBlock`, `selectBlock`) were being subscribed to via `useStore((s) => s.action)`, causing unnecessary re-renders when other state changed.

**Solution**: Access actions via `useStore.getState()` - they're stable references and don't need reactive subscriptions.

```typescript
// Before (causes re-render on any state change)
const updateBlock = useStore((s) => s.updateBlock);

// After (no subscription, stable reference)
const updateBlock = useCallback((id, data) => 
  useStore.getState().updateBlock(id, data), []);
```

### 3. O(1) Block Lookups

**Problem**: Repeated `blocks.find()` and `blocks.filter()` operations across components (O(n) each time).

**Solution**: Created `useBlockLookup.ts` utility hooks with memoized Maps.

```typescript
// src/lib/useBlockLookup.ts
export const useBlockMap = () => {...}        // Map<id, Block>
export const useBlocksByType = (type) => {...} // Memoized filtered array
export const useConnectedBlocksOfType = (blockId, type) => {...}
```

**Components Updated**:
- ChefBlock, DishBlock - use `useConnectedBlocksOfType`
- ExecutionMonitor - uses `useBlocksByType`, `useBlockMap`
- SidebarExecutionSection - uses `useBlocksByType`, `useBlockMap`

### 4. ExecutionEngine Block Cache

**Problem**: ExecutionEngine used `this.blocks.find()` in hot paths during simulation.

**Solution**: Added internal `blockMap: Map<string, Block>` cache with O(1) lookups.

```typescript
// Rebuilt on topology change
updateTopology(blocks, connections) {
  this.blockMap.clear();
  for (const block of blocks) {
    this.blockMap.set(block.id, block);
  }
}

// O(1) lookup helper
private getBlock(id: string): Block | undefined {
  return this.blockMap.get(id);
}
```

### 5. Previous Critical Fix: Packet Progress Sync

**Problem**: `onPacketProgressUpdated` was called 60 times/sec per packet, causing 1200+ setState calls/sec with 20 packets.

**Solution**: Removed progress sync to store. Canvas reads directly from engine via `engine.getPackets()`.

## 📊 Performance Patterns to Follow

### ✅ Do

1. **Consolidate subscriptions** with `useShallow`:
```typescript
const { a, b, c } = useStore(useShallow((s) => ({ a: s.a, b: s.b, c: s.c })));
```

2. **Access actions via getState()**:
```typescript
const doAction = useCallback(() => useStore.getState().myAction(), []);
```

3. **Use memoized block lookups**:
```typescript
const agents = useBlocksByType('chef');
const blockMap = useBlockMap();
```

4. **Use useCallback for selectors with IDs**:
```typescript
const myPhase = useExecutionStore(
  useCallback((s) => s.agentPhases.get(blockId), [blockId])
);
```

### ❌ Don't

1. **Don't subscribe to actions**:
```typescript
// BAD - creates subscription for stable function
const updateBlock = useStore((s) => s.updateBlock);
```

2. **Don't filter/find in render**:
```typescript
// BAD - O(n) on every render
const dishes = blocks.filter(b => b.type === 'dish');
```

3. **Don't sync high-frequency data to store**:
```typescript
// BAD - 60+ calls/sec per item
onProgress: (id, progress) => set({ progress })
```

## 🔧 Files Modified

- `src/App.tsx` - Consolidated 17→1 subscriptions
- `src/components/Sidebar.tsx` - Consolidated 11→1 subscriptions
- `src/components/ContextPanel.tsx` - Consolidated 10→1 subscriptions
- `src/components/Block.tsx` - Consolidated 9→1 subscriptions, actions via getState
- `src/components/Group.tsx` - Consolidated 7→1 subscriptions
- `src/components/BottomBar.tsx` - Actions via getState
- `src/components/ExecutionMonitor.tsx` - Uses block lookup hooks
- `src/components/SidebarExecutionSection.tsx` - Uses block lookup hooks
- `src/lib/useBlockLookup.ts` - NEW: Performance utility hooks
- `src/lib/executionEngineV2.ts` - Added blockMap cache

## 📈 Expected Impact

With 80+ objects (Zaspani project):
- **Before**: Lag during simulation, 1200+ setState/sec
- **After**: Smooth 60fps, minimal store updates

Key metrics improved:
- Store subscription count reduced by ~85%
- Block lookup operations: O(n) → O(1)
- Packet progress updates: 60/sec/packet → 0 (direct engine access)
