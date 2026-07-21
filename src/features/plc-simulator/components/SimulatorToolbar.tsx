import { MousePointer2, Cable, GitBranch, Play, Square, Plus, AlertCircle, RotateCcw, StepForward, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  onToggleDebugger: () => void;
  showDebugger: boolean;
  errorMessage: string | null;
  scanCount: number;
  lastScanDurationMs: number;
}

const MODES: { mode: InteractionMode; label: string; icon: typeof MousePointer2; hint: string }[] = [
  { mode: 'select', label: 'Select', icon: MousePointer2, hint: 'Click to select, drag to move' },
  { mode: 'connect', label: 'Connect', icon: Cable, hint: 'Click two elements to wire them in series' },
  { mode: 'branch', label: 'Branch', icon: GitBranch, hint: 'Click two elements to create a parallel branch' },
];

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
  onToggleDebugger,
  showDebugger,
  errorMessage,
  scanCount,
  lastScanDurationMs,
}: SimulatorToolbarProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="glass flex flex-wrap items-center gap-1.5 rounded-xl px-2 py-1.5">
        {/* Edit mode group */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1.5 dark:border-border-dark">
          {MODES.map(({ mode: m, label, icon: Icon, hint }) => (
            <Button
              key={m}
              variant={mode === m ? 'default' : 'ghost'}
              size="sm"
              title={hint}
              disabled={isSimulating}
              onClick={() => onModeChange(m)}
              className="h-8 gap-1.5 px-2.5"
            >
              <Icon size={15} />
              <span className="hidden text-xs sm:inline">{label}</span>
            </Button>
          ))}
        </div>

        {/* Add Rung */}
        <Button variant="ghost" size="sm" onClick={onAddRung} disabled={isSimulating} title="Add Rung" className="h-8 gap-1.5 px-2.5">
          <Plus size={15} /> <span className="hidden text-xs sm:inline">Rung</span>
        </Button>

        {/* Scan mode toggle */}
        <div className="flex items-center gap-0.5 border-l border-border pl-1.5 dark:border-border-dark">
          <Button
            variant={continuousMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => onContinuousModeChange(true)}
            title="Continuous Scan"
            className="h-8 px-2.5 text-xs"
          >
            Continuous
          </Button>
          <Button
            variant={!continuousMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => onContinuousModeChange(false)}
            title="Single Scan"
            className="h-8 px-2.5 text-xs"
          >
            Single
          </Button>
        </div>

        {/* Sim controls */}
        <div className="ml-auto flex items-center gap-1">
          {!continuousMode && (
            <Button variant="outline" size="sm" onClick={onStep} title="Step one scan" className="h-8 gap-1.5 px-2.5">
              <StepForward size={15} /> <span className="hidden text-xs sm:inline">Step</span>
            </Button>
          )}
          <Button
            variant={isSimulating ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleSimulate}
            title={isSimulating ? 'Stop' : 'Run'}
            className={cn('h-8 gap-1.5 px-3', isSimulating && 'bg-green-600 hover:bg-green-700')}
          >
            {isSimulating ? <Square size={15} /> : <Play size={15} />}
            <span className="text-xs">{isSimulating ? 'Stop' : 'Run'}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset} title="Reset I/O, timers, counters" className="h-8 px-2.5">
            <RotateCcw size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleDebugger}
            title={showDebugger ? 'Hide Debugger' : 'Show Debugger'}
            className={cn('h-8 px-2.5', showDebugger && 'bg-muted/40 dark:bg-white/5')}
          >
            <Bug size={15} />
          </Button>
          {isSimulating && <Badge variant="success" className="ml-1">LIVE</Badge>}
        </div>
      </div>

      {/* Hint line */}
      <div className="flex items-center justify-between px-1">
        {mode !== 'select' && !isSimulating ? (
          <p className="text-[11px] text-muted-foreground">
            {mode === 'connect'
              ? 'Click first element, then second element to wire them.'
              : 'Click first element, then second element to create a parallel branch.'}
          </p>
        ) : (
          <span />
        )}
        {isSimulating && (
          <span className="text-[11px] text-muted-foreground">
            Scan #{scanCount} · {lastScanDurationMs.toFixed(1)} ms
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={14} />
          {errorMessage}
        </div>
      )}
    </div>
  );
}
