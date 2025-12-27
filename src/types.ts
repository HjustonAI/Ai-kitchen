export type BlockType = 'chef' | 'ingredients' | 'dish' | 'note' | 'context_file' | 'input_file';

export interface BlockData {
  // Chef properties
  model?: string;
  temperature?: number;
  maxTokens?: number;
  
  // File/Context properties
  filePath?: string;
  isExternal?: boolean;
  content?: string;

  // Dish properties
  outputFormat?: 'markdown' | 'json' | 'text' | 'file';
  savePath?: string;
}

export type Block = {
  id: string;
  type: BlockType;
  title: string;
  description: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  data?: BlockData;
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
