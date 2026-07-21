import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useGridEditorStore } from '@/stores/gridEditorStore';
import type { Address, AddressType } from '@/simulator/types/address';
import type { PlacementSpec } from '@/simulator/editor/gridTypes';

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
    title: 'Other',
    items: [
      { label: 'Comment', glyph: '▭', needsAddress: false, specFactory: () => ({ kind: 'COMMENT', text: 'Comment' }) },
    ],
  },
];

function inferAddressType(item: PaletteItem): AddressType {
  if (item.label === 'SET' || item.label === 'RESET' || item.label === 'Coil') return 'O';
  if (item.label === 'TON' || item.label === 'TOF' || item.label === 'TP') return 'TIM';
  if (item.label === 'CTU' || item.label === 'CTD') return 'CTU';
  return 'I';
}

interface MobileToolboxSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Mobile bottom-sheet toolbox. Tap a tool to arm it (Insert Mode), then tap
 * the canvas to place. Uses the grid store's armInsert — same logic as
 * desktop.
 */
export function MobileToolboxSheet({ isOpen, onClose }: MobileToolboxSheetProps) {
  const [openGroup, setOpenGroup] = useState<string | null>('Contacts');
  const armInsert = useGridEditorStore((s) => s.armInsert);
  const document = useGridEditorStore((s) => s.document);
  const armedSpec = useGridEditorStore((s) => s.armedSpec);
  const dragStartY = useRef<number>(0);

  useEffect(() => {
    if (isOpen) setOpenGroup('Contacts');
  }, [isOpen]);

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
    onClose();
  }

  function handleTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches[0].clientY - dragStartY.current > 80) onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-gray-900"
          >
            <div className="sticky top-0 flex items-center justify-between bg-white px-4 py-2 dark:bg-gray-900">
              <div className="mx-auto h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2">
              <h3 className="text-sm font-bold">Toolbox</h3>
              <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted/40">
                <X size={18} />
              </button>
            </div>
            {armedSpec && (
              <div className="mx-4 mb-2 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs text-green-600 dark:text-green-400">
                Armed: <span className="font-bold">{armedSpec.kind}</span> — tap a cell on the canvas to place.
              </div>
            )}
            <div className="px-4 pb-6">
              {PALETTE_GROUPS.map((group) => {
                const isOpenGroup = openGroup === group.title;
                return (
                  <div key={group.title} className="border-b border-border/40 dark:border-border-dark/40">
                    <button
                      onClick={() => setOpenGroup(isOpenGroup ? null : group.title)}
                      className="flex w-full items-center justify-between py-2 text-xs font-semibold uppercase tracking-wide"
                    >
                      {group.title}
                      {isOpenGroup ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    {isOpenGroup && (
                      <div className="grid grid-cols-3 gap-1.5 pb-2">
                        {group.items.map((item) => (
                          <button
                            key={item.label}
                            onClick={() => handlePick(item)}
                            className={cn(
                              'flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors',
                              'border-border bg-muted/20 hover:bg-muted/40 dark:border-border-dark dark:hover:bg-white/5'
                            )}
                          >
                            <span className="font-mono text-sm">{item.glyph}</span>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
