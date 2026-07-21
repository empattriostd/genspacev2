import { useEffect, useState } from 'react';
import { Zap, ShieldAlert, Info } from 'lucide-react';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
import { usePlcStore } from '@/stores/plcStore';
import { findElement, findElementRungId } from '../utils/findElement';
import type { LadderElement } from '@/simulator/types/ladder';
import type { AddressType } from '@/simulator/types/address';
import { cn } from '@/utils/cn';

/** Same address-type rules as PropertyDialog — kept in one small local copy
 * rather than importing a UI-owned helper across files, since the two
 * editors intentionally show the same allowed set. */
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

function kindLabel(element: LadderElement): string {
  switch (element.kind) {
    case 'CONTACT':
      return element.mode === 'NC'
        ? 'NC Contact'
        : element.mode === 'RISING_EDGE'
          ? 'Rising Edge Contact'
          : element.mode === 'FALLING_EDGE'
            ? 'Falling Edge Contact'
            : 'NO Contact';
    case 'COIL':
      return element.coilMode === 'SET' ? 'SET Coil' : element.coilMode === 'RESET' ? 'RESET Coil' : 'Output Coil';
    case 'TIMER':
      return `Timer (${element.timerType})`;
    case 'COUNTER':
      return `Counter (${element.counterType})`;
    case 'WIRE':
      return 'Wire';
    case 'COMMENT':
      return 'Comment';
    case 'BRANCH_START':
    case 'BRANCH_END':
      return 'Branch Marker';
    default:
      return 'Element';
  }
}

function currentValueFor(element: LadderElement, plc: ReturnType<typeof usePlcStore.getState>): string | null {
  if (!('address' in element) || !element.address) return null;
  const { type, number } = element.address;
  switch (type) {
    case 'I':
      return plc.state.inputs[number] ? 'ON (1)' : 'OFF (0)';
    case 'O':
      return plc.state.outputs[number] ? 'ON (1)' : 'OFF (0)';
    case 'M':
      return plc.state.memory[number] ? 'ON (1)' : 'OFF (0)';
    case 'TIM': {
      const t = plc.state.timers[number];
      return t ? `${Math.round(t.accumulatedMs)} / ${t.presetMs} ms · DN=${t.done ? 1 : 0}` : '—';
    }
    case 'CTU': {
      const c = plc.state.counters[number];
      return c ? `${c.accumulatedCount} / ${c.presetCount} · DN=${c.done ? 1 : 0}` : '—';
    }
    default:
      return null;
  }
}

function isForced(element: LadderElement, forced: { inputs: number[]; outputs: number[]; memory: number[] }): boolean {
  if (!('address' in element) || !element.address) return false;
  const { type, number } = element.address;
  if (type === 'I') return forced.inputs.includes(number);
  if (type === 'O') return forced.outputs.includes(number);
  if (type === 'M') return forced.memory.includes(number);
  return false;
}

/**
 * Phase 6.0 — the always-on right-dock Properties Panel (CX-Programmer /
 * TIA Portal style), replacing "select something and hope you remember
 * what it is" with a permanent readout. Selecting an element (single
 * click, `selection` in useLadderEditorStore) drives this panel; nothing
 * about selection *behavior* changes — this only reads it.
 *
 * Editing here calls the same `updateElement` action the existing
 * double-click PropertyDialog already used (Phase 5, untouched), so both
 * entry points stay in sync. Preset (timer/counter) is shown read-only:
 * the editor's `updateElementProperties` operation (simulator/editor,
 * explicitly not to be modified this phase) only accepts
 * address/comment/alias, so wiring a Preset editor here would mean
 * touching engine-adjacent code outside this phase's scope.
 */
export function PropertiesPanel({ className }: { className?: string }) {
  const document = useLadderEditorStore((s) => s.document);
  const selection = useLadderEditorStore((s) => s.selection);
  const updateElement = useLadderEditorStore((s) => s.updateElement);

  const plcState = usePlcStore((s) => s.state);
  const poweredElements = usePlcStore((s) => s.poweredElements);
  const isRunning = usePlcStore((s) => s.isRunning);
  const forceBit = usePlcStore((s) => s.forceBit);
  const releaseForce = usePlcStore((s) => s.releaseForce);
  const getForcedAddresses = usePlcStore((s) => s.getForcedAddresses);

  const element = selection ? findElement(document, selection.elementId) : null;
  const rungId = selection ? findElementRungId(document, selection.elementId) : null;

  const [comment, setComment] = useState('');
  const [alias, setAlias] = useState('');

  useEffect(() => {
    setComment(element?.comment ?? '');
    setAlias(element?.alias ?? '');
  }, [element?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!element || !rungId) {
    return (
      <aside
        className={cn(
          'flex w-72 shrink-0 flex-col border-l border-[var(--ide-border)] bg-[var(--ide-panel)]',
          className
        )}
      >
        <PanelHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <Info size={20} className="text-[var(--ide-text-faint)]" />
          <p className="text-xs text-[var(--ide-text-dim)]">
            Select a contact, coil, timer, or counter on the ladder to inspect and edit its properties.
          </p>
        </div>
      </aside>
    );
  }

  const hasAddress = 'address' in element && !!element.address;
  const allowedTypes = allowedTypesFor(element);
  const addressLocked = element.kind === 'TIMER' || element.kind === 'COUNTER';
  const forcedNow = isForced(element, getForcedAddresses());
  const powered = poweredElements[element.id];

  function commitComment() {
    updateElement(rungId!, element!.id, { comment });
  }
  function commitAlias() {
    updateElement(rungId!, element!.id, { alias });
  }
  function setAddressType(type: AddressType) {
    if (!hasAddress) return;
    const el = element as Extract<LadderElement, { address: import('@/simulator/types/address').Address }>;
    updateElement(rungId!, element!.id, { address: { type, number: el.address.number } });
  }
  function setAddressNumber(number: number) {
    if (!hasAddress) return;
    const el = element as Extract<LadderElement, { address: import('@/simulator/types/address').Address }>;
    updateElement(rungId!, element!.id, { address: { type: el.address.type, number } });
  }

  return (
    <aside
      className={cn(
        'flex w-72 shrink-0 flex-col border-l border-[var(--ide-border)] bg-[var(--ide-panel)]',
        className
      )}
    >
      <PanelHeader />

      <div className="plc-scroll flex-1 overflow-y-auto px-3 py-3">
        <Field label="Type">
          <div className="rounded-md border border-[var(--ide-border-soft)] bg-[var(--ide-panel-alt)] px-2.5 py-1.5 text-sm font-medium text-[var(--ide-text)]">
            {kindLabel(element)}
          </div>
        </Field>

        {hasAddress && (
          <Field label="Address">
            <div className="flex gap-1.5">
              <select
                value={(element as { address: { type: AddressType } }).address.type}
                disabled={addressLocked}
                onChange={(e) => setAddressType(e.target.value as AddressType)}
                className="h-8 flex-1 rounded-md border border-[var(--ide-border-soft)] bg-[var(--ide-panel-alt)] px-2 text-xs text-[var(--ide-text)] disabled:opacity-50"
              >
                {allowedTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={26}
                value={(element as { address: { number: number } }).address.number}
                onChange={(e) => setAddressNumber(Math.min(26, Math.max(1, Number(e.target.value) || 1)))}
                className="h-8 w-16 rounded-md border border-[var(--ide-border-soft)] bg-[var(--ide-panel-alt)] px-2 text-xs text-[var(--ide-text)]"
              />
            </div>
            {addressLocked && (
              <p className="mt-1 text-[10px] text-[var(--ide-text-faint)]">
                Locked to {element.kind === 'TIMER' ? 'TIM' : 'CTU'} namespace — only the number can change.
              </p>
            )}
          </Field>
        )}

        <Field label="Comment">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={commitComment}
            placeholder="e.g. Start button"
            className="h-8 w-full rounded-md border border-[var(--ide-border-soft)] bg-[var(--ide-panel-alt)] px-2.5 text-xs text-[var(--ide-text)] placeholder:text-[var(--ide-text-faint)]"
          />
        </Field>

        <Field label="Description (alias)">
          <input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            onBlur={commitAlias}
            placeholder="e.g. START_BTN"
            className="h-8 w-full rounded-md border border-[var(--ide-border-soft)] bg-[var(--ide-panel-alt)] px-2.5 text-xs text-[var(--ide-text)] placeholder:text-[var(--ide-text-faint)]"
          />
        </Field>

        {hasAddress && (
          <Field label="Current Value">
            <div className="rounded-md border border-[var(--ide-border-soft)] bg-[var(--ide-panel-alt)] px-2.5 py-1.5 font-mono text-xs text-[var(--ide-run)]">
              {currentValueFor(element, { state: plcState } as ReturnType<typeof usePlcStore.getState>) ?? '—'}
            </div>
          </Field>
        )}

        {(element.kind === 'TIMER' || element.kind === 'COUNTER') && (
          <Field label="Preset">
            <div className="rounded-md border border-[var(--ide-border-soft)] bg-[var(--ide-panel-alt)] px-2.5 py-1.5 font-mono text-xs text-[var(--ide-text-dim)]">
              {element.kind === 'TIMER' ? `${element.presetMs} ms` : `${element.presetCount} counts`}
            </div>
          </Field>
        )}

        <Field label="Status">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={cn(
                'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                isRunning
                  ? powered
                    ? 'bg-[var(--ide-run)]/20 text-[var(--ide-run)]'
                    : 'bg-white/5 text-[var(--ide-text-faint)]'
                  : 'bg-white/5 text-[var(--ide-text-faint)]'
              )}
            >
              {isRunning ? (powered ? 'Powered' : 'Not Powered') : 'Program Mode'}
            </span>
            {forcedNow && (
              <span className="flex items-center gap-1 rounded bg-[var(--ide-warn)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ide-warn)]">
                <ShieldAlert size={10} /> Forced
              </span>
            )}
          </div>
        </Field>

        {hasAddress && isRunning && (
          <Field label="Force">
            <div className="flex gap-1.5">
              <button
                onClick={() =>
                  forceBit(
                    (element as { address: { type: 'I' | 'O' | 'M'; number: number } }).address.type,
                    (element as { address: { number: number } }).address.number,
                    true
                  )
                }
                className="flex flex-1 items-center justify-center gap-1 rounded-md border border-[var(--ide-run)]/30 bg-[var(--ide-run)]/10 py-1.5 text-[11px] font-medium text-[var(--ide-run)] transition-colors hover:bg-[var(--ide-run)]/20"
              >
                <Zap size={11} /> Force ON
              </button>
              <button
                onClick={() =>
                  forceBit(
                    (element as { address: { type: 'I' | 'O' | 'M'; number: number } }).address.type,
                    (element as { address: { number: number } }).address.number,
                    false
                  )
                }
                className="flex-1 rounded-md border border-[var(--ide-stop)]/30 bg-[var(--ide-stop)]/10 py-1.5 text-[11px] font-medium text-[var(--ide-stop)] transition-colors hover:bg-[var(--ide-stop)]/20"
              >
                Force OFF
              </button>
            </div>
            {forcedNow && (
              <button
                onClick={() =>
                  releaseForce(
                    (element as { address: { type: 'I' | 'O' | 'M'; number: number } }).address.type,
                    (element as { address: { number: number } }).address.number
                  )
                }
                className="mt-1.5 w-full rounded-md border border-[var(--ide-border-soft)] py-1 text-[10px] text-[var(--ide-text-dim)] hover:bg-white/5"
              >
                Release Force
              </button>
            )}
          </Field>
        )}
      </div>
    </aside>
  );
}

function PanelHeader() {
  return (
    <div className="plc-panel-texture flex h-9 shrink-0 items-center border-b border-[var(--ide-border)] px-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ide-text-dim)]">
        Properties
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--ide-text-faint)]">
        {label}
      </label>
      {children}
    </div>
  );
}
