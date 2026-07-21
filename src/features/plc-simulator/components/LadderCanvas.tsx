import { useRef, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import { useGridEditorStore } from '@/stores/gridEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import { ElementNode, type InteractionMode } from './ElementNode';
import { AutoWire, seriesWireSegments, leftRailWire, rightRailWire, branchWireSegments } from './ConnectionLine';
import { GridBackground } from './GridBackground';
import { PropertyDialog } from './PropertyDialog';
import { gridToWorld, worldToGrid, leftRailX, rightRailX, rungCenterY, CELL_SIZE } from '../utils/coords';
import { elementsAtLevel, rungColumnCount, maxBranchLevel } from '@/simulator/editor/gridOperations';
import { useElementSize } from '../utils/useElementSize';
import {
  COLOR_CELL_ARMED,
  COLOR_SELECTED,
  MIN_SCALE,
  MAX_SCALE,
  ZOOM_SCALE_BY,
  RUNG_HEIGHT,
} from '../constants';
import type { GridElement } from '@/simulator/editor/gridTypes';

interface CameraState {
  x: number;
  y: number;
  scale: number;
}

interface LadderCanvasProps {
  interactionMode: InteractionMode;
  isSimulating: boolean;
  onAnchorActionDone?: () => void;
  onError?: (message: string) => void;
  /** Mobile tap-to-place: when armed, tapping the canvas places the component. */
  pendingPlacementKind?: string | null;
  onCanvasTapPlace?: (worldX: number, worldY: number) => void;
}

/**
 * Grid-based ladder canvas — CX-Programmer architecture.
 *
 * Key principles:
 * - Components live at (column, branchLevel) — NOT pixel coordinates
 * - Wires are derived automatically from grid positions, never stored
 * - Insert mode: arm a tool, click a cell, component is placed with auto-wire
 * - Zoom: Ctrl+Wheel, pinch. Pan: middle-mouse drag, touch drag
 * - Scroll: Wheel = vertical, Shift+Wheel = horizontal
 */
export function LadderCanvas({
  isSimulating,
  pendingPlacementKind,
  onCanvasTapPlace,
}: LadderCanvasProps) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const stageRef = useRef<Konva.Stage | null>(null);

  const document = useGridEditorStore((s) => s.document);
  const selectedElementId = useGridEditorStore((s) => s.selectedElementId);
  const armedSpec = useGridEditorStore((s) => s.armedSpec);
  const placeComponent = useGridEditorStore((s) => s.placeComponent);
  const selectElement = useGridEditorStore((s) => s.selectElement);
  const clearSelection = useGridEditorStore((s) => s.clearSelection);
  const updateElement = useGridEditorStore((s) => s.updateElement);
  const disarmInsert = useGridEditorStore((s) => s.disarmInsert);

  const poweredElements = usePlcStore((s) => s.poweredElements);
  const setInput = usePlcStore((s) => s.setInput);
  const plcState = usePlcStore((s) => s.state);

  const [camera, setCamera] = useState<CameraState>({ x: 20, y: 20, scale: 1 });
  const [hoverCell, setHoverCell] = useState<{ column: number; branchLevel: number; rungIndex: number } | null>(null);
  const [propertyDialogElementId, setPropertyDialogElementId] = useState<string | null>(null);

  const panGesture = useRef<{ active: boolean; startScreenX: number; startScreenY: number; startCameraX: number; startCameraY: number; moved: boolean } | null>(null);

  const columnCounts = useMemo(
    () => document.rungOrder.map((id) => rungColumnCount(document.rungs[id])),
    [document]
  );

  // ── Zoom ────────────────────────────────────────────────────────────
  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const ctrlOrMeta = e.evt.ctrlKey || e.evt.metaKey;

    if (ctrlOrMeta) {
      // Ctrl+Wheel = zoom
      const oldScale = camera.scale;
      const worldPoint = { x: (pointer.x - camera.x) / oldScale, y: (pointer.y - camera.y) / oldScale };
      const zoomingIn = e.evt.deltaY < 0;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, zoomingIn ? oldScale * ZOOM_SCALE_BY : oldScale / ZOOM_SCALE_BY));
      setCamera({ scale: nextScale, x: pointer.x - worldPoint.x * nextScale, y: pointer.y - worldPoint.y * nextScale });
    } else if (e.evt.shiftKey) {
      // Shift+Wheel = horizontal scroll
      setCamera((c) => ({ ...c, x: c.x - e.evt.deltaY }));
    } else {
      // Wheel = vertical scroll
      setCamera((c) => ({ ...c, y: c.y - e.evt.deltaY }));
    }
  }

  // ── Pan ──────────────────────────────────────────────────────────────
  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = stageRef.current;
    if (!stage || e.target !== stage) return;

    // Middle mouse = pan
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      panGesture.current = {
        active: true,
        startScreenX: e.evt.clientX,
        startScreenY: e.evt.clientY,
        startCameraX: camera.x,
        startCameraY: camera.y,
        moved: false,
      };
      return;
    }

    // Left click on empty canvas
    if (e.evt.button === 0) {
      panGesture.current = {
        active: true,
        startScreenX: e.evt.clientX,
        startScreenY: e.evt.clientY,
        startCameraX: camera.x,
        startCameraY: camera.y,
        moved: false,
      };
    }
  }

  function handleStageMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = stageRef.current;
    if (!stage) return;

    if (panGesture.current?.active) {
      const dx = e.evt.clientX - panGesture.current.startScreenX;
      const dy = e.evt.clientY - panGesture.current.startScreenY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panGesture.current.moved = true;
      setCamera((c) => ({ ...c, x: panGesture.current!.startCameraX + dx, y: panGesture.current!.startCameraY + dy }));
      return;
    }

    // Hover cell tracking for insert mode
    if (armedSpec || pendingPlacementKind) {
      const worldPos = stage.getRelativePointerPosition();
      if (worldPos) {
        const cell = worldToGrid(worldPos.x, worldPos.y);
        setHoverCell(cell);
      }
    } else {
      setHoverCell(null);
    }
  }

  function handleStageMouseUp(e: Konva.KonvaEventObject<MouseEvent>) {
    if (panGesture.current?.active) {
      const wasClick = !panGesture.current.moved;
      panGesture.current.active = false;

      if (wasClick && e.evt.button === 0) {
        const stage = stageRef.current;
        if (!stage) return;
        const worldPos = stage.getRelativePointerPosition();
        if (!worldPos) return;

        // Mobile tap-to-place
        if (pendingPlacementKind && onCanvasTapPlace) {
          onCanvasTapPlace(worldPos.x, worldPos.y);
          return;
        }

        // Insert mode: place armed component
        if (armedSpec) {
          const { column, branchLevel, rungIndex } = worldToGrid(worldPos.x, worldPos.y);
          const clampedIndex = Math.min(Math.max(rungIndex, 0), document.rungOrder.length - 1);
          const rungId = document.rungOrder[clampedIndex];
          if (rungId) {
            placeComponent(rungId, armedSpec, column, branchLevel);
            disarmInsert();
          }
          return;
        }

        // Click on empty canvas deselects
        clearSelection();
      }
    }
  }

  function handleSelectElement(elementId: string) {
    if (isSimulating) {
      // In sim mode, clicking an input contact toggles the input
      const el = findElementById(elementId);
      if (el?.kind === 'CONTACT' && el.address?.type === 'I') {
        setInput(el.address.number, !plcState.inputs[el.address.number]);
        return;
      }
    }
    const rungId = findRungIdForElement(elementId);
    if (rungId) selectElement(rungId, elementId);
  }

  function findElementById(elementId: string): GridElement | null {
    for (const rungId of document.rungOrder) {
      const el = document.rungs[rungId].elements[elementId];
      if (el) return el;
    }
    return null;
  }

  function findRungIdForElement(elementId: string): string | null {
    for (const rungId of document.rungOrder) {
      if (document.rungs[rungId].elements[elementId]) return rungId;
    }
    return null;
  }

  // ── Wire computation ─────────────────────────────────────────────────
  const wireSegments = useMemo(() => {
    const segments: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; isPowered: boolean }> = [];

    document.rungOrder.forEach((rungId, rungIndex) => {
      const rung = document.rungs[rungId];
      const lrx = leftRailX();
      const cols = rungColumnCount(rung);
      const rrx = rightRailX(cols);
      const maxLevel = maxBranchLevel(rung);

      // For each branch level, compute series wires + rail connections
      for (let level = 0; level <= maxLevel; level++) {
        const els = elementsAtLevel(rung, level);
        if (els.length === 0) continue;

        const positions = els.map((el) => {
          const pos = gridToWorld(el.column, el.branchLevel, rungIndex);
          return { x: pos.x, y: pos.y, id: el.id };
        });

        // Series wires between elements at this level
        segments.push(...seriesWireSegments(positions, poweredElements));

        // Left rail wire to the first element (only for level 0, or for
        // branches whose first element is at startColumn)
        const firstEl = els[0];
        const firstPos = positions[0];
        const isFirstInRung = level === 0 || firstEl.column <= (rung.branches.find((b) => b.branchLevel === level)?.startColumn ?? Infinity);
        if (isFirstInRung && level === 0) {
          segments.push(leftRailWire(lrx, firstPos, !!poweredElements[firstEl.id]));
        }

        // Right rail wire from the last element (only for level 0)
        if (level === 0) {
          const lastEl = els[els.length - 1];
          const lastPos = positions[positions.length - 1];
          segments.push(rightRailWire(lastPos, rrx, !!poweredElements[lastEl.id]));
        }
      }

      // Branch wires: vertical diverge/converge
      for (const branch of rung.branches) {
        const branchEls = elementsAtLevel(rung, branch.branchLevel);
        if (branchEls.length === 0) continue;

        const parentEls = elementsAtLevel(rung, branch.parentLevel);
        const divergeParent = parentEls.filter((e) => e.column < branch.startColumn).sort((a, b) => b.column - a.column)[0];
        const convergeParent = parentEls.filter((e) => e.column >= branch.endColumn).sort((a, b) => a.column - b.column)[0];

        if (!divergeParent || !convergeParent) continue;

        const divergePos = gridToWorld(divergeParent.column, divergeParent.branchLevel, rungIndex);
        const branchFirstPos = gridToWorld(branchEls[0].column, branchEls[0].branchLevel, rungIndex);
        const branchLastPos = gridToWorld(branchEls[branchEls.length - 1].column, branchEls[branchEls.length - 1].branchLevel, rungIndex);
        const convergePos = gridToWorld(convergeParent.column, convergeParent.branchLevel, rungIndex);

        segments.push(...branchWireSegments(
          { x: divergePos.x + CELL_SIZE / 2, y: divergePos.y },
          { x: branchFirstPos.x - CELL_SIZE / 2, y: branchFirstPos.y },
          { x: convergePos.x - CELL_SIZE / 2, y: convergePos.y },
          { x: branchLastPos.x + CELL_SIZE / 2, y: branchLastPos.y },
          !!poweredElements[divergeParent.id]
        ));
      }
    });

    return segments;
  }, [document, poweredElements]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-2xl bg-white dark:bg-gray-950"
      style={{ cursor: armedSpec || pendingPlacementKind ? 'crosshair' : 'default' }}
    >
      <Stage
        ref={stageRef}
        width={size.width || 1}
        height={size.height || 1}
        x={camera.x}
        y={camera.y}
        scaleX={camera.scale}
        scaleY={camera.scale}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        <Layer>
          <GridBackground
            camera={camera}
            stageWidth={size.width}
            stageHeight={size.height}
            rungCount={document.rungOrder.length}
            columnCounts={columnCounts}
          />

          {/* Hover cell highlight in insert mode */}
          {hoverCell && (armedSpec || pendingPlacementKind) && (
            <Rect
              x={leftRailX() + 20 + hoverCell.column * CELL_SIZE}
              y={hoverCell.rungIndex * RUNG_HEIGHT + RUNG_HEIGHT / 2 + hoverCell.branchLevel * 70 - CELL_SIZE / 2}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill={COLOR_CELL_ARMED}
              stroke={COLOR_SELECTED}
              strokeWidth={1}
              dash={[3, 3]}
              cornerRadius={4}
            />
          )}

          {/* Auto-derived wires */}
          <AutoWire segments={wireSegments} />

          {/* Elements */}
          {document.rungOrder.map((rungId, rungIndex) => {
            const rung = document.rungs[rungId];
            return rung.elementOrder.map((elementId) => {
              const el = rung.elements[elementId];
              const pos = gridToWorld(el.column, el.branchLevel, rungIndex);
              return (
                <ElementNode
                  key={elementId}
                  element={el}
                  x={pos.x}
                  y={pos.y}
                  isPowered={isSimulating && !!poweredElements[elementId]}
                  isSelected={selectedElementId === elementId}
                  onSelect={handleSelectElement}
                  onOpenProperties={setPropertyDialogElementId}
                />
              );
            });
          })}

          {/* Rung number labels */}
          {document.rungOrder.map((_, rungIndex) => (
            <Text
              key={`rung-label-${rungIndex}`}
              text={`${rungIndex + 1}`}
              x={leftRailX() - 30}
              y={rungCenterY(rungIndex) - 7}
              fontSize={12}
              fontStyle="bold"
              fill="#9A9A9A"
            />
          ))}
        </Layer>
      </Stage>

      {propertyDialogElementId &&
        (() => {
          const el = findElementById(propertyDialogElementId);
          const rungId = findRungIdForElement(propertyDialogElementId);
          if (!el || !rungId) return null;
          return (
            <PropertyDialog
              element={el}
              onClose={() => setPropertyDialogElementId(null)}
              onSave={(updates) => {
                updateElement(rungId, propertyDialogElementId, {
                  ...(updates.address ? { address: updates.address } : {}),
                  comment: updates.comment,
                  alias: updates.alias,
                });
              }}
            />
          );
        })()}
    </div>
  );
}
