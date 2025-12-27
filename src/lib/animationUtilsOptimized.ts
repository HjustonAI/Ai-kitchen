/**
 * Optimized Animation Utilities
 * 
 * Performance improvements:
 * - Lookup Table (LUT) for bezier arc-length parameterization
 * - Pre-computed control points cache
 * - Inline math operations (avoid function call overhead)
 * - Reusable point objects to avoid allocations
 */

export interface Point {
  x: number;
  y: number;
}

// ============ Constants ============
const LUT_RESOLUTION = 64; // Points in lookup table
const CONTROL_OFFSET_MAX = 150;

// ============ Caches ============

// Cache for bezier data per connection
interface BezierCache {
  start: Point;
  end: Point;
  cp1: Point;
  cp2: Point;
  length: number;
  lut: Float32Array; // Arc-length LUT for constant velocity
  timestamp: number;
}

const bezierCache = new Map<string, BezierCache>();
const CACHE_TTL = 100; // ms - how long cache is valid

// Reusable point objects
const tempPoint: Point = { x: 0, y: 0 };
const tempCP1: Point = { x: 0, y: 0 };
const tempCP2: Point = { x: 0, y: 0 };

// ============ Core Functions ============

/**
 * Calculate control points inline
 */
export function getControlPoints(
  startX: number, startY: number, 
  endX: number, endY: number,
  out1: Point, out2: Point
): void {
  const dist = Math.abs(endX - startX);
  const controlOffset = dist < CONTROL_OFFSET_MAX * 2 ? dist * 0.5 : CONTROL_OFFSET_MAX;
  
  out1.x = startX + controlOffset;
  out1.y = startY;
  out2.x = endX - controlOffset;
  out2.y = endY;
}

/**
 * Get point on cubic bezier at parameter t
 * Inline version for maximum performance
 */
export function bezierPoint(
  startX: number, startY: number,
  cp1X: number, cp1Y: number,
  cp2X: number, cp2Y: number,
  endX: number, endY: number,
  t: number,
  out: Point
): void {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  
  out.x = mt3 * startX + 3 * mt2 * t * cp1X + 3 * mt * t2 * cp2X + t3 * endX;
  out.y = mt3 * startY + 3 * mt2 * t * cp1Y + 3 * mt * t2 * cp2Y + t3 * endY;
}

/**
 * Build arc-length lookup table for constant velocity motion
 */
function buildLUT(
  startX: number, startY: number,
  cp1X: number, cp1Y: number,
  cp2X: number, cp2Y: number,
  endX: number, endY: number
): { lut: Float32Array; length: number } {
  const lut = new Float32Array(LUT_RESOLUTION + 1);
  let totalLength = 0;
  let prevX = startX;
  let prevY = startY;
  
  lut[0] = 0;
  
  for (let i = 1; i <= LUT_RESOLUTION; i++) {
    const t = i / LUT_RESOLUTION;
    bezierPoint(startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY, t, tempPoint);
    
    const dx = tempPoint.x - prevX;
    const dy = tempPoint.y - prevY;
    totalLength += Math.sqrt(dx * dx + dy * dy);
    
    lut[i] = totalLength;
    prevX = tempPoint.x;
    prevY = tempPoint.y;
  }
  
  return { lut, length: totalLength };
}

/**
 * Get or create cached bezier data
 */
export function getBezierData(
  connectionId: string,
  start: Point,
  end: Point
): BezierCache {
  const now = performance.now();
  let cached = bezierCache.get(connectionId);
  
  // Check if cache is valid and positions match
  if (cached && 
      now - cached.timestamp < CACHE_TTL &&
      cached.start.x === start.x && 
      cached.start.y === start.y &&
      cached.end.x === end.x && 
      cached.end.y === end.y) {
    return cached;
  }
  
  // Compute new data
  getControlPoints(start.x, start.y, end.x, end.y, tempCP1, tempCP2);
  const { lut, length } = buildLUT(
    start.x, start.y,
    tempCP1.x, tempCP1.y,
    tempCP2.x, tempCP2.y,
    end.x, end.y
  );
  
  cached = {
    start: { x: start.x, y: start.y },
    end: { x: end.x, y: end.y },
    cp1: { x: tempCP1.x, y: tempCP1.y },
    cp2: { x: tempCP2.x, y: tempCP2.y },
    length,
    lut,
    timestamp: now
  };
  
  bezierCache.set(connectionId, cached);
  
  // Cleanup old cache entries periodically
  if (bezierCache.size > 1000) {
    const threshold = now - CACHE_TTL * 10;
    for (const [key, value] of bezierCache) {
      if (value.timestamp < threshold) {
        bezierCache.delete(key);
      }
    }
  }
  
  return cached;
}

/**
 * Get point at distance (constant velocity)
 * Uses arc-length parameterization via LUT
 */
export function getPointAtDistance(
  cache: BezierCache,
  progress: number, // 0 to 1
  out: Point
): void {
  // Clamp progress
  const p = Math.max(0, Math.min(1, progress));
  
  // Target arc length
  const targetLength = p * cache.length;
  
  // Binary search in LUT
  const lut = cache.lut;
  let low = 0;
  let high = LUT_RESOLUTION;
  
  while (low < high) {
    const mid = (low + high) >> 1;
    if (lut[mid] < targetLength) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  
  // Interpolate
  const idx = Math.max(0, low - 1);
  const segmentStart = lut[idx];
  const segmentEnd = lut[idx + 1] || cache.length;
  const segmentLength = segmentEnd - segmentStart;
  
  const segmentProgress = segmentLength > 0 
    ? (targetLength - segmentStart) / segmentLength 
    : 0;
  
  const t = (idx + segmentProgress) / LUT_RESOLUTION;
  
  bezierPoint(
    cache.start.x, cache.start.y,
    cache.cp1.x, cache.cp1.y,
    cache.cp2.x, cache.cp2.y,
    cache.end.x, cache.end.y,
    t,
    out
  );
}

// ============ Legacy API Compatibility ============

/**
 * Legacy: Get control points (for ConnectionsLayer compatibility)
 */
export const getBezierControlPoints = (start: Point, end: Point) => {
  getControlPoints(start.x, start.y, end.x, end.y, tempCP1, tempCP2);
  return {
    cp1: { x: tempCP1.x, y: tempCP1.y },
    cp2: { x: tempCP2.x, y: tempCP2.y }
  };
};

/**
 * Legacy: Get SVG path
 */
export const getBezierPath = (start: Point, end: Point): string => {
  const { cp1, cp2 } = getBezierControlPoints(start, end);
  return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
};

/**
 * Legacy: Get point on bezier
 */
export const getPointOnBezier = (start: Point, end: Point, t: number): Point => {
  getControlPoints(start.x, start.y, end.x, end.y, tempCP1, tempCP2);
  const result: Point = { x: 0, y: 0 };
  bezierPoint(
    start.x, start.y,
    tempCP1.x, tempCP1.y,
    tempCP2.x, tempCP2.y,
    end.x, end.y,
    t,
    result
  );
  return result;
};

/**
 * Legacy: Get bezier length
 */
export const getBezierLength = (start: Point, end: Point, samples = 10): number => {
  getControlPoints(start.x, start.y, end.x, end.y, tempCP1, tempCP2);
  
  let length = 0;
  let prevX = start.x;
  let prevY = start.y;
  
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    bezierPoint(
      start.x, start.y,
      tempCP1.x, tempCP1.y,
      tempCP2.x, tempCP2.y,
      end.x, end.y,
      t,
      tempPoint
    );
    
    const dx = tempPoint.x - prevX;
    const dy = tempPoint.y - prevY;
    length += Math.sqrt(dx * dx + dy * dy);
    
    prevX = tempPoint.x;
    prevY = tempPoint.y;
  }
  
  return length;
};

/**
 * Clear all caches (call on major state changes)
 */
export function clearBezierCache(): void {
  bezierCache.clear();
}
