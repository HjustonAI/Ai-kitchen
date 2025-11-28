import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BlockType } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getBlockDimensions = (type: BlockType, scale: number = 1) => {
  if (scale < 0.3) return { width: 56, height: 32 };
  if (scale < 0.6) return type === 'note' ? { width: 176, height: 176 } : { width: 176, height: 48 };
  switch (type) {
    case 'chef': return { width: 320, height: 180 };
    case 'ingredients': return { width: 256, height: 160 };
    case 'context_file': return { width: 256, height: 160 };
    case 'input_file': return { width: 256, height: 160 };
    case 'dish': return { width: 288, height: 180 };
    case 'note': return { width: 256, height: 256 };
    default: return { width: 288, height: 120 };
  }
};
