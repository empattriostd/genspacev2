import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Address, AddressType } from '@/simulator/types/address';
import type { NewComponentSpec } from '@/simulator/editor/componentSpec';
import { cn } from '@/utils/cn';

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
      { label: 'NO Contact', dragKind: 'CONTACT_NO', glyph: '┤├' },
      { label: 'NC Contact', dragKind: 'CONTACT_NC', glyph: '┤/├' },
      { label: 'Rising Edge', dragKind: 'CONTACT_RISING', glyph: '┤P├' },
      { label: 'Falling Edge', dragKind: 'CONTACT_FALLING', glyph: '┤N├' },
    ],
  },
  {
    title: 'Coils',
    items: [
      { label: 'Output Coil', dragKind: 'COIL_O', glyph: '( )' },
      { label: 'SET Coil', dragKind: 'COIL_O_SET', glyph: '(S)' },
      { label: 'RESET Coil', dragKind: 'COIL_O_RESET', glyph: '(R)' },
    ],
  },
  {
    title: 'Timers',
    items: [
      { label: 'Timer TON', dragKind: 'TIMER_TON', glyph: 'TON' },
      { label: 'Timer TOF', dragKind: 'TIMER_TOF', glyph: 'TOF' },
      { label: 'Timer TP', dragKind: 'TIMER_TP', glyph: 'TP' },
    ],
  },
  {
    title: 'Counters',
    items: [
      { label: 'Counter CTU', dragKind: 'COUNTER_CTU', glyph: 'CTU' },
      { label: 'Counter CTD', dragKind: 'COUNTER_CTD', glyph: 'CTD' },
    ],
  },
  {
    title: 'Memory',
    items: [
      { label: 'Memory Coil', dragKind: 'COIL_M', glyph: '(M)' },
      { label: 'Memory Contact', dragKind: 'CONTACT_M', glyph: '┤M├' },
    ],
  },
  {
    title: 'Instructions',
    items: [{ label: 'Wire', dragKind: 'WIRE', glyph: '──' }],
  },
  {
    title: 'Comments',
    items: [{ label: 'Comment', dragKind: 'COMMENT', glyph: '▭' }],
  },
];

export const DRAG_MIME = 'application/x-genspace-component';

export function ComponentPalette({ className }: { className?: string }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <aside
      className={cn(
        'plc-scroll flex w-56 shrink-0 flex-col overflow-y-auto border-r border-[var(--ide-border)] bg-[var(--ide-panel)]',
        className
      )}
    >
      <div className="plc-panel-texture flex h-9 shrink-0 items-center border-b border-[var(--ide-border)] px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ide-text-dim)]">
          Toolbox
        </span>
      </div>

      <div className="px-1.5 py-2">
        {PALETTE_GROUPS.map((group) => {
          const isCollapsed = collapsed[group.title];
          return (
            <div key={group.title} className="mb-1">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [group.title]: !c[group.title] }))}
                className="flex w-full items-center justify-between rounded px-1.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ide-text-faint)] hover:text-[var(--ide-text-dim)]"
              >
                {group.title}
                <ChevronDown size={12} className={cn('transition-transform', isCollapsed && '-rotate-90')} />
              </button>

              {!isCollapsed && (
                <div className="grid grid-cols-2 gap-1 px-0.5 pb-1.5 pt-0.5">
                  {group.items.map((item) => (
                    <div
                      key={item.dragKind}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DRAG_MIME, item.dragKind);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      title={`Drag onto the canvas to add ${item.label}`}
                      className="flex cursor-grab select-none flex-col items-center gap-1 rounded-md border border-[var(--ide-border-soft)] bg-[var(--ide-panel-alt)] px-1.5 py-2 text-center transition-colors hover:border-[var(--ide-accent)]/50 hover:bg-white/5 active:cursor-grabbing"
                    >
                      <span className="font-mono text-[13px] leading-none text-[var(--ide-text)]">
                        {item.glyph}
                      </span>
                      <span className="text-[9.5px] leading-tight text-[var(--ide-text-dim)]">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

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
    case 'WIRE':
      return { kind: 'WIRE', at };
    case 'COMMENT':
      return { kind: 'COMMENT', text: 'Comment', at };
    default:
      return null;
  }
}

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
