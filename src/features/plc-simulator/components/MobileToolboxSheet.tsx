import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from '@/utils/cn';

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
      { label: 'Rising', dragKind: 'CONTACT_RISING', glyph: '↑' },
      { label: 'Falling', dragKind: 'CONTACT_FALLING', glyph: '↓' },
    ],
  },
  {
    title: 'Coils',
    items: [
      { label: 'Coil', dragKind: 'COIL_O', glyph: '( )' },
      { label: 'SET', dragKind: 'COIL_O_SET', glyph: '(S)' },
      { label: 'RESET', dragKind: 'COIL_O_RESET', glyph: '(R)' },
      { label: 'Memory', dragKind: 'COIL_M', glyph: '(M)' },
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
    ],
  },
  {
    title: 'Other',
    items: [
      { label: 'M-Contact', dragKind: 'CONTACT_M', glyph: '⊣M⊢' },
      { label: 'Wire', dragKind: 'WIRE', glyph: '──' },
      { label: 'Comment', dragKind: 'COMMENT', glyph: '▭' },
    ],
  },
];

interface MobileToolboxSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onPick: (dragKind: string) => void;
  pendingKind: string | null;
}

/**
 * Mobile bottom-sheet toolbox. Instead of drag-and-drop (which is awkward on
 * touch), the user taps a tool to "arm" it, then taps the canvas to place.
 * The sheet snaps to half-height with a drag handle and can be dismissed by
 * swiping down or tapping the backdrop.
 */
export function MobileToolboxSheet({ isOpen, onClose, onPick, pendingKind }: MobileToolboxSheetProps) {
  const [openGroup, setOpenGroup] = useState<string | null>('Contacts');
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef<number>(0);

  useEffect(() => {
    if (isOpen) setOpenGroup('Contacts');
  }, [isOpen]);

  function handleTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
  }
  function handleTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 80) onClose();
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
            ref={sheetRef}
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
            {pendingKind && (
              <div className="mx-4 mb-2 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400">
                Tap canvas to place: <span className="font-bold">{pendingKind}</span>
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
                            key={item.dragKind}
                            onClick={() => onPick(item.dragKind)}
                            className={cn(
                              'flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors',
                              pendingKind === item.dragKind
                                ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'border-border bg-muted/20 hover:bg-muted/40 dark:border-border-dark dark:hover:bg-white/5'
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
