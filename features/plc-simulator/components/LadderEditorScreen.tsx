import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import { ComponentPalette } from './ComponentPalette';
import { SimulatorToolbar } from './SimulatorToolbar';
import { LadderCanvas } from './LadderCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { BottomPanel } from './BottomPanel';
import { StatusBar } from './StatusBar';
import type { InteractionMode } from './ElementNode';

/**
 * Phase 6.0 — Industrial PLC IDE shell.
 *
 * This replaces the Phase 4/5 "toolbar + palette + canvas + floating side
 * panels" composition with the Omron CX-Programmer-style layout from the
 * brief:
 *
 *   Toolbar
 *   Toolbox | Ladder Canvas | Properties
 *   Bottom Panel (I/O · Watch · Errors · Debugger · Scan Time · Cross Ref)
 *   Status Bar
 *
 * On desktop, Toolbox and Properties are permanent docks either side of
 * the canvas. On mobile/tablet (<md), they collapse into a Toolbox
 * bottom sheet and a Properties drawer, opened from compact toolbar
 * buttons — workflow is identical, only the chrome adapts.
 *
 * Every piece of *simulation logic* here is unchanged from Phase 5.5:
 * this file only rearranges components and adds local UI-only state
 * (mobile sheet/drawer open flags, bottom panel collapsed flag).
 */
export function LadderEditorScreen() {
  const [mode, setMode] = useState<InteractionMode>('select');
  const [isSimulating, setIsSimulating] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  const [mobileToolboxOpen, setMobileToolboxOpen] = useState(false);
  const [mobilePropertiesOpen, setMobilePropertiesOpen] = useState(false);

  const addRung = useLadderEditorStore((s) => s.addRung);
  const exportToLadderJson = useLadderEditorStore((s) => s.exportToLadderJson);
  const lastErrors = useLadderEditorStore((s) => s.lastErrors);
  const selection = useLadderEditorStore((s) => s.selection);

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

  // Selecting an element on the canvas is the natural moment to surface its
  // properties — on mobile that means auto-opening the drawer, matching
  // how the always-visible desktop panel already reacts to selection.
  useEffect(() => {
    if (selection) setMobilePropertiesOpen(true);
  }, [selection?.elementId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="plc-ide -mx-5 -mb-28 flex h-[calc(100vh-210px)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[var(--ide-border)] md:-mx-8 md:mb-0 md:h-[calc(100vh-120px)]">
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
        errorMessage={errorMessage}
        scanCount={scanCount}
        lastScanDurationMs={lastScanDurationMs}
        onToggleToolbox={() => setMobileToolboxOpen(true)}
        onToggleProperties={() => setMobilePropertiesOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <ComponentPalette className="hidden md:flex" />

        <div className="min-w-0 flex-1 bg-[var(--ide-canvas)]">
          <LadderCanvas
            interactionMode={mode}
            isSimulating={isSimulating}
            onAnchorActionDone={() => setMode('select')}
            onError={setErrorMessage}
          />
        </div>

        <PropertiesPanel className="hidden md:flex" />
      </div>

      <BottomPanel
        isSimulating={isSimulating}
        collapsed={bottomCollapsed}
        onToggleCollapsed={() => setBottomCollapsed((v) => !v)}
      />

      <StatusBar />

      {/* Mobile Toolbox — bottom sheet */}
      {mobileToolboxOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden" onClick={() => setMobileToolboxOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative flex max-h-[75vh] w-full flex-col rounded-t-2xl border-t border-[var(--ide-border)] bg-[var(--ide-panel)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--ide-border)] px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ide-text-dim)]">
                Toolbox
              </span>
              <button onClick={() => setMobileToolboxOpen(false)} className="text-[var(--ide-text-dim)]">
                <X size={16} />
              </button>
            </div>
            <ComponentPalette className="flex h-full w-full border-r-0" />
          </div>
        </div>
      )}

      {/* Mobile Properties — right drawer */}
      {mobilePropertiesOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden" onClick={() => setMobilePropertiesOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative flex h-full w-[85vw] max-w-xs flex-col border-l border-[var(--ide-border)] bg-[var(--ide-panel)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end border-b border-[var(--ide-border)] px-3 py-2">
              <button onClick={() => setMobilePropertiesOpen(false)} className="text-[var(--ide-text-dim)]">
                <X size={16} />
              </button>
            </div>
            <PropertiesPanel className="flex h-full w-full border-l-0" />
          </div>
        </div>
      )}
    </div>
  );
}
