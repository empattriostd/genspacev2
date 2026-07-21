import { MousePointer2, GitBranch, Play, Square, Plus, RotateCcw, Wrench, Bug } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { InteractionMode } from './ElementNode';

interface MobileToolbarProps {
  mode: InteractionMode;
  onModeChange: (mode: InteractionMode) => void;
  isSimulating: boolean;
  onToggleSimulate: () => void;
  onReset: () => void;
  onAddRung: () => void;
  onOpenToolbox: () => void;
  onToggleDebugger: () => void;
  showDebugger: boolean;
}

const MODE_ICONS: { mode: InteractionMode; icon: typeof MousePointer2; label: string }[] = [
  { mode: 'select', icon: MousePointer2, label: 'Sel' },
  { mode: 'insert', icon: Plus, label: 'Insert' },
  { mode: 'branch', icon: GitBranch, label: 'Branch' },
];;

/**
 * Compact mobile toolbar — icon-only buttons in a single row. Replaces the
 * desktop toolbar's text labels with icons to save horizontal space. The
 * toolbox is opened via a wrench button that triggers the bottom sheet.
 */
export function MobileToolbar({
  mode,
  onModeChange,
  isSimulating,
  onToggleSimulate,
  onReset,
  onAddRung,
  onOpenToolbox,
  onToggleDebugger,
  showDebugger,
}: MobileToolbarProps) {
  return (
    <div className="glass flex items-center gap-1 rounded-xl px-1.5 py-1.5">
      {MODE_ICONS.map(({ mode: m, icon: Icon, label }) => (
        <button
          key={m}
          onClick={() => onModeChange(m)}
          disabled={isSimulating}
          title={label}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40',
            mode === m ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted/40 dark:hover:bg-white/5'
          )}
        >
          <Icon size={18} />
        </button>
      ))}

      <div className="mx-0.5 h-6 w-px bg-border dark:bg-border-dark" />

      <button
        onClick={onOpenToolbox}
        title="Toolbox"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40 dark:hover:bg-white/5"
      >
        <Wrench size={18} />
      </button>

      <button
        onClick={onAddRung}
        disabled={isSimulating}
        title="Add Rung"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40 disabled:opacity-40 dark:hover:bg-white/5"
      >
        <Plus size={18} />
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={onReset}
          title="Reset"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40 dark:hover:bg-white/5"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={onToggleDebugger}
          title="Debugger"
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40 dark:hover:bg-white/5',
            showDebugger && 'bg-muted/40 dark:bg-white/5'
          )}
        >
          <Bug size={18} />
        </button>
        <button
          onClick={onToggleSimulate}
          title={isSimulating ? 'Stop' : 'Run'}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors',
            isSimulating ? 'bg-green-600' : 'bg-primary'
          )}
        >
          {isSimulating ? <Square size={18} /> : <Play size={18} />}
        </button>
      </div>
    </div>
  );
}
