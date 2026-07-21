import { LadderEditorScreen } from '@/features/plc-simulator/components/LadderEditorScreen';

/**
 * Phase 4: renders the real Konva-based ladder editor (see
 * features/plc-simulator/), wired to the unmodified Phase 2 engine (via
 * usePlcStore) and Phase 3 editor (via useLadderEditorStore).
 *
 * Phase 6.0: the old "page title + description + boxed editor" composition
 * is gone — LadderEditorScreen is now a full industrial IDE shell with its
 * own toolbar/status bar, so this page just gives it the room to fill the
 * viewport (per the brief: "Canvas harus memenuhi layar").
 */
export default function PlcSimulatorPage() {
  return <LadderEditorScreen />;
}
