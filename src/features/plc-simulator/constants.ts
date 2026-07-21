/**
 * Grid-based ladder editor layout constants. One grid cell = CELL_SIZE px.
 * Components live at (column, branchLevel) — the renderer computes all pixel
 * positions from these logical coordinates. No free-pixel placement.
 */

/** Size of one grid cell in pixels at scale=1. */
export const CELL_SIZE = 80;

/** Horizontal padding from the left rail to the first column. */
export const RAIL_LEFT_PADDING = 60;

/** Horizontal padding from the last column to the right rail. */
export const RAIL_RIGHT_PADDING = 60;

/** Vertical height of one rung band. */
export const RUNG_HEIGHT = 200;

/** Vertical spacing per branch level within a rung. */
export const BRANCH_LEVEL_HEIGHT = 70;

/** Maximum number of columns shown in a rung (for right rail positioning). */
export const MAX_COLUMNS = 20;

/** Visual constants */
export const COLOR_ACTIVE = '#F26B3A';
export const COLOR_INACTIVE = '#9CA3AF';
export const COLOR_SELECTED = '#2563EB';
export const COLOR_POWER_ON = '#22C55E';
export const COLOR_WIRE = '#6B7280';
export const COLOR_RAIL = '#374151';
export const COLOR_GRID_LINE = 'rgba(128,128,128,0.08)';
export const COLOR_CELL_HOVER = 'rgba(37,99,235,0.08)';
export const COLOR_CELL_ARMED = 'rgba(34,197,94,0.15)';

/** Zoom limits */
export const MIN_SCALE = 0.3;
export const MAX_SCALE = 3.0;
export const ZOOM_SCALE_BY = 1.1;

/** Component glyph dimensions (within a cell) */
export const CONTACT_WIDTH = 28;
export const CONTACT_HEIGHT = 44;
export const COIL_RADIUS = 18;
export const BLOCK_WIDTH = 44;
export const BLOCK_HEIGHT = 52;
