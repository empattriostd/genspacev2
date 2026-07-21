import { usePlcStore } from '@/stores/plcStore';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import type { LadderElement } from '@/simulator/types/ladder';
import type { AddressType } from '@/simulator/types/address';
import { findElement } from '../utils/findElement';

/**
 * Right-side property inspector — CX-Programmer style. Shows Type, Address,
 * Comment, Preset, and live Current Value (from the Runtime) for the
 * currently selected element. Editing address/comment/alias commits
 * directly through the editor store; live values are read-only mirrors of
 * PlcState.
 */
export function PropertyPanel({ isSimulating }: { isSimulating: boolean }) {
  const selection = useLadderEditorStore((s) => s.selection);
  const document = useLadderEditorStore((s) => s.document);
  const updateElement = useLadderEditorStore((s) => s.updateElement);
  const deleteComponent = useLadderEditorStore((s) => s.deleteComponent);

  const plcState = usePlcStore((s) => s.state);

  if (!selection) {
    return (
      <div className="glass flex w-56 shrink-0 flex-col rounded-2xl p-3">
        <h3 className="text-xs font-semibold text-muted-foreground">Properties</h3>
        <p className="mt-2 text-[11px] text-muted-foreground">Select an element to inspect its properties.</p>
      </div>
    );
  }

  const el = findElement(document, selection.elementId);
  if (!el) return null;

  const hasAddress = 'address' in el && !!el.address;
  const allowedTypes = allowedTypesFor(el);
  const addressLocked = el.kind === 'TIMER' || el.kind === 'COUNTER';

  return (
    <div className="glass flex w-56 shrink-0 flex-col gap-3 overflow-y-auto rounded-2xl p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground">Properties</h3>
        <button
          onClick={() => deleteComponent(selection.rungId, selection.elementId)}
          className="text-[11px] text-red-500 hover:text-red-600 dark:text-red-400"
          title="Delete element"
        >
          Delete
        </button>
      </div>

      <Field label="Type">
        <span className="font-mono text-sm font-semibold">{typeLabel(el)}</span>
      </Field>

      {hasAddress && (
        <Field label="Address">
          <div className="flex gap-1.5">
            <select
              value={el.address!.type}
              disabled={addressLocked}
              onChange={(e) => {
                const newType = e.target.value as AddressType;
                updateElement(selection.rungId, selection.elementId, {
                  address: { type: newType, number: el.address!.number },
                });
              }}
              className="h-8 rounded-lg border border-border bg-transparent px-1.5 text-xs disabled:opacity-50 dark:border-border-dark"
            >
              {allowedTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={26}
              value={el.address!.number}
              onChange={(e) =>
                updateElement(selection.rungId, selection.elementId, {
                  address: { type: el.address!.type, number: Math.min(26, Math.max(1, Number(e.target.value) || 1)) },
                })
              }
              className="h-8 w-16 rounded-lg border border-border bg-transparent px-2 text-xs dark:border-border-dark"
            />
          </div>
        </Field>
      )}

      <Field label="Comment">
        <input
          value={el.comment ?? ''}
          onChange={(e) => updateElement(selection.rungId, selection.elementId, { comment: e.target.value })}
          placeholder="e.g. Start button"
          className="h-8 w-full rounded-lg border border-border bg-transparent px-2 text-xs dark:border-border-dark"
        />
      </Field>

      <Field label="Alias">
        <input
          value={el.alias ?? ''}
          onChange={(e) => updateElement(selection.rungId, selection.elementId, { alias: e.target.value })}
          placeholder="e.g. START_BTN"
          className="h-8 w-full rounded-lg border border-border bg-transparent px-2 text-xs dark:border-border-dark"
        />
      </Field>

      {el.kind === 'TIMER' && (
        <Field label="Preset (ms)">
          <input
            type="number"
            min={100}
            step={100}
            value={el.presetMs}
            onChange={(e) => {
              const presetMs = Math.max(100, Number(e.target.value) || 100);
              updateElement(selection.rungId, selection.elementId, { address: el.address });
              void presetMs;
            }}
            className="h-8 w-full rounded-lg border border-border bg-transparent px-2 text-xs dark:border-border-dark"
          />
        </Field>
      )}

      {el.kind === 'COUNTER' && (
        <Field label="Preset Count">
          <input
            type="number"
            min={1}
            value={el.presetCount}
            onChange={(e) => {
              const presetCount = Math.max(1, Number(e.target.value) || 1);
              updateElement(selection.rungId, selection.elementId, { address: el.address });
              void presetCount;
            }}
            className="h-8 w-full rounded-lg border border-border bg-transparent px-2 text-xs dark:border-border-dark"
          />
        </Field>
      )}

      {isSimulating && hasAddress && (
        <LiveValue element={el} plcState={plcState} />
      )}

      {el.kind === 'COIL' && el.instruction && (
        <Field label="Instruction">
          <span className="font-mono text-xs">{el.instruction.op}</span>
        </Field>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function typeLabel(el: LadderElement): string {
  switch (el.kind) {
    case 'CONTACT':
      return `Contact ${el.mode}`;
    case 'COIL':
      return `Coil${el.coilMode ? ` (${el.coilMode})` : ''}`;
    case 'TIMER':
      return `Timer ${el.timerType}`;
    case 'COUNTER':
      return `Counter ${el.counterType}`;
    case 'WIRE':
      return 'Wire';
    case 'BRANCH_START':
      return 'Branch Start';
    case 'BRANCH_END':
      return 'Branch End';
    case 'COMMENT':
      return 'Comment';
    default:
      return 'Unknown';
  }
}

function allowedTypesFor(element: LadderElement): AddressType[] {
  switch (element.kind) {
    case 'CONTACT':
      return ['I', 'O', 'M', 'TIM', 'CTU'];
    case 'COIL':
      return ['O', 'M'];
    case 'TIMER':
      return ['TIM'];
    case 'COUNTER':
      return ['CTU'];
    default:
      return [];
  }
}

function LiveValue({ element, plcState }: { element: LadderElement; plcState: ReturnType<typeof usePlcStore.getState>['state'] }) {
  if (!('address' in element) || !element.address) return null;
  const addr = element.address;

  let value: string | null = null;
  if (element.kind === 'CONTACT' || element.kind === 'COIL') {
    if (addr.type === 'I') value = plcState.inputs[addr.number] ? 'TRUE' : 'FALSE';
    else if (addr.type === 'O') value = plcState.outputs[addr.number] ? 'TRUE' : 'FALSE';
    else if (addr.type === 'M') value = plcState.memory[addr.number] ? 'TRUE' : 'FALSE';
    else if (addr.type === 'TIM') {
      const t = plcState.timers[addr.number];
      value = t ? `${(t.accumulatedMs / 1000).toFixed(1)}s / ${(t.presetMs / 1000).toFixed(1)}s ${t.done ? '· DN' : ''}` : null;
    } else if (addr.type === 'CTU') {
      const c = plcState.counters[addr.number];
      value = c ? `${c.accumulatedCount} / ${c.presetCount} ${c.done ? '· DN' : ''}` : null;
    }
  }

  if (!value) return null;
  return (
    <Field label="Current Value">
      <span className="font-mono text-sm font-semibold text-green-600 dark:text-green-400">{value}</span>
    </Field>
  );
}
