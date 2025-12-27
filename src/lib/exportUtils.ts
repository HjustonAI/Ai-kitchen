import { toPng } from 'html-to-image';
import type { Block, Connection, Group } from '../types';

export interface ExportData {
  groups?: Group[];
  blocks: Block[];
  connections: Connection[];
}

export const exportToJson = (data: ExportData) => {
  // Ensure groups are always first in the output for readability
  const orderedData = {
    groups: data.groups || [],
    blocks: data.blocks,
    connections: data.connections
  };
  const jsonString = JSON.stringify(orderedData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ai-kitchen-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importFromJson = (file: File): Promise<ExportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const data = JSON.parse(result);
        // Basic validation
        if (!Array.isArray(data.blocks) || !Array.isArray(data.connections)) {
          throw new Error('Invalid file format: missing blocks or connections array');
        }
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export const exportToPng = async (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  try {
    const dataUrl = await toPng(element, {
      backgroundColor: '#0a0a0a', // Match kitchen-bg
      quality: 1.0,
      pixelRatio: 2, // Higher resolution
      filter: (node) => {
        // Exclude UI elements if they are inside the board (though they shouldn't be)
        // We can add a class 'no-export' to elements we want to hide
        if (node instanceof HTMLElement && node.classList.contains('no-export')) {
          return false;
        }
        return true;
      }
    });
    
    const link = document.createElement('a');
    link.download = `ai-kitchen-snapshot-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Failed to export image:', err);
    throw err;
  }
};
