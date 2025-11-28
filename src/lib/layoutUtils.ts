import dagre from 'dagre';
import type { Block, Connection, Group } from '../types';
import { getBlockDimensions } from './utils';

const NODE_WIDTH = 320; // w-72 is 288px, adding some buffer
const NODE_HEIGHT = 200; // Approximate height

export const getLayoutedElements = (
  blocks: Block[],
  groups: Group[],
  connections: Connection[],
  direction: 'TB' | 'LR' = 'LR'
) => {
  const dagreGraph = new dagre.graphlib.Graph({ compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction, align: 'UL', ranksep: 100, nodesep: 50 });

  // Map blocks to groups based on current positions
  const blockGroupMap = new Map<string, string>();
  
  blocks.forEach(block => {
    // Calculate block center
    // We use the standard dimensions if block doesn't have them, 
    // but for hit testing we should probably use the visual dimensions.
    // Let's use getBlockDimensions to be safe if width/height are missing.
    const dims = getBlockDimensions(block.type);
    const width = block.width || dims.width;
    const height = block.height || dims.height;
    
    const bCenterX = block.x + width / 2;
    const bCenterY = block.y + height / 2;

    // Find containing group
    const group = groups.find(g => 
      bCenterX >= g.x && 
      bCenterX <= g.x + g.width && 
      bCenterY >= g.y && 
      bCenterY <= g.y + g.height
    );

    if (group) {
      blockGroupMap.set(block.id, group.id);
    }
  });

  const groupsWithChildren = new Set(blockGroupMap.values());

  // Add groups to graph
  groups.forEach((group) => {
    if (groupsWithChildren.has(group.id)) {
      dagreGraph.setNode(group.id, { label: group.title, clusterLabelPos: 'top' });
    } else {
      dagreGraph.setNode(group.id, { 
        label: group.title, 
        width: group.width, 
        height: group.height 
      });
    }
  });

  // Add blocks to graph
  blocks.forEach((block) => {
    dagreGraph.setNode(block.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    
    const groupId = blockGroupMap.get(block.id);
    if (groupId) {
      dagreGraph.setParent(block.id, groupId);
    }
  });

  connections.forEach((connection) => {
    dagreGraph.setEdge(connection.fromId, connection.toId);
  });

  dagre.layout(dagreGraph);

  const layoutedBlocks = blocks.map((block) => {
    const nodeWithPosition = dagreGraph.node(block.id);
    
    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow / absolute positioning coordinate system
    return {
      ...block,
      x: nodeWithPosition.x - NODE_WIDTH / 2,
      y: nodeWithPosition.y - NODE_HEIGHT / 2,
    };
  });

  const layoutedGroups = groups.map((group) => {
    const node = dagreGraph.node(group.id);
    // If group was in the graph (it should be), update it
    if (node) {
      return {
        ...group,
        x: node.x - node.width / 2,
        y: node.y - node.height / 2,
        width: node.width,
        height: node.height,
      };
    }
    return group;
  });

  return { layoutedBlocks, layoutedGroups };
};
