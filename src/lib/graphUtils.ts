import type { Block, Connection } from '../types';

export const getConnectedElements = (
  startNodeId: string,
  _blocks: Block[],
  connections: Connection[]
) => {
  const connectedBlockIds = new Set<string>();
  const connectedConnectionIds = new Set<string>();

  // Add the start node itself
  connectedBlockIds.add(startNodeId);

  // Find all immediate connections
  connections.forEach((conn) => {
    if (conn.fromId === startNodeId) {
      connectedConnectionIds.add(conn.id);
      connectedBlockIds.add(conn.toId);
    } else if (conn.toId === startNodeId) {
      connectedConnectionIds.add(conn.id);
      connectedBlockIds.add(conn.fromId);
    }
  });

  return {
    connectedBlockIds: Array.from(connectedBlockIds),
    connectedConnectionIds: Array.from(connectedConnectionIds),
  };
};
