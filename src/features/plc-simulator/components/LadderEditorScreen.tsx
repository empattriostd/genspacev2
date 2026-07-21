import { useEffect, useState, useCallback } from 'react';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import { useResponsive } from '../hooks/useResponsive';
import { ComponentPalette } from './ComponentPalette';
import { SimulatorToolbar } from './SimulatorToolbar';
import { LadderCanvas } from './LadderCanvas';
import { SimulationPanel } from './SimulationPanel';
import { DebuggerPanel } from './DebuggerPanel';
import { PropertyPanel } from './PropertyPanel';
import { MobileToolbar } from './MobileToolbar';
import { MobileToolboxSheet } from './MobileToolboxSheet';
import { MobilePropertyDrawer } from './MobilePropertyDrawer';
import { MobileSimPanel } from './MobileSimPanel';
import { nextAvailableAddress } from '../utils/addressAllocation';
import { worldToGrid } from '../utils/coords';
import { specForDragKind, addressTypeForDragKind } from './ComponentPalette';
import type { InteractionMode } from './ElementNode';

/**
 * Top-level composition for the multi-platform ladder editor.
 *
 * Desktop (≥1024px): CX-Programmer layout — Toolbar top, Toolbox left,
 *   Canvas center, Property right, Debugger bottom.
 * Tablet (640–1023px): Compact desktop layout with narrower panels.
 * Mobile (<640px): Mobile PLC editor — compact toolbar, canvas fills
 *   screen, toolbox as bottom sheet, properties as right drawer,
 *   I/O as collapsible strip.
 *
 * All editor logic (auto-wire, branch, selection, simulation) is identical
 * across platforms — only the layout and interaction surface differ.
 */
export function LadderEditorScreen() {
  const { isDesktop, isMobile, isTablet } = useResponsive();

  const [mode, setMode] = useState<InteractionMode>('select');
  const [isSimulating, setIsSimulating] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDebugger, setShowDebugger] = useState(false);

  // Mobile-only UI state
  const [toolboxOpen, setToolboxOpen] = useState(false);
  const [propertyDrawerOpen, setPropertyDrawerOpen] = useState(false);
  const [pendingPlacementKind, setPendingPlacementKind] = useState<string | null>(null);

  const addRung = useLadderEditorStore((s) => s.addRung);
  const exportToLadderJson = useLadderEditorStore((s) => s.exportToLadderJson);
  const lastErrors = useLadderEditorStore((s) => s.lastErrors);
  const selection = useLadderEditorStore((s) => s.selection);
  const document = useLadderEditorStore((s) => s.document);
  const addComponent = useLadderEditorStore((s) => s.addComponent);
  const connect = useLadderEditorStore((s) => s.connect);

  const loadProject = usePlcStore((s) => s.loadProject);
  const start = usePlcStore((s) => s.start);
  const stop = usePlcStore((s) => s.stop);
  const step = usePlcStore((s) => s.step);
  const reset = usePlcStore((s) => s.reset);
  const scanCount = usePlcStore((s) => s.state.scanCount);
  const lastScanDurationMs = usePlcStore((s) => s.state.lastScanDurationMs);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    if (lastErrors.length > 0) setErrorMessage(lastErrors[lastErrors.length - 1]);
  }, [lastErrors]);

  // Open property drawer when an element is selected on mobile
  useEffect(() => {
    if ((isMobile || isTablet) && selection) {
      setPropertyDrawerOpen(true);
    }
  }, [selection, isMobile, isTablet]);

  function armSimulation(): boolean {
    const { project, errors } = exportToLadderJson();
    if (errors.length > 0) {
      setErrorMessage(errors[0]);
      return false;
    }
    loadProject(project);
    return true;
  }

  function handleToggleSimulate() {
    if (isSimulating) {
      stop();
      setIsSimulating(false);
      return;
    }
    if (!armSimulation()) return;
    if (continuousMode) start();
    setIsSimulating(true);
    setMode('select');
  }

  function handleStep() {
    if (!isSimulating) {
      if (!armSimulation()) return;
      setIsSimulating(true);
      setMode('select');
    }
    step();
  }

  function handleReset() {
    reset();
    setIsSimulating(false);
  }

  // ── Mobile tap-to-place ──────────────────────────────────────────────
  /** When a palette tool is armed on mobile, tapping the canvas places the
   * component at the tapped grid position with auto-wire. */
  const handleCanvasTapPlace = useCallback(
    (worldX: number, worldY: number) => {
      if (!pendingPlacementKind) return;
      const { gridX, gridY, rungIndex } = worldToGrid(worldX, worldY);
      const clampedIndex = Math.min(Math.max(rungIndex, 0), document.rungOrder.length - 1);
      const rungId = document.rungOrder[clampedIndex];
      if (!rungId) return;

      const addressType = addressTypeForDragKind(pendingPlacementKind);
      const address = addressType
        ? { type: addressType, number: nextAvailableAddress(document, addressType) }
        : undefined;
      const spec = specForDragKind(pendingPlacementKind, address, { gridX: Math.max(0, gridX), gridY });
      if (spec) {
        const newEl = addComponent(rungId, spec);
        if (newEl) {
          // Auto-wire to chain end
          const rung = document.rungs[rungId];
          let chainEndId: string | null = null;
          for (const id of rung.elementOrder) {
            if (id === newEl.id) continue;
            const el = rung.elements[id];
            if (el.kind === 'COMMENT' || el.kind === 'BRANCH_START' || el.kind === 'BRANCH_END') continue;
            if ((el.connectsTo ?? []).length === 0) {
              if (!chainEndId || el.gridX > rung.elements[chainEndId].gridX) chainEndId = id;
            }
          }
          if (chainEndId) connect(rungId, chainEndId, newEl.id);
        }
      }
      setPendingPlacementKind(null);
    },
    [pendingPlacementKind, document, addComponent, connect]
  );

  // ── Desktop layout ──────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div className="flex h-full flex-col gap-1.5">
        <SimulatorToolbar
          mode={mode}
          onModeChange={setMode}
          isSimulating={isSimulating}
          continuousMode={continuousMode}
          onContinuousModeChange={setContinuousMode}
          onToggleSimulate={handleToggleSimulate}
          onStep={handleStep}
          onReset={handleReset}
          onAddRung={() => addRung()}
          onToggleDebugger={() => setShowDebugger((v) => !v)}
          showDebugger={showDebugger}
          errorMessage={errorMessage}
          scanCount={scanCount}
          lastScanDurationMs={lastScanDurationMs}
        />
        <div className="flex flex-1 gap-2 overflow-hidden">
          <ComponentPalette />
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            <div className="flex-1 overflow-hidden rounded-2xl">
              <LadderCanvas
                interactionMode={mode}
                isSimulating={isSimulating}
                onAnchorActionDone={() => setMode('select')}
                onError={setErrorMessage}
              />
            </div>
            {showDebugger && (
              <div className="h-48 shrink-0 overflow-hidden">
                <DebuggerPanel />
              </div>
            )}
          </div>
          <SimulationPanel isSimulating={isSimulating} />
          <PropertyPanel isSimulating={isSimulating} />
        </div>
      </div>
    );
  }

  // ── Tablet layout (compact desktop) ──────────────────────────────────
  if (isTablet) {
    return (
      <div className="flex h-full flex-col gap-1.5">
        <SimulatorToolbar
          mode={mode}
          onModeChange={setMode}
          isSimulating={isSimulating}
          continuousMode={continuousMode}
          onContinuousModeChange={setContinuousMode}
          onToggleSimulate={handleToggleSimulate}
          onStep={handleStep}
          onReset={handleReset}
          onAddRung={() => addRung()}
          onToggleDebugger={() => setShowDebugger((v) => !v)}
          showDebugger={showDebugger}
          errorMessage={errorMessage}
          scanCount={scanCount}
          lastScanDurationMs={lastScanDurationMs}
        />
        <div className="flex flex-1 gap-2 overflow-hidden">
          <ComponentPalette />
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            <div className="flex-1 overflow-hidden rounded-2xl">
              <LadderCanvas
                interactionMode={mode}
                isSimulating={isSimulating}
                onAnchorActionDone={() => setMode('select')}
                onError={setErrorMessage}
              />
            </div>
            {showDebugger && (
              <div className="h-40 shrink-0 overflow-hidden">
                <DebuggerPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile layout ────────────────────────────────────────────────────
  return (
    <MobileEditorLayout
      mode={mode}
      setMode={setMode}
      isSimulating={isSimulating}
      onToggleSimulate={handleToggleSimulate}
      onReset={handleReset}
      onAddRung={() => addRung()}
      onOpenToolbox={() => setToolboxOpen(true)}
      onToggleDebugger={() => setShowDebugger((v) => !v)}
      showDebugger={showDebugger}
      errorMessage={errorMessage}
      onCanvasTapPlace={handleCanvasTapPlace}
      pendingPlacementKind={pendingPlacementKind}
      setPendingPlacementKind={setPendingPlacementKind}
      toolboxOpen={toolboxOpen}
      setToolboxOpen={setToolboxOpen}
      propertyDrawerOpen={propertyDrawerOpen}
      setPropertyDrawerOpen={setPropertyDrawerOpen}
      onAnchorActionDone={() => setMode('select')}
      onError={setErrorMessage}
    />
  );
}

// ── Mobile layout sub-component ─────────────────────────────────────────
interface MobileEditorLayoutProps {
  mode: InteractionMode;
  setMode: (m: InteractionMode) => void;
  isSimulating: boolean;
  onToggleSimulate: () => void;
  onReset: () => void;
  onAddRung: () => void;
  onOpenToolbox: () => void;
  onToggleDebugger: () => void;
  showDebugger: boolean;
  errorMessage: string | null;
  onCanvasTapPlace: (worldX: number, worldY: number) => void;
  pendingPlacementKind: string | null;
  setPendingPlacementKind: (kind: string | null) => void;
  toolboxOpen: boolean;
  setToolboxOpen: (open: boolean) => void;
  propertyDrawerOpen: boolean;
  setPropertyDrawerOpen: (open: boolean) => void;
  onAnchorActionDone: () => void;
  onError: (msg: string) => void;
}

function MobileEditorLayout(props: MobileEditorLayoutProps) {
  const {
    mode,
    setMode,
    isSimulating,
    onToggleSimulate,
    onReset,
    onAddRung,
    onOpenToolbox,
    onToggleDebugger,
    showDebugger,
    errorMessage,
    onCanvasTapPlace,
    pendingPlacementKind,
    setPendingPlacementKind,
    toolboxOpen,
    setToolboxOpen,
    propertyDrawerOpen,
    setPropertyDrawerOpen,
    onAnchorActionDone,
    onError,
  } = props;

  return (
    <div className="flex h-full flex-col gap-1.5">
      <MobileToolbar
        mode={mode}
        onModeChange={setMode}
        isSimulating={isSimulating}
        onToggleSimulate={onToggleSimulate}
        onReset={onReset}
        onAddRung={onAddRung}
        onOpenToolbox={onOpenToolbox}
        onToggleDebugger={onToggleDebugger}
        showDebugger={showDebugger}
      />

      {errorMessage && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-600 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-2xl">
        <LadderCanvas
          interactionMode={mode}
          isSimulating={isSimulating}
          onAnchorActionDone={onAnchorActionDone}
          onError={onError}
          pendingPlacementKind={pendingPlacementKind}
          onCanvasTapPlace={onCanvasTapPlace}
        />
      </div>

      {showDebugger && (
        <div className="h-32 shrink-0 overflow-hidden">
          <DebuggerPanel />
        </div>
      )}

      <MobileSimPanel isSimulating={isSimulating} />

      <MobileToolboxSheet
        isOpen={toolboxOpen}
        onClose={() => setToolboxOpen(false)}
        onPick={(kind) => {
          setPendingPlacementKind(kind);
          setToolboxOpen(false);
        }}
        pendingKind={pendingPlacementKind}
      />

      <MobilePropertyDrawer
        isOpen={propertyDrawerOpen}
        onClose={() => setPropertyDrawerOpen(false)}
        isSimulating={isSimulating}
      />
    </div>
  );
}
