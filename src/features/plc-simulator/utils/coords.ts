import {
  CELL_SIZE,
  RAIL_LEFT_PADDING,
  RUNG_HEIGHT,
  BRANCH_LEVEL_HEIGHT,
  RAIL_RIGHT_PADDING,
  MAX_COLUMNS,
} from '../constants';

// ─── Grid Coordinate System ─────────────────────────────────────────────
// Converts logical grid coordinates (rungIndex, column, branchLevel) to
// world-space pixel positions for the Konva renderer. This is the ONLY
// place pixel positions are computed — components never store pixel coords.

/** Converts a grid position to world-space pixel coordinates. */
export function gridToWorld(
  column: number,
  branchLevel: number,
  rungIndex: number
): { x: number; y: number } {
  return {
    x: RAIL_LEFT_PADDING + column * CELL_SIZE + CELL_SIZE / 2,
    y: rungIndex * RUNG_HEIGHT + RUNG_HEIGHT / 2 + branchLevel * BRANCH_LEVEL_HEIGHT,
  };
}

/** Converts world-space pixel coordinates back to grid coordinates. */
export function worldToGrid(
  x: number,
  y: number
): { column: number; branchLevel: number; rungIndex: number } {
  const rungIndex = Math.max(0, Math.floor(y / RUNG_HEIGHT));
  const localY = y - rungIndex * RUNG_HEIGHT - RUNG_HEIGHT / 2;
  const branchLevel = Math.max(0, Math.round(localY / BRANCH_LEVEL_HEIGHT));
  return {
    column: Math.max(0, Math.round((x - RAIL_LEFT_PADDING) / CELL_SIZE - 0.5)),
    branchLevel,
    rungIndex,
  };
}

/** Returns the world-space x of the left power rail. */
export function leftRailX(): number {
  return RAIL_LEFT_PADDING - 20;
}

/** Returns the world-space x of the right power rail for a rung with the
 * given number of columns. */
export function rightRailX(columnCount: number = 0): number {
  const cols = Math.max(columnCount, 1);
  return RAIL_LEFT_PADDING + cols * CELL_SIZE + RAIL_RIGHT_PADDING;
}

/** Returns the world-space y of the center line for a rung at the main
 * branch level (level 0). */
export function rungCenterY(rungIndex: number): number {
  return rungIndex * RUNG_HEIGHT + RUNG_HEIGHT / 2;
}

/** Returns the total world height needed to render all rungs. */
export function totalHeight(rungCount: number): number {
  return rungCount * RUNG_HEIGHT;
}

/** Returns the total world width needed for a rung with the given columns. */
export function rungWidth(columnCount: number): number {
  return rightRailX(columnCount) + 20;
}

export { CELL_SIZE, RUNG_HEIGHT, BRANCH_LEVEL_HEIGHT, MAX_COLUMNS };
