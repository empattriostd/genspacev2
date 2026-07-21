import { Circle, AlertTriangle } from 'lucide-react';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import { cn } from '@/utils/cn';

/**
 * Phase 6.0 — the bottom Status Bar every industrial PLC IDE has (CX-P,
 * TIA Portal, GX Works all keep one permanently visible). Everything shown
 * here is a read of state that already existed before this phase
 * (usePlcStore's scanCount/lastScanDurationMs/programSize/diagnostics, the
 * editor store's selection) — this component adds no new state of its own.
 */
export function StatusBar() {
  const selection = useLadderEditorStore((s) => s.selection);
  const document = useLadderEditorStore((s) => s.document);
  const lastErrors = useLadderEditorStore((s) => s.lastErrors);

  const isRunning = usePlcStore((s) => s.isRunning);
  const scanCount = usePlcStore((s) => s.state.scanCount);
  const lastScanDurationMs = usePlcStore((s) => s.state.lastScanDurationMs);
  const programSize = usePlcStore((s) => s.programSize);
  const diagnostics = usePlcStore((s) => s.diagnostics);

  const rungIndex = selection ? document.rungOrder.indexOf(selection.rungId) : -1;
  const selectedElement = selection ? document.rungs[selection.rungId]?.elements[selection.elementId] : null;
  const currentAddress =
    selectedElement && 'address' in selectedElement && selectedElement.address
      ? `${selectedElement.address.type}${selectedElement.address.number}`
      : '—';

  const errorCount = lastErrors.length + diagnostics.length;

  return (
    <div className="plc-panel-texture flex h-7 shrink-0 items-center gap-4 border-t border-[var(--ide-border)] bg-[var(--ide-panel)] px-3 text-[11px] text-[var(--ide-text-dim)]">
      <span className="flex items-center gap-1.5 font-semibold">
        <Circle
          size={8}
          className={cn(isRunning ? 'text-[var(--ide-run)] plc-live-dot' : 'text-[var(--ide-stop)]')}
          fill="currentColor"
        />
        <span className={isRunning ? 'text-[var(--ide-run)]' : 'text-[var(--ide-stop)]'}>
          {isRunning ? 'RUN' : 'STOP'}
        </span>
      </span>

      <span className="hidden text-[var(--ide-border-soft)] sm:inline">|</span>
      <span className="hidden sm:inline">
        Scan Time: <span className="font-mono text-[var(--ide-text)]">{lastScanDurationMs.toFixed(1)} ms</span>
      </span>

      <span className="hidden text-[var(--ide-border-soft)] md:inline">|</span>
      <span className="hidden md:inline">
        Scan #: <span className="font-mono text-[var(--ide-text)]">{scanCount}</span>
      </span>

      <span className="hidden text-[var(--ide-border-soft)] md:inline">|</span>
      <span className="hidden md:inline">
        Instructions:{' '}
        <span className="font-mono text-[var(--ide-text)]">
          {programSize.instructionCount} ({programSize.rungCount} rungs)
        </span>
      </span>

      <span className="hidden text-[var(--ide-border-soft)] lg:inline">|</span>
      <span className="hidden lg:inline">
        Rung: <span className="font-mono text-[var(--ide-text)]">{rungIndex >= 0 ? rungIndex + 1 : '—'}</span>
      </span>

      <span className="hidden text-[var(--ide-border-soft)] lg:inline">|</span>
      <span className="hidden lg:inline">
        Address: <span className="font-mono text-[var(--ide-text)]">{currentAddress}</span>
      </span>

      <span className="ml-auto flex items-center gap-1.5">
        {errorCount > 0 ? (
          <>
            <AlertTriangle size={12} className="text-[var(--ide-warn)]" />
            <span className="text-[var(--ide-warn)]">
              {errorCount} error{errorCount === 1 ? '' : 's'}
            </span>
          </>
        ) : (
          <span className="text-[var(--ide-text-faint)]">No errors</span>
        )}
      </span>
    </div>
  );
}
