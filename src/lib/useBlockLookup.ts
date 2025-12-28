/**
 * Performance Optimization: Cached Block Lookups
 * 
 * Creates O(1) lookup maps from blocks array.
 * Memoized to prevent recreation on every render.
 */

import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { Block, Connection } from '../types';

/**
 * Hook providing O(1) block lookup by ID
 * Only re-creates map when blocks array changes
 */
export function useBlockMap(): Map<string, Block> {
  const blocks = useStore((s) => s.blocks);
  return useMemo(() => new Map(blocks.map(b => [b.id, b])), [blocks]);
}

/**
 * Hook providing blocks filtered by type
 * Only re-computes when blocks array changes
 */
export function useBlocksByType(type: Block['type']): Block[] {
  const blocks = useStore((s) => s.blocks);
  return useMemo(() => blocks.filter(b => b.type === type), [blocks, type]);
}

/**
 * Hook providing connections indexed by target block ID
 * Useful for finding all connections TO a specific block
 */
export function useConnectionsToBlock(blockId: string): Connection[] {
  const connections = useStore((s) => s.connections);
  return useMemo(
    () => connections.filter(c => c.toId === blockId),
    [connections, blockId]
  );
}

/**
 * Hook providing connections indexed by source block ID
 * Useful for finding all connections FROM a specific block
 */
export function useConnectionsFromBlock(blockId: string): Connection[] {
  const connections = useStore((s) => s.connections);
  return useMemo(
    () => connections.filter(c => c.fromId === blockId),
    [connections, blockId]
  );
}

/**
 * Hook providing connected blocks of specific type
 * Used by ChefBlock to get ingredients, contexts, inputs
 */
export function useConnectedBlocksOfType(
  blockId: string, 
  type: Block['type'],
  direction: 'incoming' | 'outgoing' = 'incoming'
): Block[] {
  const blocks = useStore((s) => s.blocks);
  const connections = useStore((s) => s.connections);
  
  return useMemo(() => {
    const blockMap = new Map(blocks.map(b => [b.id, b]));
    
    if (direction === 'incoming') {
      return connections
        .filter(c => c.toId === blockId)
        .map(c => blockMap.get(c.fromId))
        .filter((b): b is Block => !!b && b.type === type);
    } else {
      return connections
        .filter(c => c.fromId === blockId)
        .map(c => blockMap.get(c.toId))
        .filter((b): b is Block => !!b && b.type === type);
    }
  }, [blocks, connections, blockId, type, direction]);
}

/**
 * Selector for agents (chef blocks) - use with useMemo in components
 */
export const selectAgents = (blocks: Block[]) => blocks.filter(b => b.type === 'chef');
export const selectContextFiles = (blocks: Block[]) => blocks.filter(b => b.type === 'context_file');
export const selectInputFiles = (blocks: Block[]) => blocks.filter(b => b.type === 'input_file');
export const selectDishes = (blocks: Block[]) => blocks.filter(b => b.type === 'dish');
