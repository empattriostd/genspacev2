import { useEffect, useState } from 'react';
import { useGridEditorStore } from '@/stores/gridEditorStore';
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
import type { InteractionMode } from './ElementNode';

/**
 * Top-level composition for the multi-platform grid-based ladder editor.
 *
 * Desktop (≥1024px): CX-Programmer layout — Toolbar top, Toolbox left,
 *   Canvas center, Property right, Debugger bottom.
 * Tablet (640–1023px): Compact desktop layout.
 * Mobile (<640px): Mobile PLC editor — compact toolbar, canvas fills
 *   screen, toolbox as bottom sheet, properties as right drawer,
 *   I/O as collapsible strip.
 *
 * All editor logic uses the grid-based store (useGridEditorStore) —
 * components live at (column, branchLevel), wires are auto-deriveded.
 */
export function LadderEditorScreen() {
  const { isDesktop, isMobile, isTablet } = useResponsive();

  const [mode, setMode] = useState<InteractionMode>('select');
  const [isSimulating, setIsSimulating] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDebugger, setShowDebugger] = useState(false);

  const [toolboxOpen, setToolboxOpen] = useState(false);
  const [propertyDrawerOpen, setPropertyDrawerOpen] = useState(false);

  const addRung = useGridEditorStore((s) => s.addRung);
  const exportToLadder = useGridEditorStore((s) => s.exportToLadder);
  const lastErrors = useGridEditorStore((s) => s.lastErrors);
  const selectedElementId = useGridEditorStore((s) => s.selectedElementId);

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

  useEffect(() => {
    if ((isMobile || isTablet) && selectedElementId) {
      setPropertyDrawerOpen(true);
    }
  }, [selectedElementId, isMobile, isTablet]);

  function armSimulation(): boolean {
    const { project, errors } = exportToLadder();
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

  // ── Tablet layout ───────────────────────────────────────────────────
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
    <div className="flex h-full flex-col gap-1.5">
      <MobileToolbar
        mode={mode}
        onModeChange={setMode}
        isSimulating={isSimulating}
        onToggleSimulate={handleToggleSimulate}
        onReset={handleReset}
        onAddRung={() => addRung()}
        onOpenToolbox={() => setToolboxOpen(true)}
        onToggleDebugger={() => setShowDebugger((v) => !v)}
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
          onError={setErrorMessage}
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
      />

      <MobilePropertyDrawer
        isOpen={propertyDrawerOpen}
        onClose={() => setPropertyDrawerOpen(false)}
        isSimulating={isSimulating}
      />
    </div>
  );
}
