import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { usePlcStore } from '@/stores/plcStore';
import { ADDRESS_RANGE } from '@/simulator/types/plcState';
import { cn } from '@/utils/cn';
import { COLOR_POWER_ON } from '../constants';

interface MobileSimPanelProps {
  isSimulating: boolean;
}

/**
 * Collapsible I/O panel for mobile — replaces the desktop SimulationPanel's
 * fixed sidebar with a collapsible strip that can be expanded to show input
 * toggles and output lamps. Collapsed state shows just a compact summary.
 */
export function MobileSimPanel({ isSimulating }: MobileSimPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const inputs = usePlcStore((s) => s.state.inputs);
  const outputs = usePlcStore((s) => s.state.outputs);
  const setInput = usePlcStore((s) => s.setInput);

  const activeInputs = ADDRESS_RANGE.filter((n) => inputs[n]).length;
  const activeOutputs = ADDRESS_RANGE.filter((n) => outputs[n]).length;

  return (
    <div className="glass rounded-xl">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold"
      >
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">I/O</span>
          <span className="flex gap-1.5">
            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] text-green-600 dark:text-green-400">
              IN {activeInputs}
            </span>
            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] text-orange-600 dark:text-orange-400">
              OUT {activeOutputs}
            </span>
          </span>
        </span>
        {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-3 pb-3">
              <div>
                <h4 className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Inputs</h4>
                <div className="grid grid-cols-8 gap-1">
                  {ADDRESS_RANGE.map((n) => (
                    <button
                      key={n}
                      disabled={!isSimulating}
                      onClick={() => setInput(n, !inputs[n])}
                      className={cn(
                        'flex h-8 items-center justify-center rounded-lg border text-[10px] font-medium transition-colors disabled:opacity-40',
                        inputs[n]
                          ? 'border-transparent text-white'
                          : 'border-border text-muted-foreground dark:border-border-dark'
                      )}
                      style={inputs[n] ? { backgroundColor: COLOR_POWER_ON } : undefined}
                    >
                      I{n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Outputs</h4>
                <div className="grid grid-cols-8 gap-1">
                  {ADDRESS_RANGE.map((n) => (
                    <div
                      key={n}
                      className={cn(
                        'flex h-8 items-center justify-center rounded-lg border text-[10px] font-medium',
                        outputs[n] ? 'border-transparent text-white' : 'border-border text-muted-foreground dark:border-border-dark'
                      )}
                      style={outputs[n] ? { backgroundColor: COLOR_POWER_ON } : undefined}
                    >
                      O{n}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
