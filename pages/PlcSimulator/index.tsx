import { LadderEditorScreen } from '@/features/plc-simulator/components/LadderEditorScreen';

/**
 * Phase 4: this now renders the real Konva-based ladder editor (see
 * features/plc-simulator/), replacing the earlier static/decorative mock
 * from the Phase-1 UI pass. Wired to the unmodified Phase 2 engine (via
 * usePlcStore) and Phase 3 editor (via useLadderEditorStore).
 */
export default function PlcSimulatorPage() {
  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold">PLC Simulator</h2>
        <p className="text-sm text-muted-foreground">
          Drag components from the palette, wire them up, and press Run to simulate.
        </p>
      </div>
      <LadderEditorScreen />
    </div>
  );
}
