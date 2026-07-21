import { generateId } from '@/simulator/utils/id';
import type { GridElement, PlacementSpec } from './gridTypes';

/** Creates a GridElement from a placement spec at a given grid position. */
export function createGridElement(
  spec: PlacementSpec,
  column: number,
  branchLevel: number
): GridElement {
  const base: GridElement = {
    id: generateId(spec.kind.toLowerCase()),
    kind: spec.kind,
    column,
    branchLevel,
  };

  switch (spec.kind) {
    case 'CONTACT':
      return { ...base, address: spec.address, mode: spec.mode };
    case 'COIL':
      return { ...base, address: spec.address, coilMode: spec.coilMode ?? 'NORMAL', instruction: spec.instruction };
    case 'TIMER':
      return {
        ...base,
        address: spec.address,
        presetMs: spec.presetMs,
        timerType: spec.timerType ?? 'TON',
        resetAddress: spec.resetAddress,
      };
    case 'COUNTER':
      return {
        ...base,
        address: spec.address,
        presetCount: spec.presetCount,
        counterType: spec.counterType ?? 'CTU',
        resetAddress: spec.resetAddress,
      };
    case 'COMMENT':
      return { ...base, text: spec.text };
    default: {
      const _exhaustive: never = spec;
      return _exhaustive;
    }
  }
}
