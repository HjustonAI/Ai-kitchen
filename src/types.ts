export type BlockType = 'chef' | 'ingredients' | 'dish' | 'note';

export type Block = {
  id: string;
  type: BlockType;
  title: string;
  description: string;
  x: number;
  y: number;
};

export type Group = {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export type ConnectionType = 'default' | 'flow' | 'sync';

export type Connection = {
  id: string;
  fromId: string;
  toId: string;
  type: ConnectionType;
  label?: string;
};
