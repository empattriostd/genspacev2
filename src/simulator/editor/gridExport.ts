import type { GridDocument, GridRung, GridElement } from './gridTypes';
import type { LadderElement, LadderProject, Rung } from '@/simulator/types/ladder';
import { parseLadder } from '@/simulator/parser/parseLadder';

// ─── Auto-Wire Derivation ─────────────────────────────────────────────
// Wires are NOT stored. They are computed from the grid layout every time
// the document is exported. The algorithm:
//
// 1. For each branch level, elements are chained left-to-right (series).
// 2. For each branch span, the first element at the branch level connects
//    back to the parent level's element at startColumn, and the last element
//    at the branch level connects to the parent level's element at endColumn.
// 3. Elements with no predecessors are wired to the left rail (startIds).
// 4. Coils/timers/counters are terminal — they don't connect onward.

export interface GridExportResult {
  project: LadderProject;
  errors: string[];
}

/** Converts a GridElement to a LadderElement for the engine, computing
 * connectsTo from the grid layout. */
function gridElementToLadder(
  el: GridElement,
  connectsTo: string[]
): LadderElement {
  const base = {
    id: el.id,
    gridX: el.column,
    gridY: el.branchLevel,
    connectsTo,
    comment: el.comment,
    alias: el.alias,
  };

  switch (el.kind) {
    case 'CONTACT':
      return {
        ...base,
        kind: 'CONTACT',
        mode: el.mode ?? 'NO',
        address: el.address!,
      };
    case 'COIL':
      return {
        ...base,
        kind: 'COIL',
        address: el.address!,
        coilMode: el.coilMode ?? 'NORMAL',
        ...(el.instruction ? { instruction: el.instruction } : {}),
      };
    case 'TIMER':
      return {
        ...base,
        kind: 'TIMER',
        address: el.address!,
        presetMs: el.presetMs ?? 2000,
        timerType: el.timerType ?? 'TON',
        ...(el.resetAddress ? { resetAddress: el.resetAddress } : {}),
      };
    case 'COUNTER':
      return {
        ...base,
        kind: 'COUNTER',
        address: el.address!,
        presetCount: el.presetCount ?? 3,
        counterType: el.counterType ?? 'CTU',
        ...(el.resetAddress ? { resetAddress: el.resetAddress } : {}),
      };
    case 'COMMENT':
      return {
        ...base,
        kind: 'COMMENT',
        text: el.text ?? '',
        connectsTo: [],
      };
    default: {
      const _exhaustive: never = el.kind;
      return _exhaustive;
    }
  }
}

/** Computes the connectsTo edges for all elements in a rung based on grid
 * layout. This is the auto-wire algorithm. */
function deriveConnectsTo(rung: GridRung): Map<string, string[]> {
  const edges = new Map<string, string[]>();
  for (const id of rung.elementOrder) edges.set(id, []);

  // Group elements by branch level
  const byLevel = new Map<number, GridElement[]>();
  for (const id of rung.elementOrder) {
    const el = rung.elements[id];
    const list = byLevel.get(el.branchLevel) ?? [];
    list.push(el);
    byLevel.set(el.branchLevel, list);
  }

  // Sort each level by column
  for (const [, els] of byLevel) {
    els.sort((a, b) => a.column - b.column);

    // Chain elements left-to-right (series connections)
    for (let i = 0; i < els.length - 1; i++) {
      const from = els[i];
      const to = els[i + 1];
      // Terminal elements (COIL, TIMER, COUNTER) don't connect onward
      if (from.kind === 'COIL' || from.kind === 'TIMER' || from.kind === 'COUNTER') continue;
      edges.get(from.id)!.push(to.id);
    }
  }

  // Handle branch spans: connect branch-level elements to parent level
  for (const branch of rung.branches) {
    const branchEls = (byLevel.get(branch.branchLevel) ?? []).sort((a, b) => a.column - b.column);
    const parentEls = (byLevel.get(branch.parentLevel) ?? []).sort((a, b) => a.column - b.column);

    if (branchEls.length === 0) continue;

    // Find the parent element at or just before startColumn
    const parentAtStart = parentEls
      .filter((e) => e.column < branch.startColumn)
      .sort((a, b) => b.column - a.column)[0];
    // Find the parent element at or just after endColumn
    const parentAtEnd = parentEls
      .filter((e) => e.column >= branch.endColumn)
      .sort((a, b) => a.column - b.column)[0];

    // Connect parent diverge point to first branch element
    const firstBranchEl = branchEls[0];
    if (parentAtStart && parentAtStart.kind !== 'COIL' && parentAtStart.kind !== 'TIMER' && parentAtStart.kind !== 'COUNTER') {
      // The parent element feeds both the next element in its own level AND
      // the first element of the branch (fan-out)
      const existing = edges.get(parentAtStart.id) ?? [];
      if (!existing.includes(firstBranchEl.id)) {
        edges.get(parentAtStart.id)!.push(firstBranchEl.id);
      }
    }

    // Connect last branch element back to parent converge point
    const lastBranchEl = branchEls[branchEls.length - 1];
    if (parentAtEnd && lastBranchEl.kind !== 'COIL' && lastBranchEl.kind !== 'TIMER' && lastBranchEl.kind !== 'COUNTER') {
      const existing = edges.get(lastBranchEl.id) ?? [];
      if (!existing.includes(parentAtEnd.id)) {
        edges.get(lastBranchEl.id)!.push(parentAtEnd.id);
      }
    }
  }

  return edges;
}

/** Derives startIds — elements with no predecessors are wired to the left rail. */
function deriveStartIds(rung: GridRung, edges: Map<string, string[]>): string[] {
  const referenced = new Set<string>();
  for (const targets of edges.values()) {
    for (const t of targets) referenced.add(t);
  }
  return rung.elementOrder.filter((id) => {
    const el = rung.elements[id];
    return el.kind !== 'COMMENT' && !referenced.has(id);
  });
}

/** Exports a GridDocument to a LadderProject for the engine, deriving all
 * wires automatically from the grid layout. */
export function exportGridToLadder(doc: GridDocument, options: { validate?: boolean } = {}): GridExportResult {
  const { validate = true } = options;

  const rungs: Rung[] = doc.rungOrder.map((rungId) => {
    const rung = doc.rungs[rungId];
    const edges = deriveConnectsTo(rung);
    const startIds = deriveStartIds(rung, edges);

    const elements: LadderElement[] = rung.elementOrder.map((id) => {
      const el = rung.elements[id];
      return gridElementToLadder(el, edges.get(id) ?? []);
    });

    return { id: rung.id, startIds, elements };
  });

  const project: LadderProject = {
    id: doc.id,
    name: doc.name,
    rungs,
    meta: { createdAt: doc.createdAt, updatedAt: new Date().toISOString(), engineVersion: '0.1.0' },
  };

  const errors: string[] = [];
  if (validate) {
    try {
      parseLadder(project);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Unknown validation error.');
    }
  }

  return { project, errors };
}
