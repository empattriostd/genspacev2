import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Address, AddressType } from '@/simulator/types/address';
import type { PlacementSpec } from '@/simulator/editor/gridTypes';
import { useGridEditorStore } from '@/stores/gridEditorStore';

interface PaletteItem {
  label: string;
  specFactory: (address: Address) => PlacementSpec;
  glyph: string;
  needsAddress: boolean;
}

interface PaletteGroup {
  title: string;
  items: PaletteItem[];
}

const PALETTE_GROUPS: PaletteGroup[] = [
  {
    title: 'Contacts',
    items: [
      { label: 'NO', glyph: '⊣ ⊢', needsAddress: true, specFactory: (a) => ({ kind: 'CONTACT', mode: 'NO', address: a }) },
      { label: 'NC', glyph: '⊣╱⊢', needsAddress: true, specFactory: (a) => ({ kind: 'CONTACT', mode: 'NC', address: a }) },
      { label: 'Rising', glyph: '↑', needsAddress: true, specFactory: (a) => ({ kind: 'CONTACT', mode: 'RISING_EDGE', address: a }) },
      { label: 'Falling', glyph: '↓', needsAddress: true, specFactory: (a) => ({ kind: 'CONTACT', mode: 'FALLING_EDGE', address: a }) },
    ],
  },
  {
    title: 'Coils',
    items: [
      { label: 'Coil', glyph: '( )', needsAddress: true, specFactory: (a) => ({ kind: 'COIL', address: a, coilMode: 'NORMAL' }) },
      { label: 'SET', glyph: '(S)', needsAddress: true, specFactory: (a) => ({ kind: 'COIL', address: a, coilMode: 'SET' }) },
      { label: 'RESET', glyph: '(R)', needsAddress: true, specFactory: (a) => ({ kind: 'COIL', address: a, coilMode: 'RESET' }) },
      { label: 'Memory', glyph: '(M)', needsAddress: true, specFactory: (a) => ({ kind: 'COIL', address: a, coilMode: 'NORMAL' }) },
    ],
  },
  {
    title: 'Timers',
    items: [
      { label: 'TON', glyph: '[TON]', needsAddress: true, specFactory: (a) => ({ kind: 'TIMER', address: a, presetMs: 2000, timerType: 'TON' }) },
      { label: 'TOF', glyph: '[TOF]', needsAddress: true, specFactory: (a) => ({ kind: 'TIMER', address: a, presetMs: 2000, timerType: 'TOF' }) },
      { label: 'TP', glyph: '[TP]', needsAddress: true, specFactory: (a) => ({ kind: 'TIMER', address: a, presetMs: 2000, timerType: 'TP' }) },
    ],
  },
  {
    title: 'Counters',
    items: [
      { label: 'CTU', glyph: '[CTU]', needsAddress: true, specFactory: (a) => ({ kind: 'COUNTER', address: a, presetCount: 3, counterType: 'CTU' }) },
      { label: 'CTD', glyph: '[CTD]', needsAddress: true, specFactory: (a) => ({ kind: 'COUNTER', address: a, presetCount: 3, counterType: 'CTD' }) },
    ],
  },
  {
    title: 'Instructions',
    items: [
      { label: 'MOV', glyph: 'MOV', needsAddress: true, specFactory: (a) => ({ kind: 'COIL', address: a, coilMode: 'NORMAL', instruction: { op: 'MOV', src: 1, dest: 2 } }) },
      { label: 'CMP', glyph: 'CMP', needsAddress: true, specFactory: (a) => ({ kind: 'COIL', address: a, coilMode: 'NORMAL', instruction: { op: 'CMP', a: 1, b: 2, comparator: 'EQ', resultAddress: a } }) },
      { label: 'ADD', glyph: 'ADD', needsAddress: true, specFactory: (a) => ({ kind: 'COIL', address: a, coilMode: 'NORMAL', instruction: { op: 'ADD', a: 1, b: 2, dest: 3 } }) },
      { label: 'SUB', glyph: 'SUB', needsAddress: true, specFactory: (a) => ({ kind: 'COIL', address: a, coilMode: 'NORMAL', instruction: { op: 'SUB', a: 1, b: 2, dest: 3 } }) },
    ],
  },
  {
    title: 'Other',
    items: [
      { label: 'Comment', glyph: '▭', needsAddress: false, specFactory: () => ({ kind: 'COMMENT', text: 'Comment' }) },
    ],
  },
];

function CollapsibleGroup({ group }: { group: PaletteGroup }) {
  const [open, setOpen] = useState(true);
  const armInsert = useGridEditorStore((s) => s.armInsert);
  const document = useGridEditorStore((s) => s.document);
  const armedSpec = useGridEditorStore((s) => s.armedSpec);

  function nextAddress(type: AddressType): number {
    const used = new Set<number>();
    for (const rungId of document.rungOrder) {
      for (const id of document.rungs[rungId].elementOrder) {
        const el = document.rungs[rungId].elements[id];
        if (el.address?.type === type) used.add(el.address.number);
      }
    }
    for (let n = 1; n <= 26; n++) if (!used.has(n)) return n;
    return 26;
  }

  function handlePick(item: PaletteItem) {
    if (item.needsAddress) {
      const type = inferAddressType(item);
      const address = { type, number: nextAddress(type) };
      armInsert(item.specFactory(address));
    } else {
      armInsert(item.specFactory({ type: 'I', number: 1 }));
    }
  }

  function inferAddressType(item: PaletteItem): AddressType {
    if (item.label === 'Memory') return 'M';
    if (item.label === 'Coil' || item.label === 'SET' || item.label === 'RESET') return 'O';
    if (item.label === 'TON' || item.label === 'TOF' || item.label === 'TP') return 'TIM';
    if (item.label === 'CTU' || item.label === 'CTD') return 'CTU';
    if (item.label.startsWith('MOV') || item.label.startsWith('CMP') || item.label.startsWith('ADD') || item.label.startsWith('SUB')) return 'O';
    return 'I';
  }

  return (
    <div className="border-b border-border/40 dark:border-border-dark/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/30 dark:hover:bg-white/5"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {group.title}
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-0.5 px-1 pb-1.5">
          {group.items.map((item) => {
            const isArmed = armedSpec !== null && armedSpec.kind === item.specFactory({ type: 'I', number: 0 }).kind;
            return (
              <button
                key={item.label}
                onClick={() => handlePick(item)}
                className={`flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted/40 dark:hover:bg-white/5 ${
                  isArmed ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''
                }`}
                title={`Click to arm, then click a cell on the canvas to place ${item.label}`}
              >
                <span className="w-12 text-center font-mono text-[11px] text-muted-foreground">{item.glyph}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Desktop toolbox — grouped component palette. Click a tool to arm it (Insert
 * Mode), then click a cell on the canvas to place. No drag-and-drop.
 */
export function ComponentPalette() {
  return (
    <div className="glass flex w-48 shrink-0 flex-col overflow-y-auto rounded-2xl p-1">
      <div className="px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Toolbox
      </div>
      {PALETTE_GROUPS.map((g) => (
        <CollapsibleGroup key={g.title} group={g} />
      ))}
      <div className="px-2 py-2 text-[10px] text-muted-foreground">
        Click a tool, then click a cell to place.
      </div>
    </div>
  );
}

// Re-export for mobile sheet
export type { PaletteItem, PaletteGroup };
export { PALETTE_GROUPS };
