import type { Address } from '@/simulator/types/address';
import type { InstructionOp } from '@/simulator/types/instruction';
import type { ContactMode, CoilMode, TimerElement, CounterElement } from '@/simulator/types/ladder';

// ─── Grid-Based Ladder Editor Data Model ─────────────────────────────────
// Replaces the free-pixel diagram model. Components live on a grid defined by
// (rungIndex, column, branchLevel) — NOT pixel coordinates. The renderer
// computes all pixel positions from these grid coordinates.
//
// Wires are NOT objects. They are derived automatically from the grid layout:
// - Series: elements in the same branchLevel are chained left-to-right
// - Branch: a BranchSpan defines a parallel path at a given branchLevel
// - The export step computes connectsTo edges from this layout

/** A component placed on the ladder grid. Position is logical, not pixel. */
export interface GridElement {
  id: string;
  kind: ElementKind;
  /** Column index within the rung (0 = first after left rail). */
  column: number;
  /** Branch level — 0 = main (top) row, 1+ = parallel branch rows below. */
  branchLevel: number;
  /** Address for CONTACT/COIL/TIMER/COUNTER. */
  address?: Address;
  /** Contact mode for CONTACT kind. */
  mode?: ContactMode;
  /** Coil mode for COIL kind. */
  coilMode?: CoilMode;
  /** Instruction for instruction-carrying coils. */
  instruction?: InstructionOp;
  /** Timer type for TIMER kind. */
  timerType?: TimerElement['timerType'];
  /** Timer preset in milliseconds. */
  presetMs?: number;
  /** Counter type for COUNTER kind. */
  counterType?: CounterElement['counterType'];
  /** Counter preset count. */
  presetCount?: number;
  /** Optional reset address for TIMER/COUNTER. */
  resetAddress?: Address;
  /** Optional human-readable comment. */
  comment?: string;
  /** Optional alias/symbol. */
  alias?: string;
  /** Text for COMMENT kind. */
  text?: string;
}

export type ElementKind = 'CONTACT' | 'COIL' | 'TIMER' | 'COUNTER' | 'COMMENT';

/** A parallel branch span. Defines which columns a branch covers and at
 * which branchLevel the parallel path runs. The branch diverges from the
 * main row at startColumn and converges back at endColumn. */
export interface BranchSpan {
  id: string;
  /** Column where the branch diverges from the parent level. */
  startColumn: number;
  /** Column where the branch converges back to the parent level. */
  endColumn: number;
  /** Branch level of this parallel path (1 = first branch below main). */
  branchLevel: number;
  /** The branch level this branch diverges from (0 = main row). */
  parentLevel: number;
}

/** A rung in the grid-based editor. Elements are keyed by id for O(1)
 * access; branch spans track parallel paths. */
export interface GridRung {
  id: string;
  elements: Record<string, GridElement>;
  elementOrder: string[];
  branches: BranchSpan[];
}

/** The full editor document — a list of rungs, each with grid-placed
 * elements and derived branches. */
export interface GridDocument {
  id: string;
  name: string;
  createdAt: string;
  rungOrder: string[];
  rungs: Record<string, GridRung>;
}

/** What the toolbox hands the editor when placing a new component. */
export type PlacementSpec =
  | { kind: 'CONTACT'; mode: ContactMode; address: Address }
  | { kind: 'COIL'; address: Address; coilMode?: CoilMode; instruction?: InstructionOp }
  | { kind: 'TIMER'; address: Address; presetMs: number; timerType?: TimerElement['timerType']; resetAddress?: Address }
  | { kind: 'COUNTER'; address: Address; presetCount: number; resetAddress?: Address; counterType?: CounterElement['counterType'] }
  | { kind: 'COMMENT'; text: string };
