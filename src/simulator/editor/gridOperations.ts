import { generateId } from '@/simulator/utils/id';
import type { GridDocument, GridRung, GridElement, BranchSpan } from './gridTypes';

// ─── Grid Layout Operations ─────────────────────────────────────────────
// All operations are pure: (doc, ...args) -> new doc. No in-place mutation.
// Wires are NEVER managed here — they are derived at export time from the
// grid layout (see gridExport.ts).

export class GridEditorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GridEditorError';
  }
}

function cloneRung(rung: GridRung): GridRung {
  return {
    id: rung.id,
    elements: { ...rung.elements },
    elementOrder: [...rung.elementOrder],
    branches: rung.branches.map((b) => ({ ...b })),
  };
}

function cloneDoc(doc: GridDocument): GridDocument {
  return {
    ...doc,
    rungOrder: [...doc.rungOrder],
    rungs: { ...doc.rungs },
  };
}

function requireRung(doc: GridDocument, rungId: string): GridRung {
  const rung = doc.rungs[rungId];
  if (!rung) throw new GridEditorError(`Rung "${rungId}" does not exist.`);
  return rung;
}

/** Finds the rightmost column occupied in a rung across ALL branch levels. */
function maxColumn(rung: GridRung): number {
  let max = -1;
  for (const id of rung.elementOrder) {
    if (rung.elements[id].column > max) max = rung.elements[id].column;
  }
  return max;
}

/** Checks if a grid cell (column, branchLevel) is already occupied. */
function isCellOccupied(rung: GridRung, column: number, branchLevel: number): boolean {
  return rung.elementOrder.some((id) => {
    const el = rung.elements[id];
    return el.column === column && el.branchLevel === branchLevel;
  });
}

// ── 1. Place Component ──────────────────────────────────────────────────
/** Places a new element at (column, branchLevel). If the cell is occupied,
 * shifts existing elements at that column and beyond to the right. */
export function placeElement(
  doc: GridDocument,
  rungId: string,
  element: GridElement
): GridDocument {
  const rung = requireRung(doc, rungId);
  if (rung.elements[element.id]) {
    throw new GridEditorError(`Element "${element.id}" already exists in rung "${rungId}".`);
  }

  const nextRung = cloneRung(rung);

  // Shift existing elements right if the target cell is occupied
  if (isCellOccupied(nextRung, element.column, element.branchLevel)) {
    for (const id of nextRung.elementOrder) {
      const el = nextRung.elements[id];
      if (el.branchLevel === element.branchLevel && el.column >= element.column) {
        nextRung.elements[id] = { ...el, column: el.column + 1 };
      }
    }
    // Also shift branch spans that start at or past the insertion column
    nextRung.branches = nextRung.branches.map((b) => {
      if (b.branchLevel === element.branchLevel) {
        return {
          ...b,
          startColumn: b.startColumn >= element.column ? b.startColumn + 1 : b.startColumn,
          endColumn: b.endColumn >= element.column ? b.endColumn + 1 : b.endColumn,
        };
      }
      return b;
    });
  }

  nextRung.elements[element.id] = element;
  nextRung.elementOrder.push(element.id);

  const nextDoc = cloneDoc(doc);
  nextDoc.rungs[rungId] = nextRung;
  return nextDoc;
}

// ── 2. Delete Element ───────────────────────────────────────────────────
/** Removes an element. Elements to its right shift left to fill the gap.
 * Branch spans referencing the deleted element's column are adjusted. */
export function deleteGridElement(doc: GridDocument, rungId: string, elementId: string): GridDocument {
  const rung = requireRung(doc, rungId);
  const el = rung.elements[elementId];
  if (!el) throw new GridEditorError(`Element "${elementId}" not found in rung "${rungId}".`);

  const nextRung = cloneRung(rung);
  delete nextRung.elements[elementId];
  nextRung.elementOrder = nextRung.elementOrder.filter((id) => id !== elementId);

  // Shift elements left to fill the gap at the same branch level
  for (const id of nextRung.elementOrder) {
    const existing = nextRung.elements[id];
    if (existing.branchLevel === el.branchLevel && existing.column > el.column) {
      nextRung.elements[id] = { ...existing, column: existing.column - 1 };
    }
  }

  // Remove branches that only contained the deleted element, adjust others
  nextRung.branches = nextRung.branches
    .filter((b) => {
      // Drop branches whose level matches the deleted element and have no
      // remaining elements
      if (b.branchLevel === el.branchLevel) {
        const hasElements = nextRung.elementOrder.some(
          (id) => nextRung.elements[id].branchLevel === b.branchLevel
        );
        return hasElements;
      }
      return true;
    })
    .map((b) => {
      if (b.branchLevel === el.branchLevel) {
        return {
          ...b,
          startColumn: b.startColumn > el.column ? b.startColumn - 1 : b.startColumn,
          endColumn: b.endColumn > el.column ? b.endColumn - 1 : b.endColumn,
        };
      }
      return b;
    });

  const nextDoc = cloneDoc(doc);
  nextDoc.rungs[rungId] = nextRung;
  return nextDoc;
}

// ── 3. Create Branch ────────────────────────────────────────────────────
/** Creates a parallel branch at the given branch level. The branch spans
 * from startColumn to endColumn. Elements placed at the new branchLevel
 * between these columns form the parallel path. */
export function createGridBranch(
  doc: GridDocument,
  rungId: string,
  startColumn: number,
  endColumn: number,
  branchLevel: number,
  parentLevel: number = 0
): { doc: GridDocument; branchId: string } {
  const rung = requireRung(doc, rungId);
  if (startColumn >= endColumn) {
    throw new GridEditorError('Branch start column must be before end column.');
  }
  if (branchLevel <= parentLevel) {
    throw new GridEditorError('Branch level must be greater than parent level.');
  }

  // Check no existing branch at the same level overlaps
  for (const b of rung.branches) {
    if (b.branchLevel === branchLevel) {
      const overlaps = startColumn < b.endColumn && endColumn > b.startColumn;
      if (overlaps) {
        throw new GridEditorError(`Branch at level ${branchLevel} overlaps an existing branch.`);
      }
    }
  }

  const branchId = generateId('branch');
  const span: BranchSpan = {
    id: branchId,
    startColumn,
    endColumn,
    branchLevel,
    parentLevel,
  };

  const nextRung = cloneRung(rung);
  nextRung.branches.push(span);

  const nextDoc = cloneDoc(doc);
  nextDoc.rungs[rungId] = nextRung;
  return { doc: nextDoc, branchId };
}

// ── 4. Update Element Properties ─────────────────────────────────────────
export function updateGridElement(
  doc: GridDocument,
  rungId: string,
  elementId: string,
  updates: Partial<GridElement>
): GridDocument {
  const rung = requireRung(doc, rungId);
  const el = rung.elements[elementId];
  if (!el) throw new GridEditorError(`Element "${elementId}" not found in rung "${rungId}".`);

  const nextRung = cloneRung(rung);
  nextRung.elements[elementId] = { ...el, ...updates, id: el.id, kind: el.kind };

  const nextDoc = cloneDoc(doc);
  nextDoc.rungs[rungId] = nextRung;
  return nextDoc;
}

// ── 5. Move Element ──────────────────────────────────────────────────────
/** Moves an element to a new grid cell. If the target is occupied, shifts
 * existing elements. */
export function moveGridElement(
  doc: GridDocument,
  rungId: string,
  elementId: string,
  column: number,
  branchLevel: number
): GridDocument {
  const rung = requireRung(doc, rungId);
  const el = rung.elements[elementId];
  if (!el) throw new GridEditorError(`Element "${elementId}" not found in rung "${rungId}".`);
  if (el.column === column && el.branchLevel === branchLevel) return doc;

  // Remove from old position, then place at new
  let next = deleteGridElement(doc, rungId, elementId);
  const nextRung = next.rungs[rungId];
  const shiftedEl: GridElement = { ...el, column, branchLevel };

  // Shift if target occupied
  const targetOccupied = isCellOccupied(nextRung, column, branchLevel);
  if (targetOccupied) {
    for (const id of nextRung.elementOrder) {
      const existing = nextRung.elements[id];
      if (existing.branchLevel === branchLevel && existing.column >= column) {
        nextRung.elements[id] = { ...existing, column: existing.column + 1 };
      }
    }
  }

  nextRung.elements[elementId] = shiftedEl;
  nextRung.elementOrder.push(elementId);

  return next;
}

// ── 6. Document Management ───────────────────────────────────────────────
export function createEmptyGridDocument(name: string): GridDocument {
  const rungId = generateId('rung');
  return {
    id: generateId('doc'),
    name,
    createdAt: new Date().toISOString(),
    rungOrder: [rungId],
    rungs: { [rungId]: { id: rungId, elements: {}, elementOrder: [], branches: [] } },
  };
}

export function addGridRung(doc: GridDocument): { doc: GridDocument; rungId: string } {
  const rungId = generateId('rung');
  const nextDoc = cloneDoc(doc);
  nextDoc.rungOrder.push(rungId);
  nextDoc.rungs[rungId] = { id: rungId, elements: {}, elementOrder: [], branches: [] };
  return { doc: nextDoc, rungId };
}

// ── Query Helpers ────────────────────────────────────────────────────────
/** Returns all elements at a given branch level, sorted by column. */
export function elementsAtLevel(rung: GridRung, branchLevel: number): GridElement[] {
  return rung.elementOrder
    .map((id) => rung.elements[id])
    .filter((el) => el.branchLevel === branchLevel)
    .sort((a, b) => a.column - b.column);
}

/** Returns the maximum branch level used in a rung (0 = main row only). */
export function maxBranchLevel(rung: GridRung): number {
  let max = 0;
  for (const id of rung.elementOrder) {
    if (rung.elements[id].branchLevel > max) max = rung.elements[id].branchLevel;
  }
  for (const b of rung.branches) {
    if (b.branchLevel > max) max = b.branchLevel;
  }
  return max;
}

/** Returns the number of columns needed to render a rung. */
export function rungColumnCount(rung: GridRung): number {
  const maxCol = maxColumn(rung);
  return maxCol + 1;
}
