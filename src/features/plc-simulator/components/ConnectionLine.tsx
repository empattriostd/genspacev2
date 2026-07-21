import { Line } from 'react-konva';
import { COLOR_POWER_ON, COLOR_WIRE, GRID_SIZE } from '../constants';

interface ConnectionLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  isPowered: boolean;
}

/**
 * Draws one connectsTo edge as a thick industrial wire. Same-row = straight
 * horizontal. Different-row (branch fan-out/fan-in) = orthogonal two-bend
 * path with a vertical drop. In Run mode, powered wires glow green — this
 * state comes directly from the Runtime's poweredElements set.
 */
export function ConnectionLine({ from, to, isPowered }: ConnectionLineProps) {
  const color = isPowered ? COLOR_POWER_ON : COLOR_WIRE;
  const strokeWidth = isPowered ? 3.5 : 2.5;
  const fromX = from.x + GRID_SIZE / 2;
  const toX = to.x - GRID_SIZE / 2;

  const points =
    from.y === to.y
      ? [fromX, from.y, toX, to.y]
      : [fromX, from.y, (fromX + toX) / 2, from.y, (fromX + toX) / 2, to.y, toX, to.y];

  return (
    <Line
      points={points}
      stroke={color}
      strokeWidth={strokeWidth}
      lineJoin="round"
      lineCap="round"
      shadowColor={isPowered ? COLOR_POWER_ON : undefined}
      shadowBlur={isPowered ? 6 : 0}
      shadowOpacity={isPowered ? 0.5 : 0}
    />
  );
}
