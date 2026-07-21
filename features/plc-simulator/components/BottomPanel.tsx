import { ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { usePlcStore } from '@/stores/plcStore';
import { DebuggerPanel } from './DebuggerPanel';
import { cn } from '@/utils/cn';

/**
 * Phase 6.0 — the Bottom Panel every industrial IDE keeps docked under the
 * canvas (Watch / Errors / Debugger / Scan Time / Cross Reference, per the
 * brief). This component owns only the collapse/expand chrome; the tabs
 * themselves are the existing DebuggerPanel (Phase 5.5, content untouched)
 * rendered in `bare` mode so it fills this dock edge-to-edge.
 */
export function BottomPanel({
  isSimulating,
  collapsed,
  onToggleCollapsed,
}: {
  isSimulating: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const diagnostics = usePlcStore((s) => s.diagnostics);

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col border-t border-[var(--ide-border)] bg-[var(--ide-panel)] transition-[height] duration-150',
        collapsed ? 'h-9' : 'h-64'
      )}
    >
      <button
        onClick={onToggleCollapsed}
        className="plc-panel-texture flex h-9 shrink-0 items-center gap-2 border-b border-[var(--ide-border)] px-3 text-left"
      >
        <Terminal size={13} className="text-[var(--ide-text-dim)]" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ide-text-dim)]">
          Bottom Panel
        </span>
        {diagnostics.length > 0 && (
          <span className="rounded-full bg-[var(--ide-warn)]/20 px-1.5 text-[9px] font-semibold text-[var(--ide-warn)]">
            {diagnostics.length}
          </span>
        )}
        <span className="ml-auto text-[var(--ide-text-faint)]">
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {!collapsed && (
        <div className="min-h-0 flex-1">
          <DebuggerPanel isSimulating={isSimulating} bare />
        </div>
      )}
    </div>
  );
}
