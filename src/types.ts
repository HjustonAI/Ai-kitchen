export type BlockType = 'chef' | 'ingredients' | 'dish' | 'note';

export type Block = {
  id: string;
  type: BlockType;
  title: string;
  description: string;
  x: number;
  y: number;
};
