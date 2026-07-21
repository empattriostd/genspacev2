/**
 * Shared layout constants for the Konva canvas. One grid unit here maps
 * 1:1 to an element's gridX/gridY in the ladder data model — i.e. moving an
 * element "one grid step" right always means gridX + 1, regardless of
 * current zoom, which is what makes drag-snapping and the infinite grid
 * background line up with the underlying data.
 *
 * Phase 6: enlarged grid and components to match CX-Programmer readability,
 * and added RIGHT_RAIL_X for the dual power-rail system.
 */
export const GRID_SIZE = 110; // px per grid unit at scale = 1 (was 90)
export const RUNG_HEIGHT = 280; // px vertical band reserved per rung (room for one branch row)
export const LEFT_RAIL_X = 40; // world-space x of the left power rail
export const RIGHT_RAIL_X = 1400; // world-space x of the right power rail (fixed)
export const RIGHT_RAIL_MARGIN = 60; // extra world-space width drawn past the last element

export const COLOR_ACTIVE = '#F26B3A';
export const COLOR_INACTIVE = '#9CA3AF';
export const COLOR_SELECTED = '#2563EB';
/** CX-Programmer-authentic green for live power-flow monitoring (Run mode). */
export const COLOR_POWER_ON = '#22C55E';
/** Wire/rail color when idle — darker gray for industrial look. */
export const COLOR_WIRE = '#6B7280';
export const COLOR_RAIL = '#374151';

export const MIN_SCALE = 0.3;
export const MAX_SCALE = 2.5;
export const ZOOM_SCALE_BY = 1.08;

// Component glyph dimensions (Phase 6: enlarged for CX-Programmer readability)
export const CONTACT_WIDTH = 36;
export const CONTACT_HEIGHT = 56;
export const COIL_RADIUS = 20;
export const BLOCK_WIDTH = 48;
export const BLOCK_HEIGHT = 56;
