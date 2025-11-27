import dagre from 'dagre';
import type { Block, Connection } from '../types';

const NODE_WIDTH = 320; // w-72 is 288px, adding some buffer
const NODE_HEIGHT = 200; // Approximate height

export const getLayoutedElements = (
  blocks: Block[],
  connections: Connection[],
  direction: 'TB' | 'LR' = 'LR'
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction, align: 'UL', ranksep: 100, nodesep: 50 });

  blocks.forEach((block) => {
    dagreGraph.setNode(block.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
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

  return layoutedBlocks;
};
