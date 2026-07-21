import { Fragment, useMemo } from 'react';
import { Line, Rect } from 'react-konva';
import {
  CELL_SIZE,
  RUNG_HEIGHT,
  COLOR_RAIL,
  COLOR_GRID_LINE,
  MAX_COLUMNS,
} from '../constants';
import { leftRailX, rightRailX, rungCenterY } from '../utils/coords';

interface GridBackgroundProps {
  camera: { x: number; y: number; scale: number };
  stageWidth: number;
  stageHeight: number;
  rungCount: number;
  columnCounts: number[];
}

/**
 * Draws the CX-Programmer-style dual power-rail background with grid cells.
 * Rails are always present, non-interactive, and span the full height.
 * Grid cells are drawn as subtle lines for snapping reference.
 */
export function GridBackground({ camera, stageWidth, stageHeight, rungCount, columnCounts }: GridBackgroundProps) {
  const { worldTop, worldBottom, worldLeft, worldRight, gridLines } = useMemo(() => {
    const left = -camera.x / camera.scale;
    const right = (stageWidth - camera.x) / camera.scale;
    const top = -camera.y / camera.scale;
    const bottom = (stageHeight - camera.y) / camera.scale;

    const firstCol = Math.floor(left / CELL_SIZE) * CELL_SIZE;
    const lastCol = Math.ceil(right / CELL_SIZE) * CELL_SIZE;
    const firstRow = Math.floor(top / CELL_SIZE) * CELL_SIZE;
    const lastRow = Math.ceil(bottom / CELL_SIZE) * CELL_SIZE;

    const vLines: number[] = [];
    for (let x = firstCol; x <= lastCol; x += CELL_SIZE) vLines.push(x);
    const hLines: number[] = [];
    for (let y = firstRow; y <= lastRow; y += CELL_SIZE) hLines.push(y);

    return {
      worldTop: top,
      worldBottom: bottom,
      worldLeft: left,
      worldRight: right,
      gridLines: { v: vLines, h: hLines },
    };
  }, [camera.x, camera.y, camera.scale, stageWidth, stageHeight]);

  const railTop = Math.min(worldTop, 0);
  const railBottom = Math.max(worldBottom, rungCount * RUNG_HEIGHT);
  const lrx = leftRailX();

  return (
    <Fragment>
      {/* Grid cell lines — subtle reference for snapping */}
      {gridLines.v.map((x, i) => (
        <Line
          key={`gv-${i}`}
          points={[x, worldTop, x, worldBottom]}
          stroke={COLOR_GRID_LINE}
          strokeWidth={1}
        />
      ))}
      {gridLines.h.map((y, i) => (
        <Line
          key={`gh-${i}`}
          points={[worldLeft, y, worldRight, y]}
          stroke={COLOR_GRID_LINE}
          strokeWidth={1}
        />
      ))}

      {/* Rung separator bands */}
      {Array.from({ length: rungCount }, (_, i) => {
        const y = i * RUNG_HEIGHT;
        if (y < railTop - RUNG_HEIGHT || y > railBottom + RUNG_HEIGHT) return null;
        return (
          <Fragment key={`rung-${i}`}>
            <Rect
              x={worldLeft}
              y={y}
              width={worldRight - worldLeft}
              height={RUNG_HEIGHT}
              fill={i % 2 === 0 ? 'rgba(128,128,128,0.025)' : 'transparent'}
            />
            <Line
              points={[worldLeft, y, worldRight, y]}
              stroke="rgba(128,128,128,0.15)"
              strokeWidth={1}
            />
          </Fragment>
        );
      })}

      {/* Left power rail — bold, full height, non-interactive */}
      <Line
        points={[lrx, railTop, lrx, railBottom]}
        stroke={COLOR_RAIL}
        strokeWidth={4}
        lineCap="round"
      />

      {/* Right power rails — one per rung, at the rung's column extent */}
      {Array.from({ length: rungCount }, (_, i) => {
        const cols = Math.max(columnCounts[i] ?? 1, 1);
        const rrx = rightRailX(cols);
        const cy = rungCenterY(i);
        const top = cy - RUNG_HEIGHT / 2 + 10;
        const bottom = cy + RUNG_HEIGHT / 2 - 10;
        if (top < railTop - RUNG_HEIGHT || bottom > railBottom + RUNG_HEIGHT) return null;
        return (
          <Line
            key={`rrail-${i}`}
            points={[rrx, top, rrx, bottom]}
            stroke={COLOR_RAIL}
            strokeWidth={4}
            lineCap="round"
          />
        );
      })}

      {/* Rail caps at top and bottom */}
      <Line
        points={[lrx - 8, railTop, rightRailX(MAX_COLUMNS) + 8, railTop]}
        stroke={COLOR_RAIL}
        strokeWidth={3}
        lineCap="round"
      />
      <Line
        points={[lrx - 8, railBottom, rightRailX(MAX_COLUMNS) + 8, railBottom]}
        stroke={COLOR_RAIL}
        strokeWidth={3}
        lineCap="round"
      />
    </Fragment>
  );
}
