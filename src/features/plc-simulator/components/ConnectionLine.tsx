import { Line } from 'react-konva';
import { COLOR_POWER_ON, COLOR_WIRE, CELL_SIZE } from '../constants';

interface WireSegment {
  from: { x: number; y: number };
  to: { x: number; y: number };
  isPowered: boolean;
}

/**
 * Renders auto-derived wire segments. Wires are NOT objects in the data model
 * — they are computed by the canvas from grid positions. All wires are
 * strictly horizontal or vertical (90° orthogonal). No diagonals, curves,
 * or beziers.
 */
export function AutoWire({ segments }: { segments: WireSegment[] }) {
  return (
    <>
      {segments.map((seg, i) => {
        const color = seg.isPowered ? COLOR_POWER_ON : COLOR_WIRE;
        const strokeWidth = seg.isPowered ? 3 : 2.5;
        return (
          <Line
            key={`wire-${i}`}
            points={[seg.from.x, seg.from.y, seg.to.x, seg.to.y]}
            stroke={color}
            strokeWidth={strokeWidth}
            lineJoin="round"
            lineCap="round"
            shadowColor={seg.isPowered ? COLOR_POWER_ON : undefined}
            shadowBlur={seg.isPowered ? 6 : 0}
            shadowOpacity={seg.isPowered ? 0.5 : 0}
          />
        );
      })}
    </>
  );
}

/** Computes wire segments for a series chain of elements at the same branch
 * level. Each segment connects the right edge of one cell to the left edge of
 * the next. */
export function seriesWireSegments(
  positions: { x: number; y: number; id: string }[],
  isPoweredMap: Record<string, boolean>
): WireSegment[] {
  const segments: WireSegment[] = [];
  for (let i = 0; i < positions.length - 1; i++) {
    const from = positions[i];
    const to = positions[i + 1];
    segments.push({
      from: { x: from.x + CELL_SIZE / 2, y: from.y },
      to: { x: to.x - CELL_SIZE / 2, y: to.y },
      isPowered: !!isPoweredMap[from.id],
    });
  }
  return segments;
}

/** Computes a wire from the left rail to the first element in a rung. */
export function leftRailWire(
  railX: number,
  elementPos: { x: number; y: number },
  isPowered: boolean
): WireSegment {
  return {
    from: { x: railX, y: elementPos.y },
    to: { x: elementPos.x - CELL_SIZE / 2, y: elementPos.y },
    isPowered,
  };
}

/** Computes a wire from the last element to the right rail. */
export function rightRailWire(
  elementPos: { x: number; y: number },
  railX: number,
  isPowered: boolean
): WireSegment {
  return {
    from: { x: elementPos.x + CELL_SIZE / 2, y: elementPos.y },
    to: { x: railX, y: elementPos.y },
    isPowered,
  };
}

/** Computes vertical wire segments for a branch — diverge from parent level
 * to branch level, and converge back. */
export function branchWireSegments(
  divergePos: { x: number; y: number },
  branchStartPos: { x: number; y: number },
  convergePos: { x: number; y: number },
  branchEndPos: { x: number; y: number },
  isPowered: boolean
): WireSegment[] {
  return [
    // Vertical diverge: from parent level down to branch level
    {
      from: { x: divergePos.x, y: divergePos.y },
      to: { x: branchStartPos.x, y: branchStartPos.y },
      isPowered,
    },
    // Vertical converge: from branch level back up to parent level
    {
      from: { x: branchEndPos.x, y: branchEndPos.y },
      to: { x: convergePos.x, y: convergePos.y },
      isPowered,
    },
  ];
}
