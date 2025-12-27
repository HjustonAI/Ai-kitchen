export type BlockType = 'chef' | 'ingredients' | 'dish' | 'note' | 'context_file' | 'input_file';

// Output file definition for AI Agent file production
export type OutputFileFormat = 'markdown' | 'json' | 'text' | 'yaml' | 'csv' | 'other';

export interface OutputFile {
  id: string;
  filename: string;          // e.g. "01_brief_kampanii.md"
  format: OutputFileFormat;  // File format type
  description?: string;      // Optional description of what this file contains
}

export interface BlockData {
  // Chef properties
  model?: string;
  temperature?: number;
  maxTokens?: number;
  outputs?: OutputFile[];    // Files that this AI Agent produces
  
  // File/Context properties
  filePath?: string;
  isExternal?: boolean;
  content?: string;

  // Dish properties (folder/collection settings)
  outputFolder?: string;     // Base folder path for collected outputs (e.g. "campaigns/[DATE]_[NAME]/")
  outputFormat?: 'markdown' | 'json' | 'text' | 'file'; // Legacy - kept for backward compatibility
  savePath?: string;         // Legacy - kept for backward compatibility
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
