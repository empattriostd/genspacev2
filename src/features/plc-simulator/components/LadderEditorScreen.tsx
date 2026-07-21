import { useEffect, useState } from 'react';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import { ComponentPalette } from './ComponentPalette';
import { SimulatorToolbar } from './SimulatorToolbar';
import { LadderCanvas } from './LadderCanvas';
import { SimulationPanel } from './SimulationPanel';
import { DebuggerPanel } from './DebuggerPanel';
import { PropertyPanel } from './PropertyPanel';
import type { InteractionMode } from './ElementNode';

/**
 * Top-level composition for the CX-Programmer-style editor: Toolbar + Toolbox
 * + Canvas + I/O Panel + Property Panel + Debugger, wired to the existing
 * useLadderEditorStore and usePlcStore (both unmodified — Runtime, Logic
 * Engine, Scan Cycle, and Memory Engine are untouched).
 */
export function LadderEditorScreen() {
  const [mode, setMode] = useState<InteractionMode>('select');
  const [isSimulating, setIsSimulating] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDebugger, setShowDebugger] = useState(false);

  const addRung = useLadderEditorStore((s) => s.addRung);
  const exportToLadderJson = useLadderEditorStore((s) => s.exportToLadderJson);
  const lastErrors = useLadderEditorStore((s) => s.lastErrors);

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
        <div className="flex-1 overflow-hidden rounded-2xl">
          <LadderCanvas
            interactionMode={mode}
            isSimulating={isSimulating}
            onAnchorActionDone={() => setMode('select')}
            onError={setErrorMessage}
          />
        </div>
        <SimulationPanel isSimulating={isSimulating} />
        <PropertyPanel isSimulating={isSimulating} />
        {showDebugger && <DebuggerPanel />}
      </div>
    </div>
  );
}
