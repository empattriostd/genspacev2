import { Group, Line, Circle, Rect, Text } from 'react-konva';
import type { GridElement } from '@/simulator/editor/gridTypes';
import {
  COLOR_POWER_ON,
  COLOR_INACTIVE,
  COLOR_SELECTED,
  COLOR_WIRE,
  CELL_SIZE,
  CONTACT_WIDTH,
  CONTACT_HEIGHT,
  COIL_RADIUS,
  BLOCK_WIDTH,
  BLOCK_HEIGHT,
} from '../constants';

export type InteractionMode = 'select' | 'insert' | 'branch';

interface ElementNodeProps {
  element: GridElement;
  x: number;
  y: number;
  isPowered: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onOpenProperties: (id: string) => void;
}

/**
 * Renders one GridElement as an IEC ladder symbol at its computed pixel
 * position. The component never stores pixel coordinates — they are
 * computed by the canvas from (column, branchLevel).
 */
export function ElementNode({
  element,
  x,
  y,
  isPowered,
  isSelected,
  onSelect,
  onOpenProperties,
}: ElementNodeProps) {
  const color = isPowered ? COLOR_POWER_ON : COLOR_INACTIVE;
  const wireColor = isPowered ? COLOR_POWER_ON : COLOR_WIRE;

  return (
    <Group
      x={x}
      y={y}
      onClick={() => onSelect(element.id)}
      onTap={() => onSelect(element.id)}
      onDblClick={() => onOpenProperties(element.id)}
      onDblTap={() => onOpenProperties(element.id)}
    >
      {isSelected && (
        <Rect
          x={-CELL_SIZE / 2 + 4}
          y={-CELL_SIZE / 2 + 4}
          width={CELL_SIZE - 8}
          height={CELL_SIZE - 8}
          cornerRadius={6}
          stroke={COLOR_SELECTED}
          strokeWidth={1.5}
          dash={[4, 3]}
        />
      )}

      <ElementGlyph element={element} color={color} wireColor={wireColor} />

      <Text
        text={addressLabel(element)}
        x={-CELL_SIZE / 2}
        y={-CELL_SIZE / 2 - 16}
        width={CELL_SIZE}
        align="center"
        fontSize={12}
        fontStyle="bold"
        fill={color}
      />

      {element.alias && (
        <Text
          text={element.alias}
          x={-CELL_SIZE / 2}
          y={CELL_SIZE / 2 - 14}
          width={CELL_SIZE}
          align="center"
          fontSize={9}
          fill="#9A9A9A"
        />
      )}
    </Group>
  );
}

function addressLabel(element: GridElement): string {
  if (element.kind === 'COMMENT') return '';
  if (!element.address) return '';
  return `${element.address.type}${element.address.number}`;
}

function ElementGlyph({
  element,
  color,
  wireColor,
}: {
  element: GridElement;
  color: string;
  wireColor: string;
}) {
  const stroke = { stroke: color, strokeWidth: 2.5 };
  const wire = { stroke: wireColor, strokeWidth: 2.5, lineCap: 'round' as const };
  const halfCell = CELL_SIZE / 2;

  switch (element.kind) {
    case 'CONTACT': {
      const isEdge = element.mode === 'RISING_EDGE' || element.mode === 'FALLING_EDGE';
      const halfW = CONTACT_WIDTH / 2;
      return (
        <>
          <Line points={[-halfCell, 0, -halfW, 0]} {...wire} />
          <Line points={[halfW, 0, halfCell, 0]} {...wire} />
          <Line points={[-halfW, -CONTACT_HEIGHT / 2, -halfW, CONTACT_HEIGHT / 2]} {...stroke} />
          <Line points={[halfW, -CONTACT_HEIGHT / 2, halfW, CONTACT_HEIGHT / 2]} {...stroke} />
          {element.mode === 'NC' && (
            <Line points={[-halfW + 2, CONTACT_HEIGHT / 2 - 2, halfW - 2, -CONTACT_HEIGHT / 2 + 2]} {...stroke} />
          )}
          {isEdge && (
            <Text
              text={element.mode === 'RISING_EDGE' ? '↑' : '↓'}
              x={-7}
              y={-34}
              width={14}
              align="center"
              fontSize={14}
              fontStyle="bold"
              fill={color}
            />
          )}
        </>
      );
    }
    case 'COIL': {
      const modeMark = element.coilMode === 'SET' ? 'S' : element.coilMode === 'RESET' ? 'R' : null;
      return (
        <>
          <Line points={[-halfCell, 0, -COIL_RADIUS, 0]} {...wire} />
          <Line points={[COIL_RADIUS, 0, halfCell, 0]} {...wire} />
          <Circle radius={COIL_RADIUS} {...stroke} fill="rgba(0,0,0,0.05)" />
          {modeMark && <Text text={modeMark} x={-6} y={-8} fontSize={14} fontStyle="bold" fill={color} />}
          {element.instruction && (
            <Text
              text={element.instruction.op}
              x={-COIL_RADIUS}
              y={COIL_RADIUS + 2}
              width={COIL_RADIUS * 2}
              align="center"
              fontSize={8}
              fontStyle="bold"
              fill={color}
            />
          )}
        </>
      );
    }
    case 'TIMER':
    case 'COUNTER':
      return (
        <>
          <Line points={[-halfCell, 0, -BLOCK_WIDTH / 2, 0]} {...wire} />
          <Line points={[BLOCK_WIDTH / 2, 0, halfCell, 0]} {...wire} />
          <Rect
            x={-BLOCK_WIDTH / 2}
            y={-BLOCK_HEIGHT / 2}
            width={BLOCK_WIDTH}
            height={BLOCK_HEIGHT}
            cornerRadius={6}
            {...stroke}
            fill="rgba(0,0,0,0.05)"
          />
          <Text
            text={element.kind === 'TIMER' ? element.timerType ?? 'TON' : element.counterType ?? 'CTU'}
            x={-BLOCK_WIDTH / 2}
            y={-10}
            width={BLOCK_WIDTH}
            align="center"
            fontSize={11}
            fontStyle="bold"
            fill={color}
          />
          <Text
            text={element.kind === 'TIMER' ? `${((element.presetMs ?? 2000) / 1000).toFixed(1)}s` : `K${element.presetCount ?? 3}`}
            x={-BLOCK_WIDTH / 2}
            y={4}
            width={BLOCK_WIDTH}
            align="center"
            fontSize={8}
            fill={color}
          />
        </>
      );
    case 'COMMENT':
      return (
        <>
          <Rect x={-halfCell + 4} y={-14} width={CELL_SIZE - 8} height={28} cornerRadius={4} stroke="#B8B8B8" strokeWidth={1} dash={[3, 3]} />
          <Text text={element.text ?? ''} x={-halfCell + 8} y={-5} width={CELL_SIZE - 16} align="center" fontSize={10} fill="#6B6B6B" />
        </>
      );
    default: {
      const _exhaustive: never = element.kind;
      return _exhaustive;
    }
  }
}
