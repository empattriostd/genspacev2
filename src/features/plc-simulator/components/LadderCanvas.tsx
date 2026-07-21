import { useRef, useState, Fragment, type DragEvent } from 'react';
import { Stage, Layer, Rect, Text, Line } from 'react-konva';
import type Konva from 'konva';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import { ElementNode, type InteractionMode } from './ElementNode';
import { PropertyDialog } from './PropertyDialog';
import { ConnectionLine } from './ConnectionLine';
import { GridBackground } from './GridBackground';
import { DRAG_MIME, specForDragKind, addressTypeForDragKind } from './ComponentPalette';
import { gridToWorld, worldToGrid, worldToGridForRung, rightRailWorldX } from '../utils/coords';
import { nextAvailableAddress } from '../utils/addressAllocation';
import { findElementRungId, findElement } from '../utils/findElement';
import { collectElementsInRect, type WorldRect } from '../utils/selection';
import { useElementSize } from '../utils/useElementSize';
import {
  COLOR_SELECTED,
  COLOR_POWER_ON,
  COLOR_RAIL,
  MIN_SCALE,
  MAX_SCALE,
  ZOOM_SCALE_BY,
  RUNG_HEIGHT,
  LEFT_RAIL_X,
  GRID_SIZE,
} from '../constants';
import type { LadderElement } from '@/simulator/types/ladder';

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
}

/**
 * The Konva Stage orchestrator for the CX-Programmer-style editor.
 *
 * Key Phase 6 changes:
 * - Auto-wire: dropping a component auto-connects it to the previous
 *   element in the rung. No manual wire drawing needed for series logic.
 * - Rail wires: visual wires from the left rail to start elements and from
 *   end elements to the right rail, drawn every frame from the data model.
 * - Click-to-place: when a palette tool is active, clicking the canvas
 *   places the component at the clicked grid position.
 * - Branch tool: two-click flow creates parallel paths with auto-wired
 *   vertical and horizontal connections.
 */
export function LadderCanvas({ interactionMode, isSimulating, onAnchorActionDone, onError }: LadderCanvasProps) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const stageRef = useRef<Konva.Stage | null>(null);

  const document = useLadderEditorStore((s) => s.document);
  const selection = useLadderEditorStore((s) => s.selection);
  const selectElement = useLadderEditorStore((s) => s.selectElement);
  const clearSelection = useLadderEditorStore((s) => s.clearSelection);
  const addComponent = useLadderEditorStore((s) => s.addComponent);
  const connect = useLadderEditorStore((s) => s.connect);
  const branch = useLadderEditorStore((s) => s.branch);
  const beginDrag = useLadderEditorStore((s) => s.beginDrag);
  const updateDragPosition = useLadderEditorStore((s) => s.updateDragPosition);
  const endDrag = useLadderEditorStore((s) => s.endDrag);
  const updateElement = useLadderEditorStore((s) => s.updateElement);

  const plcState = usePlcStore((s) => s.state);
  const poweredElements = usePlcStore((s) => s.poweredElements);
  const setInput = usePlcStore((s) => s.setInput);

  const [camera, setCamera] = useState<CameraState>({ x: 20, y: 20, scale: 1 });
  const [pendingAnchorId, setPendingAnchorId] = useState<string | null>(null);
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [marqueeRect, setMarqueeRect] = useState<WorldRect | null>(null);
  const [propertyDialogElementId, setPropertyDialogElementId] = useState<string | null>(null);

  const marqueeGesture = useRef<{ active: boolean; startX: number; startY: number } | null>(null);
  const panGesture = useRef<{ active: boolean; startScreenX: number; startScreenY: number; startCameraX: number; startCameraY: number; moved: boolean } | null>(null);

  // ── Zoom ────────────────────────────────────────────────────────────
  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = camera.scale;
    const worldPointUnderCursor = {
      x: (pointer.x - camera.x) / oldScale,
      y: (pointer.y - camera.y) / oldScale,
    };

    const zoomingIn = e.evt.deltaY < 0;
    const nextScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, zoomingIn ? oldScale * ZOOM_SCALE_BY : oldScale / ZOOM_SCALE_BY)
    );

    setCamera({
      scale: nextScale,
      x: pointer.x - worldPointUnderCursor.x * nextScale,
      y: pointer.y - worldPointUnderCursor.y * nextScale,
    });
  }

  // ── Pan + Marquee Selection ──────────────────────────────────────────
  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = stageRef.current;
    if (!stage || e.target !== stage) return;
    const worldPos = stage.getRelativePointerPosition();
    if (!worldPos) return;

    if (e.evt.shiftKey) {
      marqueeGesture.current = { active: true, startX: worldPos.x, startY: worldPos.y };
      setMarqueeRect({ x: worldPos.x, y: worldPos.y, width: 0, height: 0 });
    } else {
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

    if (marqueeGesture.current?.active) {
      const worldPos = stage.getRelativePointerPosition();
      if (!worldPos) return;
      const { startX, startY } = marqueeGesture.current;
      setMarqueeRect({
        x: Math.min(startX, worldPos.x),
        y: Math.min(startY, worldPos.y),
        width: Math.abs(worldPos.x - startX),
        height: Math.abs(worldPos.y - startY),
      });
      return;
    }

    if (panGesture.current?.active) {
      const dx = e.evt.clientX - panGesture.current.startScreenX;
      const dy = e.evt.clientY - panGesture.current.startScreenY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panGesture.current.moved = true;
      setCamera((c) => ({ ...c, x: panGesture.current!.startCameraX + dx, y: panGesture.current!.startCameraY + dy }));
    }
  }

  function handleStageMouseUp() {
    if (marqueeGesture.current?.active) {
      marqueeGesture.current.active = false;
      if (marqueeRect) {
        const ids = collectElementsInRect(document, marqueeRect);
        setMultiSelected(new Set(ids));
        if (ids.length > 0) {
          const rungId = findElementRungId(document, ids[0]);
          if (rungId) selectElement(rungId, ids[0]);
        }
      }
      setMarqueeRect(null);
      return;
    }

    if (panGesture.current?.active) {
      const wasClick = !panGesture.current.moved;
      panGesture.current.active = false;
      if (wasClick) {
        clearSelection();
        setMultiSelected(new Set());
      }
    }
  }

  // ── Auto-wire helper ─────────────────────────────────────────────────
  /** Finds the rightmost element in a rung that has no outgoing connections
   * (i.e. the current "end" of the series chain) so a newly dropped element
   * can be auto-wired after it. Returns null if the rung is empty. */
  function findChainEnd(rungId: string, excludeId?: string): string | null {
    const rung = document.rungs[rungId];
    if (!rung) return null;
    let rightmost: LadderElement | null = null;
    for (const id of rung.elementOrder) {
      if (id === excludeId) continue;
      const el = rung.elements[id];
      if (el.kind === 'COMMENT' || el.kind === 'BRANCH_START' || el.kind === 'BRANCH_END') continue;
      if ((el.connectsTo ?? []).length === 0) {
        if (!rightmost || el.gridX > rightmost.gridX) rightmost = el;
      }
    }
    return rightmost?.id ?? null;
  }

  /** Adds a component AND auto-wires it to the chain end of the rung. */
  function addComponentWithAutoWire(rungId: string, spec: Parameters<typeof addComponent>[1]) {
    const newEl = addComponent(rungId, spec);
    if (!newEl) return;
    const chainEndId = findChainEnd(rungId, newEl.id);
    if (chainEndId) {
      connect(rungId, chainEndId, newEl.id);
    }
  }

  // ── Palette Drag & Drop ──────────────────────────────────────────────
  function handleDropFromPalette(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const dragKind = e.dataTransfer.getData(DRAG_MIME);
    if (!dragKind || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldX = (screenX - camera.x) / camera.scale;
    const worldY = (screenY - camera.y) / camera.scale;

    const { gridX, gridY, rungIndex } = worldToGrid(worldX, worldY);
    const clampedIndex = Math.min(Math.max(rungIndex, 0), document.rungOrder.length - 1);
    const rungId = document.rungOrder[clampedIndex];
    if (!rungId) return;

    const addressType = addressTypeForDragKind(dragKind);
    const address = addressType ? { type: addressType, number: nextAvailableAddress(document, addressType) } : undefined;
    const spec = specForDragKind(dragKind, address, { gridX: Math.max(0, gridX), gridY });
    if (spec) addComponentWithAutoWire(rungId, spec);
  }

  // ── Drag existing elements ────────────────────────────────────────────
  function handleElementDragStart(elementId: string) {
    const rungId = findElementRungId(document, elementId);
    if (rungId) beginDrag(rungId, elementId);
  }

  function handleElementDragMove(elementId: string, worldX: number, worldY: number) {
    const rungId = findElementRungId(document, elementId);
    if (!rungId) return;
    const rungIndex = document.rungOrder.indexOf(rungId);
    const { gridX, gridY } = worldToGridForRung(worldX, worldY, rungIndex);
    updateDragPosition(gridX, gridY);
  }

  function handleElementDragEnd(elementId: string, worldX: number, worldY: number) {
    const rungId = findElementRungId(document, elementId);
    if (!rungId) return;
    const rungIndex = document.rungOrder.indexOf(rungId);
    const { gridX, gridY } = worldToGridForRung(worldX, worldY, rungIndex);
    updateDragPosition(gridX, gridY);
    endDrag(true);
  }

  // ── Connect / Branch two-click flow ──────────────────────────────────
  function handleAnchorClick(elementId: string) {
    if (!pendingAnchorId) {
      setPendingAnchorId(elementId);
      return;
    }
    if (pendingAnchorId === elementId) {
      setPendingAnchorId(null);
      return;
    }

    const rungA = findElementRungId(document, pendingAnchorId);
    const rungB = findElementRungId(document, elementId);
    if (!rungA || rungA !== rungB) {
      onError?.('Connect/branch can only link elements within the same rung.');
      setPendingAnchorId(null);
      return;
    }

    if (interactionMode === 'connect') {
      connect(rungA, pendingAnchorId, elementId);
    } else if (interactionMode === 'branch') {
      const a = findElement(document, pendingAnchorId);
      const b = findElement(document, elementId);
      const midGridX = a && b ? Math.round((a.gridX + b.gridX) / 2) : 0;
      const midGridY = a ? a.gridY + 1 : 1;
      branch(rungA, pendingAnchorId, elementId, { gridX: midGridX, gridY: midGridY });
    }

    setPendingAnchorId(null);
    onAnchorActionDone?.();
  }

  // ── Selection / input toggle in sim mode ──────────────────────────────
  function handleSelectElement(elementId: string) {
    if (isSimulating) {
      const el = findElement(document, elementId);
      if (el?.kind === 'CONTACT' && el.address.type === 'I') {
        setInput(el.address.number, !plcState.inputs[el.address.number]);
        return;
      }
    }
    const rungId = findElementRungId(document, elementId);
    if (rungId) selectElement(rungId, elementId);
    setMultiSelected(new Set([elementId]));
  }

  // ── Rail wire computation ─────────────────────────────────────────────
  /** Returns element ids that are "start" elements (no predecessors → wired
   * to the left rail) and "end" elements (no successors → wired to right
   * rail) for a given rung. */
  function getRailConnections(rungId: string): { starts: LadderElement[]; ends: LadderElement[] } {
    const rung = document.rungs[rungId];
    if (!rung) return { starts: [], ends: [] };

    const hasPredecessor = new Set<string>();
    for (const id of rung.elementOrder) {
      const el = rung.elements[id];
      for (const target of el.connectsTo ?? []) hasPredecessor.add(target);
    }

    const starts: LadderElement[] = [];
    const ends: LadderElement[] = [];
    for (const id of rung.elementOrder) {
      const el = rung.elements[id];
      if (el.kind === 'COMMENT') continue;
      if (!hasPredecessor.has(id)) starts.push(el);
      if ((el.connectsTo ?? []).length === 0) ends.push(el);
    }
    return { starts, ends };
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-2xl bg-white dark:bg-gray-950"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropFromPalette}
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
          <GridBackground camera={camera} stageWidth={size.width} stageHeight={size.height} rungCount={document.rungOrder.length} />

          {document.rungOrder.map((rungId, rungIndex) => {
            const rung = document.rungs[rungId];
            const { starts, ends } = getRailConnections(rungId);
            const railY = rungIndex * RUNG_HEIGHT + RUNG_HEIGHT / 2;
            const rightX = rightRailWorldX();

            return (
              <Fragment key={rungId}>
                {/* Rung number label */}
                <Text
                  text={`${rungIndex + 1}`}
                  x={LEFT_RAIL_X - 28}
                  y={railY - 7}
                  fontSize={12}
                  fontStyle="bold"
                  fill="#9A9A9A"
                />

                {/* Left rail → start elements wires */}
                {starts.map((el) => {
                  const pos = gridToWorld(el.gridX, el.gridY, rungIndex);
                  const isPowered = isSimulating && !!poweredElements[el.id];
                  return (
                    <Line
                      key={`rail-l-${el.id}`}
                      points={[LEFT_RAIL_X, railY, pos.x - GRID_SIZE / 2, pos.y]}
                      stroke={isPowered ? COLOR_POWER_ON : COLOR_RAIL}
                      strokeWidth={isPowered ? 3 : 2.5}
                      lineCap="round"
                      shadowColor={isPowered ? COLOR_POWER_ON : undefined}
                      shadowBlur={isPowered ? 6 : 0}
                      shadowOpacity={isPowered ? 0.5 : 0}
                    />
                  );
                })}

                {/* End elements → right rail wires */}
                {ends.map((el) => {
                  const pos = gridToWorld(el.gridX, el.gridY, rungIndex);
                  const isPowered = isSimulating && !!poweredElements[el.id];
                  return (
                    <Line
                      key={`rail-r-${el.id}`}
                      points={[pos.x + GRID_SIZE / 2, pos.y, rightX, railY]}
                      stroke={isPowered ? COLOR_POWER_ON : COLOR_RAIL}
                      strokeWidth={isPowered ? 3 : 2.5}
                      lineCap="round"
                      shadowColor={isPowered ? COLOR_POWER_ON : undefined}
                      shadowBlur={isPowered ? 6 : 0}
                      shadowOpacity={isPowered ? 0.5 : 0}
                    />
                  );
                })}

                {/* Element-to-element connection wires */}
                {rung.elementOrder.map((id) => {
                  const el = rung.elements[id];
                  const fromPos = gridToWorld(el.gridX, el.gridY, rungIndex);
                  return (el.connectsTo ?? []).map((targetId) => {
                    const target = rung.elements[targetId];
                    if (!target) return null;
                    const toPos = gridToWorld(target.gridX, target.gridY, rungIndex);
                    return (
                      <ConnectionLine
                        key={`${id}->${targetId}`}
                        from={fromPos}
                        to={toPos}
                        isPowered={isSimulating && !!poweredElements[id]}
                      />
                    );
                  });
                })}

                {/* Element glyphs */}
                {rung.elementOrder.map((id) => {
                  const el = rung.elements[id];
                  const pos = gridToWorld(el.gridX, el.gridY, rungIndex);
                  return (
                    <ElementNode
                      key={id}
                      element={el}
                      x={pos.x}
                      y={pos.y}
                      isPowered={isSimulating && !!poweredElements[id]}
                      isSelected={selection?.elementId === id || multiSelected.has(id)}
                      isPendingAnchor={pendingAnchorId === id}
                      interactionMode={interactionMode}
                      onSelect={handleSelectElement}
                      onAnchorClick={handleAnchorClick}
                      onDragStart={handleElementDragStart}
                      onDragMove={handleElementDragMove}
                      onDragEnd={handleElementDragEnd}
                      onOpenProperties={setPropertyDialogElementId}
                    />
                  );
                })}
              </Fragment>
            );
          })}

          {marqueeRect && (
            <Rect
              x={marqueeRect.x}
              y={marqueeRect.y}
              width={marqueeRect.width}
              height={marqueeRect.height}
              fill="rgba(37,99,235,0.08)"
              stroke={COLOR_SELECTED}
              strokeWidth={1}
              dash={[4, 3]}
            />
          )}
        </Layer>
      </Stage>

      {propertyDialogElementId &&
        (() => {
          const el = findElement(document, propertyDialogElementId);
          const rungId = findElementRungId(document, propertyDialogElementId);
          if (!el || !rungId) return null;
          return (
            <PropertyDialog
              element={el}
              onClose={() => setPropertyDialogElementId(null)}
              onSave={(updates) => updateElement(rungId, propertyDialogElementId, updates)}
            />
          );
        })()}
    </div>
  );
}
