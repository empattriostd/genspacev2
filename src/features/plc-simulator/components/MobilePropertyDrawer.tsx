import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { usePlcStore } from '@/stores/plcStore';
import { useGridEditorStore } from '@/stores/gridEditorStore';
import type { GridElement } from '@/simulator/editor/gridTypes';
import type { AddressType } from '@/simulator/types/address';

interface MobilePropertyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isSimulating: boolean;
}

/**
 * Mobile slide-in drawer for element properties — uses the grid store.
 */
export function MobilePropertyDrawer({ isOpen, onClose, isSimulating }: MobilePropertyDrawerProps) {
  const selectedRungId = useGridEditorStore((s) => s.selectedRungId);
  const selectedElementId = useGridEditorStore((s) => s.selectedElementId);
  const document = useGridEditorStore((s) => s.document);
  const updateElement = useGridEditorStore((s) => s.updateElement);
  const deleteElement = useGridEditorStore((s) => s.deleteElement);
  const plcState = usePlcStore((s) => s.state);

  return (
    <AnimatePresence>
      {isOpen && selectedRungId && selectedElementId && (
        (() => {
          const el = document.rungs[selectedRungId]?.elements[selectedElementId];
          if (!el) return null;
          const hasAddress = !!el.address;
          const allowedTypes = allowedTypesFor(el);
          const addressLocked = el.kind === 'TIMER' || el.kind === 'COUNTER';

          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-40 bg-black/40"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-white shadow-2xl dark:bg-gray-900"
              >
                <div className="flex flex-col gap-4 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Properties</h3>
                    <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted/40">
                      <X size={18} />
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
                            updateElement(selectedRungId, selectedElementId, {
                              address: { type: newType, number: el.address!.number },
                            });
                          }}
                          className="h-9 rounded-lg border border-border bg-transparent px-2 text-sm disabled:opacity-50 dark:border-border-dark"
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
                            updateElement(selectedRungId, selectedElementId, {
                              address: { type: el.address!.type, number: Math.min(26, Math.max(1, Number(e.target.value) || 1)) },
                            })
                          }
                          className="h-9 w-20 rounded-lg border border-border bg-transparent px-2 text-sm dark:border-border-dark"
                        />
                      </div>
                    </Field>
                  )}

                  <Field label="Comment">
                    <input
                      value={el.comment ?? ''}
                      onChange={(e) => updateElement(selectedRungId, selectedElementId, { comment: e.target.value })}
                      placeholder="e.g. Start button"
                      className="h-9 w-full rounded-lg border border-border bg-transparent px-2 text-sm dark:border-border-dark"
                    />
                  </Field>

                  <Field label="Alias">
                    <input
                      value={el.alias ?? ''}
                      onChange={(e) => updateElement(selectedRungId, selectedElementId, { alias: e.target.value })}
                      placeholder="e.g. START_BTN"
                      className="h-9 w-full rounded-lg border border-border bg-transparent px-2 text-sm dark:border-border-dark"
                    />
                  </Field>

                  {el.kind === 'TIMER' && (
                    <Field label="Preset (ms)">
                      <input
                        type="number"
                        min={100}
                        step={100}
                        value={el.presetMs ?? 2000}
                        onChange={(e) => updateElement(selectedRungId, selectedElementId, { presetMs: Math.max(100, Number(e.target.value) || 100) })}
                        className="h-9 w-full rounded-lg border border-border bg-transparent px-2 text-sm dark:border-border-dark"
                      />
                    </Field>
                  )}

                  {el.kind === 'COUNTER' && (
                    <Field label="Preset Count">
                      <input
                        type="number"
                        min={1}
                        value={el.presetCount ?? 3}
                        onChange={(e) => updateElement(selectedRungId, selectedElementId, { presetCount: Math.max(1, Number(e.target.value) || 1) })}
                        className="h-9 w-full rounded-lg border border-border bg-transparent px-2 text-sm dark:border-border-dark"
                      />
                    </Field>
                  )}

                  {isSimulating && hasAddress && <LiveValue element={el} plcState={plcState} />}

                  {el.kind === 'COIL' && el.instruction && (
                    <Field label="Instruction">
                      <span className="font-mono text-sm">{el.instruction.op}</span>
                    </Field>
                  )}

                  <button
                    onClick={() => {
                      deleteElement(selectedRungId, selectedElementId);
                      onClose();
                    }}
                    className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-sm font-medium text-red-600 dark:text-red-400"
                  >
                    <Trash2 size={16} /> Delete Element
                  </button>
                </div>
              </motion.div>
            </>
          );
        })()
      )}
    </AnimatePresence>
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

function typeLabel(el: GridElement): string {
  switch (el.kind) {
    case 'CONTACT': return `Contact ${el.mode ?? 'NO'}`;
    case 'COIL': return `Coil${el.coilMode ? ` (${el.coilMode})` : ''}`;
    case 'TIMER': return `Timer ${el.timerType ?? 'TON'}`;
    case 'COUNTER': return `Counter ${el.counterType ?? 'CTU'}`;
    case 'COMMENT': return 'Comment';
    default: return 'Unknown';
  }
}

function allowedTypesFor(element: GridElement): AddressType[] {
  switch (element.kind) {
    case 'CONTACT': return ['I', 'O', 'M', 'TIM', 'CTU'];
    case 'COIL': return ['O', 'M'];
    case 'TIMER': return ['TIM'];
    case 'COUNTER': return ['CTU'];
    default: return [];
  }
}

function LiveValue({ element, plcState }: { element: GridElement; plcState: ReturnType<typeof usePlcStore.getState>['state'] }) {
  if (!element.address) return null;
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
