import { usePlcStore } from '@/stores/plcStore';
import { ADDRESS_RANGE } from '@/simulator/types/plcState';
import { cn } from '@/utils/cn';

/**
 * Physical I/O panel: toggle switches for every input address, lamps for
 * every output address. Phase 6.0: this now lives as the "I/O" tab inside
 * the bottom dock (`bare` drops its own card chrome so it sits flush
 * inside that dock's tab body) instead of a standalone floating card —
 * the underlying store reads/actions are untouched.
 */
export function SimulationPanel({ isSimulating, bare = false }: { isSimulating: boolean; bare?: boolean }) {
  const inputs = usePlcStore((s) => s.state.inputs);
  const outputs = usePlcStore((s) => s.state.outputs);
  const setInput = usePlcStore((s) => s.setInput);

  const content = (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ide-text-faint)]">
          Inputs
        </h3>
        <div className="grid grid-cols-6 gap-1 sm:grid-cols-9 lg:grid-cols-12">
          {ADDRESS_RANGE.map((n) => (
            <button
              key={n}
              disabled={!isSimulating}
              onClick={() => setInput(n, !inputs[n])}
              title={`I${n}`}
              className={cn(
                'flex h-7 items-center justify-center rounded border text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                inputs[n]
                  ? 'border-transparent bg-[var(--ide-run)] text-black'
                  : 'border-[var(--ide-border-soft)] bg-[var(--ide-panel-alt)] text-[var(--ide-text-dim)] hover:bg-white/5'
              )}
            >
              I{n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ide-text-faint)]">
          Outputs
        </h3>
        <div className="grid grid-cols-6 gap-1 sm:grid-cols-9 lg:grid-cols-12">
          {ADDRESS_RANGE.map((n) => (
            <div
              key={n}
              title={`O${n}`}
              className={cn(
                'flex h-7 items-center justify-center rounded border text-[10px] font-semibold',
                outputs[n]
                  ? 'border-transparent bg-[var(--ide-run)] text-black'
                  : 'border-[var(--ide-border-soft)] bg-[var(--ide-panel-alt)] text-[var(--ide-text-faint)]'
              )}
            >
              O{n}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (bare) return content;

  return <div className="glass flex flex-col gap-3 rounded-2xl p-3 md:w-56 md:shrink-0">{content}</div>;
}
