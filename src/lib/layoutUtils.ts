import dagre from 'dagre';
import type { Block, BlockType, Connection, Group } from '../types';

// ============ Performance Caches ============

// Block dimensions cache by scale bucket
const dimensionCache = new Map<string, { width: number; height: number }>();

// Block center cache
interface CenterCacheEntry {
  x: number;
  y: number;
  blockX: number;
  blockY: number;
  blockWidth: number;
  blockHeight: number;
  scale: number;
}
const centerCache = new Map<string, CenterCacheEntry>();

// Effective block cache
const effectiveBlockCache = new Map<string, { block: Block | null; timestamp: number }>();
const EFFECTIVE_CACHE_TTL = 50; // ms

/**
 * Clear all layout caches - call when blocks/groups change significantly
 */
export function clearLayoutCaches(): void {
  dimensionCache.clear();
  centerCache.clear();
  effectiveBlockCache.clear();
}

export const getLayoutedElements = (
  blocks: Block[],
  groups: Group[],
  connections: Connection[],
  direction = 'LR'
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction });

  // Add nodes
  blocks.forEach((block) => {
    // Use proper dimensions
    const scale = 1; // Layout at 1:1 scale
    const dims = getBlockDimensions(block.type, scale);
    const width = block.width || dims.width;
    const height = block.height || dims.height;

    dagreGraph.setNode(block.id, { width, height });
  });

  // Add edges
  connections.forEach((conn) => {
    dagreGraph.setEdge(conn.fromId, conn.toId);
  });

  dagre.layout(dagreGraph);

  const layoutedBlocks = blocks.map((block) => {
    const nodeWithPosition = dagreGraph.node(block.id);
    if (!nodeWithPosition) return block;

    // Shift to top-left from center (dagre uses center)
    const dims = getBlockDimensions(block.type, 1);
    const width = block.width || dims.width;
    const height = block.height || dims.height;

    return {
      ...block,
      x: nodeWithPosition.x - width / 2,
      y: nodeWithPosition.y - height / 2,
    };
  });

  return { layoutedBlocks, layoutedGroups: groups };
};

export const getBlockDimensions = (type: BlockType, scale: number) => {
  // Bucket scale for caching (reduces cache entries)
  const scaleBucket = scale < 0.3 ? 0 : scale < 0.6 ? 1 : 2;
  const cacheKey = `${type}_${scaleBucket}`;
  
  const cached = dimensionCache.get(cacheKey);
  if (cached) return cached;
  
  let result: { width: number; height: number };
  
  // Map LOD sizes to approximate pixel dimensions so connection anchors remain centered.
  if (scaleBucket === 0) {
    // Minimal: small tile
    result = { width: 56, height: 32 };
  } else if (scaleBucket === 1) {
    // Compact: unified compact width
    if (type === 'note') {
      result = { width: 176, height: 176 };
    } else {
      result = { width: 176, height: 48 };
    }
  } else {
    switch (type) {
      case 'chef': result = { width: 320, height: 180 }; break;
      case 'ingredients': result = { width: 256, height: 160 }; break;
      case 'dish': result = { width: 288, height: 180 }; break;
      case 'note': result = { width: 256, height: 256 }; break;
      case 'input_file': result = { width: 256, height: 140 }; break;
      case 'context_file': result = { width: 256, height: 140 }; break;
      default: result = { width: 288, height: 120 };
    }
  }
  
  dimensionCache.set(cacheKey, result);
  return result;
};

export const getBlockCenter = (
  block: Block,
  draggingBlockId: string | null,
  draggingPos: { x: number; y: number } | null,
  scale: number
) => {
  let width: number, height: number;

  // Use measured dimensions if available, otherwise fallback to estimated dimensions
  if (block.width && block.height) {
    width = block.width;
    height = block.height;
  } else {
    const dims = getBlockDimensions(block.type, scale);
    width = dims.width;
    height = dims.height;
  }

  let x = block.x;
  let y = block.y;

  if (block.id === draggingBlockId && draggingPos) {
    x = draggingPos.x;
    y = draggingPos.y;
  }

  // Check cache (skip during drag for this block)
  if (block.id !== draggingBlockId) {
    const scaleBucket = scale < 0.3 ? 0 : scale < 0.6 ? 1 : 2;
    const cacheKey = `${block.id}_${scaleBucket}`;
    const cached = centerCache.get(cacheKey);
    
    if (cached && 
        cached.blockX === x && 
        cached.blockY === y && 
        cached.blockWidth === width &&
        cached.blockHeight === height) {
      return { x: cached.x, y: cached.y };
    }
    
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    centerCache.set(cacheKey, {
      x: centerX,
      y: centerY,
      blockX: x,
      blockY: y,
      blockWidth: width,
      blockHeight: height,
      scale
    });
    
    return { x: centerX, y: centerY };
  }

  return {
    x: x + width / 2,
    y: y + height / 2,
  };
};

export const getEffectiveBlock = (
  blockId: string,
  blockMap: Map<string, Block>,
  groups: { id: string; x: number; y: number; width: number; height: number; collapsed?: boolean }[]
): Block | null => {
  const block = blockMap.get(blockId);
  if (!block) return null;

  // Check cache with TTL
  const now = performance.now();
  const cacheKey = `${blockId}_${groups.length}`;
  const cached = effectiveBlockCache.get(cacheKey);
  
  if (cached && now - cached.timestamp < EFFECTIVE_CACHE_TTL) {
    return cached.block;
  }

  // Check if block is in a collapsed group
  const collapsedGroup = groups.find(g => {
    if (!g.collapsed) return false;

    // Use scale 1 for group calculation as standard
    const dims = getBlockDimensions(block.type, 1);
    const width = block.width || dims.width;
    const height = block.height || dims.height;
    const bCenterX = block.x + width / 2;
    const bCenterY = block.y + height / 2;

    return (
      bCenterX >= g.x &&
      bCenterX <= g.x + g.width &&
      bCenterY >= g.y &&
      bCenterY <= g.y + g.height
    );
  });

  let result: Block | null;
  
  if (collapsedGroup) {
    result = {
      ...block,
      id: collapsedGroup.id, // Use group ID to identify the node
      x: collapsedGroup.x,
      y: collapsedGroup.y,
      width: 300,
      height: 60,
    };
  } else {
    result = block;
  }
  
  effectiveBlockCache.set(cacheKey, { block: result, timestamp: now });
  return result;
};
