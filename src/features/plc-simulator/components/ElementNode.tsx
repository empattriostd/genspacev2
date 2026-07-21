import { Group, Line, Circle, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { LadderElement } from '@/simulator/types/ladder';
import {
  COLOR_POWER_ON,
  COLOR_INACTIVE,
  COLOR_SELECTED,
  COLOR_WIRE,
  GRID_SIZE,
  CONTACT_WIDTH,
  CONTACT_HEIGHT,
  COIL_RADIUS,
  BLOCK_WIDTH,
  BLOCK_HEIGHT,
} from '../constants';

export type InteractionMode = 'select' | 'connect' | 'branch';

interface ElementNodeProps {
  element: LadderElement;
  x: number;
  y: number;
  isPowered: boolean;
  isSelected: boolean;
  isPendingAnchor: boolean;
  interactionMode: InteractionMode;
  onSelect: (id: string) => void;
  onAnchorClick: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, worldX: number, worldY: number) => void;
  onDragEnd: (id: string, worldX: number, worldY: number) => void;
  onOpenProperties: (id: string) => void;
}

/**
 * Renders one LadderElement as IEC-style ladder symbols — enlarged for
 * CX-Programmer-grade readability. Power state (green) comes directly from
 * the Runtime's poweredElements set; this component never fakes it.
 */
export function ElementNode({
  element,
  x,
  y,
  isPowered,
  isSelected,
  isPendingAnchor,
  interactionMode,
  onSelect,
  onAnchorClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onOpenProperties,
}: ElementNodeProps) {
  const color = isPowered ? COLOR_POWER_ON : COLOR_INACTIVE;
  const wireColor = isPowered ? COLOR_POWER_ON : COLOR_WIRE;
  const draggable = interactionMode === 'select';

  const handleClick = () => {
    if (interactionMode === 'select') onSelect(element.id);
    else onAnchorClick(element.id);
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    onDragMove(element.id, e.target.x(), e.target.y());
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd(element.id, e.target.x(), e.target.y());
  };

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={() => onOpenProperties(element.id)}
      onDblTap={() => onOpenProperties(element.id)}
      onDragStart={() => onDragStart(element.id)}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {(isSelected || isPendingAnchor) && (
        <Rect
          x={-55}
          y={-40}
          width={110}
          height={80}
          cornerRadius={8}
          stroke={COLOR_SELECTED}
          strokeWidth={1.5}
          dash={[5, 3]}
        />
      )}

      <ElementGlyph element={element} color={color} wireColor={wireColor} />

      <Text
        text={addressLabel(element)}
        x={-55}
        y={-52}
        width={110}
        align="center"
        fontSize={13}
        fontStyle="bold"
        fill={color}
      />

      {element.alias && (
        <Text text={element.alias} x={-55} y={28} width={110} align="center" fontSize={10} fill="#9A9A9A" />
      )}
    </Group>
  );
}

function addressLabel(element: LadderElement): string {
  if (element.kind === 'COMMENT') return '';
  if (!('address' in element) || !element.address) return '';
  return `${element.address.type}${element.address.number}`;
}

function ElementGlyph({
  element,
  color,
  wireColor,
}: {
  element: LadderElement;
  color: string;
  wireColor: string;
}) {
  const stroke = { stroke: color, strokeWidth: 2.5 };
  const wire = { stroke: wireColor, strokeWidth: 2.5, lineCap: 'round' as const };

  switch (element.kind) {
    case 'CONTACT': {
      const isEdge = element.mode === 'RISING_EDGE' || element.mode === 'FALLING_EDGE';
      const halfW = CONTACT_WIDTH / 2;
      return (
        <>
          {/* Left wire stub to rail/previous element */}
          <Line points={[-GRID_SIZE / 2, 0, -halfW, 0]} {...wire} />
          {/* Right wire stub to next element */}
          <Line points={[halfW, 0, GRID_SIZE / 2, 0]} {...wire} />
          {/* Contact vertical bars */}
          <Line points={[-halfW, -CONTACT_HEIGHT / 2, -halfW, CONTACT_HEIGHT / 2]} {...stroke} />
          <Line points={[halfW, -CONTACT_HEIGHT / 2, halfW, CONTACT_HEIGHT / 2]} {...stroke} />
          {/* NC diagonal slash */}
          {element.mode === 'NC' && <Line points={[-halfW + 2, CONTACT_HEIGHT / 2 - 2, halfW - 2, -CONTACT_HEIGHT / 2 + 2]} {...stroke} />}
          {/* Edge arrow */}
          {isEdge && (
            <Text
              text={element.mode === 'RISING_EDGE' ? '↑' : '↓'}
              x={-8}
              y={-42}
              width={16}
              align="center"
              fontSize={16}
              fontStyle="bold"
              fill={color}
            />
          )}
        </>
      );
    }
    case 'COIL': {
      const modeMark = element.coilMode === 'SET' ? 'S' : element.coilMode === 'RESET' ? 'R' : null;
      const hasInstruction = !!element.instruction;
      return (
        <>
          <Line points={[-GRID_SIZE / 2, 0, -COIL_RADIUS, 0]} {...wire} />
          <Line points={[COIL_RADIUS, 0, GRID_SIZE / 2, 0]} {...wire} />
          <Circle radius={COIL_RADIUS} {...stroke} fill="rgba(0,0,0,0.05)" />
          {modeMark && (
            <Text text={modeMark} x={-7} y={-8} fontSize={15} fontStyle="bold" fill={color} />
          )}
          {hasInstruction && (
            <Text
              text={element.instruction!.op}
              x={-COIL_RADIUS}
              y={COIL_RADIUS + 4}
              width={COIL_RADIUS * 2}
              align="center"
              fontSize={9}
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
          <Line points={[-GRID_SIZE / 2, 0, -BLOCK_WIDTH / 2, 0]} {...wire} />
          <Line points={[BLOCK_WIDTH / 2, 0, GRID_SIZE / 2, 0]} {...wire} />
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
            text={element.kind === 'TIMER' ? element.timerType : element.counterType}
            x={-BLOCK_WIDTH / 2}
            y={-10}
            width={BLOCK_WIDTH}
            align="center"
            fontSize={12}
            fontStyle="bold"
            fill={color}
          />
          <Text
            text={element.kind === 'TIMER' ? `${(element.presetMs / 1000).toFixed(1)}s` : `K${element.presetCount}`}
            x={-BLOCK_WIDTH / 2}
            y={4}
            width={BLOCK_WIDTH}
            align="center"
            fontSize={9}
            fill={color}
          />
        </>
      );
    case 'WIRE':
      return <Line points={[-GRID_SIZE / 2, 0, GRID_SIZE / 2, 0]} {...wire} />;
    case 'BRANCH_START':
    case 'BRANCH_END':
      return (
        <>
          <Line points={[-GRID_SIZE / 2, 0, GRID_SIZE / 2, 0]} {...wire} />
          <Circle radius={5} fill={color} />
        </>
      );
    case 'COMMENT':
      return (
        <>
          <Rect x={-55} y={-18} width={110} height={36} cornerRadius={6} stroke="#B8B8B8" strokeWidth={1} dash={[3, 3]} />
          <Text text={element.text} x={-50} y={-6} width={100} align="center" fontSize={11} fill="#6B6B6B" />
        </>
      );
    default: {
      const _exhaustive: never = element;
      return _exhaustive;
    }
  }
}
