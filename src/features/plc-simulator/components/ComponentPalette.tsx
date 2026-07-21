import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Address, AddressType } from '@/simulator/types/address';
import type { NewComponentSpec } from '@/simulator/editor/componentSpec';

export const DRAG_MIME = 'application/x-genspace-component';

interface PaletteItem {
  label: string;
  dragKind: string;
  glyph: string;
}

interface PaletteGroup {
  title: string;
  items: PaletteItem[];
}

const PALETTE_GROUPS: PaletteGroup[] = [
  {
    title: 'Contacts',
    items: [
      { label: 'NO', dragKind: 'CONTACT_NO', glyph: '⊣ ⊢' },
      { label: 'NC', dragKind: 'CONTACT_NC', glyph: '⊣╱⊢' },
      { label: 'Rising Edge', dragKind: 'CONTACT_RISING', glyph: '↑' },
      { label: 'Falling Edge', dragKind: 'CONTACT_FALLING', glyph: '↓' },
    ],
  },
  {
    title: 'Coils',
    items: [
      { label: 'Coil', dragKind: 'COIL_O', glyph: '( )' },
      { label: 'SET', dragKind: 'COIL_O_SET', glyph: '(S)' },
      { label: 'RESET', dragKind: 'COIL_O_RESET', glyph: '(R)' },
      { label: 'Memory Coil', dragKind: 'COIL_M', glyph: '(M)' },
    ],
  },
  {
    title: 'Timers',
    items: [
      { label: 'TON', dragKind: 'TIMER_TON', glyph: '[TON]' },
      { label: 'TOF', dragKind: 'TIMER_TOF', glyph: '[TOF]' },
      { label: 'TP', dragKind: 'TIMER_TP', glyph: '[TP]' },
    ],
  },
  {
    title: 'Counters',
    items: [
      { label: 'CTU', dragKind: 'COUNTER_CTU', glyph: '[CTU]' },
      { label: 'CTD', dragKind: 'COUNTER_CTD', glyph: '[CTD]' },
    ],
  },
  {
    title: 'Instructions',
    items: [
      { label: 'MOV', dragKind: 'INSTR_MOV', glyph: 'MOV' },
      { label: 'CMP', dragKind: 'INSTR_CMP', glyph: 'CMP' },
      { label: 'ADD', dragKind: 'INSTR_ADD', glyph: 'ADD' },
      { label: 'SUB', dragKind: 'INSTR_SUB', glyph: 'SUB' },
      { label: 'MUL', dragKind: 'INSTR_MUL', glyph: 'MUL' },
      { label: 'DIV', dragKind: 'INSTR_DIV', glyph: 'DIV' },
    ],
  },
  {
    title: 'Other',
    items: [
      { label: 'Memory Contact', dragKind: 'CONTACT_M', glyph: '⊣M⊢' },
      { label: 'Wire', dragKind: 'WIRE', glyph: '──' },
      { label: 'Comment', dragKind: 'COMMENT', glyph: '▭' },
    ],
  },
];

function CollapsibleGroup({ group }: { group: PaletteGroup }) {
  const [open, setOpen] = useState(true);
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
          {group.items.map((item) => (
            <div
              key={item.dragKind}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_MIME, item.dragKind);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="flex cursor-grab select-none items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted/40 active:cursor-grabbing dark:hover:bg-white/5"
              title={`Drag onto the canvas to add ${item.label}`}
            >
              <span className="w-12 text-center font-mono text-[11px] text-muted-foreground">{item.glyph}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComponentPalette() {
  return (
    <div className="glass flex w-48 shrink-0 flex-col overflow-y-auto rounded-2xl p-1">
      <div className="px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Toolbox
      </div>
      {PALETTE_GROUPS.map((g) => (
        <CollapsibleGroup key={g.title} group={g} />
      ))}
    </div>
  );
}

/** Maps a palette drag-kind back into a full NewComponentSpec once we know
 * the drop position and which address number to allocate. */
export function specForDragKind(
  dragKind: string,
  address: Address | undefined,
  at: { gridX: number; gridY: number }
): NewComponentSpec | null {
  switch (dragKind) {
    case 'CONTACT_NO':
      return address ? { kind: 'CONTACT', mode: 'NO', address, at } : null;
    case 'CONTACT_NC':
      return address ? { kind: 'CONTACT', mode: 'NC', address, at } : null;
    case 'CONTACT_RISING':
      return address ? { kind: 'CONTACT', mode: 'RISING_EDGE', address, at } : null;
    case 'CONTACT_FALLING':
      return address ? { kind: 'CONTACT', mode: 'FALLING_EDGE', address, at } : null;
    case 'CONTACT_M':
      return address ? { kind: 'CONTACT', mode: 'NO', address, at } : null;
    case 'COIL_O':
    case 'COIL_M':
      return address ? { kind: 'COIL', address, at, coilMode: 'NORMAL' } : null;
    case 'COIL_O_SET':
      return address ? { kind: 'COIL', address, at, coilMode: 'SET' } : null;
    case 'COIL_O_RESET':
      return address ? { kind: 'COIL', address, at, coilMode: 'RESET' } : null;
    case 'TIMER_TON':
      return address ? { kind: 'TIMER', address, presetMs: 2000, at, timerType: 'TON' } : null;
    case 'TIMER_TOF':
      return address ? { kind: 'TIMER', address, presetMs: 2000, at, timerType: 'TOF' } : null;
    case 'TIMER_TP':
      return address ? { kind: 'TIMER', address, presetMs: 2000, at, timerType: 'TP' } : null;
    case 'COUNTER_CTU':
      return address ? { kind: 'COUNTER', address, presetCount: 3, at, counterType: 'CTU' } : null;
    case 'COUNTER_CTD':
      return address ? { kind: 'COUNTER', address, presetCount: 3, at, counterType: 'CTD' } : null;
    case 'INSTR_MOV':
      return address ? { kind: 'COIL', address, at, coilMode: 'NORMAL', instruction: { op: 'MOV', src: 1, dest: 2 } } : null;
    case 'INSTR_CMP':
      return address ? { kind: 'COIL', address, at, coilMode: 'NORMAL', instruction: { op: 'CMP', a: 1, b: 2, comparator: 'EQ', resultAddress: address } } : null;
    case 'INSTR_ADD':
      return address ? { kind: 'COIL', address, at, coilMode: 'NORMAL', instruction: { op: 'ADD', a: 1, b: 2, dest: 3 } } : null;
    case 'INSTR_SUB':
      return address ? { kind: 'COIL', address, at, coilMode: 'NORMAL', instruction: { op: 'SUB', a: 1, b: 2, dest: 3 } } : null;
    case 'INSTR_MUL':
      return address ? { kind: 'COIL', address, at, coilMode: 'NORMAL', instruction: { op: 'MUL', a: 1, b: 2, dest: 3 } } : null;
    case 'INSTR_DIV':
      return address ? { kind: 'COIL', address, at, coilMode: 'NORMAL', instruction: { op: 'DIV', a: 1, b: 2, dest: 3 } } : null;
    case 'WIRE':
      return { kind: 'WIRE', at };
    case 'COMMENT':
      return { kind: 'COMMENT', text: 'Comment', at };
    default:
      return null;
  }
}

/** Which AddressType a given drag-kind should allocate a number from. */
export function addressTypeForDragKind(dragKind: string): AddressType | null {
  switch (dragKind) {
    case 'CONTACT_NO':
    case 'CONTACT_NC':
    case 'CONTACT_RISING':
    case 'CONTACT_FALLING':
      return 'I';
    case 'CONTACT_M':
    case 'COIL_M':
      return 'M';
    case 'COIL_O':
    case 'COIL_O_SET':
    case 'COIL_O_RESET':
    case 'INSTR_MOV':
    case 'INSTR_CMP':
    case 'INSTR_ADD':
    case 'INSTR_SUB':
    case 'INSTR_MUL':
    case 'INSTR_DIV':
      return 'O';
    case 'TIMER_TON':
    case 'TIMER_TOF':
    case 'TIMER_TP':
      return 'TIM';
    case 'COUNTER_CTU':
    case 'COUNTER_CTD':
      return 'CTU';
    default:
      return null;
  }
}
