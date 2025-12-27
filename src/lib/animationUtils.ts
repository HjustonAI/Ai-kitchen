/**
 * Animation Utilities - Legacy API
 * 
 * This file re-exports from the optimized module for backward compatibility.
 * New code should import directly from animationUtilsOptimized.ts
 */

export { 
  getBezierControlPoints,
  getBezierPath,
  getPointOnBezier,
  getBezierLength,
  clearBezierCache,
  getBezierData,
  getPointAtDistance,
  type Point
} from './animationUtilsOptimized';
