export type BlockType = 'chef' | 'ingredients' | 'dish' | 'note' | 'context_file' | 'input_file';

export type Block = {
  id: string;
  type: BlockType;
  title: string;
  description: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type Group = {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  collapsed?: boolean;
};

export type ConnectionType = 'default' | 'flow' | 'sync';

export type Connection = {
  id: string;
  fromId: string;
  toId: string;
  type: ConnectionType;
  label?: string;
};
