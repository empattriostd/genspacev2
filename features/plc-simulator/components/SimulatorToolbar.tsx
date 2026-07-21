import { MousePointer2, Cable, GitBranch, Play, Square, Plus, AlertCircle, RotateCcw, StepForward } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { InteractionMode } from './ElementNode';

interface SimulatorToolbarProps {
  mode: InteractionMode;
  onModeChange: (mode: InteractionMode) => void;
  isSimulating: boolean;
  continuousMode: boolean;
  onContinuousModeChange: (continuous: boolean) => void;
  onToggleSimulate: () => void;
  onStep: () => void;
  onReset: () => void;
  onAddRung: () => void;
  errorMessage: string | null;
  scanCount: number;
  lastScanDurationMs: number;
  /** Phase 6.0 — toggles for the mobile bottom-sheet Toolbox / drawer
   * Properties panel. Undefined on desktop, where both docks are always
   * visible and these buttons don't render. */
  onToggleToolbox?: () => void;
  onToggleProperties?: () => void;
}

const MODES: { mode: InteractionMode; label: string; icon: typeof MousePointer2 }[] = [
  { mode: 'select', label: 'Select / Move', icon: MousePointer2 },
  { mode: 'connect', label: 'Connect', icon: Cable },
  { mode: 'branch', label: 'Branch', icon: GitBranch },
];

/** A single toolbar icon-button — the compact CX-Programmer-style control
 * every group below is built from. */
function ToolbarButton({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'bg-[var(--ide-accent)]/20 text-[var(--ide-accent)]'
          : 'text-[var(--ide-text-dim)] hover:bg-white/5 hover:text-[var(--ide-text)]'
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-[var(--ide-border)]" />;
}

/**
 * Phase 6.0 — full industrial-IDE toolbar (top of the shell). Every prop
 * here is unchanged from Phase 5's SimulatorToolbar; this pass only
 * restyles the markup (icon-first ribbon groups, dark workbench palette,
 * project/run indicator) and adds two optional mobile-only toggle props.
 */
export function SimulatorToolbar({
  mode,
  onModeChange,
  isSimulating,
  continuousMode,
  onContinuousModeChange,
  onToggleSimulate,
  onStep,
  onReset,
  onAddRung,
  errorMessage,
  scanCount,
  lastScanDurationMs,
  onToggleToolbox,
  onToggleProperties,
}: SimulatorToolbarProps) {
  return (
    <div className="flex flex-col">
      <div className="plc-panel-texture flex h-11 shrink-0 items-center gap-1 border-b border-[var(--ide-border)] bg-[var(--ide-panel)] px-2">
        {onToggleToolbox && (
          <div className="flex items-center gap-1 md:hidden">
            <ToolbarButton title="Toolbox" onClick={onToggleToolbox}>
              Toolbox
            </ToolbarButton>
            <Divider />
          </div>
        )}

        <div className="flex items-center gap-0.5">
          {MODES.map(({ mode: m, label, icon: Icon }) => (
            <ToolbarButton key={m} active={mode === m} disabled={isSimulating} title={label} onClick={() => onModeChange(m)}>
              <Icon size={14} />
              <span className="hidden lg:inline">{label}</span>
            </ToolbarButton>
          ))}
        </div>

        <Divider />

        <ToolbarButton title="Add Rung" disabled={isSimulating} onClick={onAddRung}>
          <Plus size={14} />
          <span className="hidden lg:inline">Rung</span>
        </ToolbarButton>

        <Divider />

        <div className="flex items-center gap-0.5">
          <ToolbarButton title="Continuous Scan" active={continuousMode} onClick={() => onContinuousModeChange(true)}>
            <span className="hidden sm:inline">Continuous</span>
            <span className="sm:hidden">Cont.</span>
          </ToolbarButton>
          <ToolbarButton
            title="Single Scan — advance one scan cycle at a time"
            active={!continuousMode}
            onClick={() => onContinuousModeChange(false)}
          >
            <span className="hidden sm:inline">Single Scan</span>
            <span className="sm:hidden">Single</span>
          </ToolbarButton>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {!continuousMode && (
            <ToolbarButton title="Execute exactly one scan cycle" onClick={onStep}>
              <StepForward size={14} />
              <span className="hidden lg:inline">Step</span>
            </ToolbarButton>
          )}

          <button
            title={isSimulating ? 'Stop simulation' : 'Run simulation'}
            onClick={onToggleSimulate}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors',
              isSimulating
                ? 'bg-[var(--ide-stop)]/15 text-[var(--ide-stop)] hover:bg-[var(--ide-stop)]/25'
                : 'bg-[var(--ide-run)]/15 text-[var(--ide-run)] hover:bg-[var(--ide-run)]/25'
            )}
          >
            {isSimulating ? <Square size={14} /> : <Play size={14} />}
            {isSimulating ? 'STOP' : 'RUN'}
          </button>

          <ToolbarButton title="Reset — clears all I/O, timers, counters" onClick={onReset}>
            <RotateCcw size={14} />
          </ToolbarButton>

          {isSimulating && (
            <span className="ml-1 hidden items-center gap-1 rounded-full bg-[var(--ide-run)]/15 px-2 py-1 text-[10px] font-semibold text-[var(--ide-run)] sm:flex">
              Scan #{scanCount} · {lastScanDurationMs.toFixed(1)}ms
            </span>
          )}

          {onToggleProperties && (
            <div className="flex items-center gap-1 md:hidden">
              <Divider />
              <ToolbarButton title="Properties" onClick={onToggleProperties}>
                Properties
              </ToolbarButton>
            </div>
          )}
        </div>
      </div>

      {mode !== 'select' && !isSimulating && (
        <div className="border-b border-[var(--ide-border)] bg-[var(--ide-panel-alt)] px-3 py-1">
          <p className="text-[11px] text-[var(--ide-text-dim)]">
            {mode === 'connect'
              ? 'Click an element, then click another to wire them together — same rung only.'
              : 'Click two elements to add a parallel path between them, then drop a component onto the new wire.'}
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 border-b border-[var(--ide-stop)]/30 bg-[var(--ide-stop)]/10 px-3 py-1.5 text-xs text-[var(--ide-stop)]">
          <AlertCircle size={13} />
          {errorMessage}
        </div>
      )}
    </div>
  );
}
