import { Fragment, useMemo } from 'react';
import { Line, Rect } from 'react-konva';
import { GRID_SIZE, LEFT_RAIL_X, RIGHT_RAIL_X, RUNG_HEIGHT, COLOR_RAIL } from '../constants';

interface CameraState {
  x: number;
  y: number;
  scale: number;
}

interface GridBackgroundProps {
  camera: CameraState;
  stageWidth: number;
  stageHeight: number;
  rungCount: number;
}

/**
 * Draws the CX-Programmer-style dual power-rail background:
 * - Left rail (always at LEFT_RAIL_X, full height)
 * - Right rail (always at RIGHT_RAIL_X, full height)
 * - Subtle grid dots for snapping reference
 * - Rung separator bands for visual structure
 *
 * Rails are non-interactive visual elements — they cannot be moved or
 * deleted by the user. All rung elements live between the two rails.
 */
export function GridBackground({ camera, stageWidth, stageHeight, rungCount }: GridBackgroundProps) {
  const { worldTop, worldBottom, worldLeft, worldRight, dots } = useMemo(() => {
    const left = -camera.x / camera.scale;
    const right = (stageWidth - camera.x) / camera.scale;
    const top = -camera.y / camera.scale;
    const bottom = (stageHeight - camera.y) / camera.scale;

    const firstCol = Math.floor(left / GRID_SIZE) * GRID_SIZE;
    const lastCol = Math.ceil(right / GRID_SIZE) * GRID_SIZE;
    const firstRow = Math.floor(top / GRID_SIZE) * GRID_SIZE;
    const lastRow = Math.ceil(bottom / GRID_SIZE) * GRID_SIZE;

    const dotPoints: { x: number; y: number }[] = [];
    for (let x = firstCol; x <= lastCol; x += GRID_SIZE) {
      for (let y = firstRow; y <= lastRow; y += GRID_SIZE) {
        dotPoints.push({ x, y });
      }
    }

    return {
      worldTop: top,
      worldBottom: bottom,
      worldLeft: left,
      worldRight: right,
      dots: dotPoints,
    };
  }, [camera.x, camera.y, camera.scale, stageWidth, stageHeight]);

  const railTop = Math.min(worldTop, 0);
  const railBottom = Math.max(worldBottom, rungCount * RUNG_HEIGHT);

  return (
    <Fragment>
      {/* Grid dots — subtle snapping reference, not full lines */}
      {dots.map((dot, i) => (
        <Rect
          key={`dot-${dot.x}-${dot.y}-${i}`}
          x={dot.x - 0.5}
          y={dot.y - 0.5}
          width={1}
          height={1}
          fill="rgba(128,128,128,0.2)"
        />
      ))}

      {/* Rung separator bands */}
      {Array.from({ length: rungCount }, (_, i) => {
        const y = i * RUNG_HEIGHT;
        if (y < railTop - RUNG_HEIGHT || y > railBottom + RUNG_HEIGHT) return null;
        return (
          <Fragment key={`rung-band-${i}`}>
            {/* Alternating subtle background band */}
            <Rect
              x={worldLeft}
              y={y}
              width={worldRight - worldLeft}
              height={RUNG_HEIGHT}
              fill={i % 2 === 0 ? 'rgba(128,128,128,0.03)' : 'transparent'}
            />
            {/* Rung separator line */}
            <Line
              points={[worldLeft, y, worldRight, y]}
              stroke="rgba(128,128,128,0.12)"
              strokeWidth={1}
            />
          </Fragment>
        );
      })}

      {/* Left power rail — bold, full height, non-interactive */}
      <Line
        points={[LEFT_RAIL_X, railTop, LEFT_RAIL_X, railBottom]}
        stroke={COLOR_RAIL}
        strokeWidth={4}
        lineCap="round"
      />

      {/* Right power rail — bold, full height, non-interactive */}
      <Line
        points={[RIGHT_RAIL_X, railTop, RIGHT_RAIL_X, railBottom]}
        stroke={COLOR_RAIL}
        strokeWidth={4}
        lineCap="round"
      />

      {/* Rail caps (horizontal stubs at top and bottom — CX-Programmer style) */}
      <Line
        points={[LEFT_RAIL_X - 8, railTop, RIGHT_RAIL_X + 8, railTop]}
        stroke={COLOR_RAIL}
        strokeWidth={3}
        lineCap="round"
      />
      <Line
        points={[LEFT_RAIL_X - 8, railBottom, RIGHT_RAIL_X + 8, railBottom]}
        stroke={COLOR_RAIL}
        strokeWidth={3}
        lineCap="round"
      />
    </Fragment>
  );
}
