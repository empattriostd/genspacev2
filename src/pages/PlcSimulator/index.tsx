import { LadderEditorScreen } from '@/features/plc-simulator/components/LadderEditorScreen';

/**
 * Phase 6: Full-screen industrial ladder editor — CX-Programmer style.
 * The editor fills the entire viewport so the dual power-rail canvas has
 * maximum working area, matching the feel of a real PLC IDE.
 */
export default function PlcSimulatorPage() {
  return (
    <div className="flex h-full flex-col gap-1">
      <LadderEditorScreen />
    </div>
  );
}
