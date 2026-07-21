import { create } from 'zustand';
import type { GridDocument, GridElement, PlacementSpec } from '@/simulator/editor/gridTypes';
import {
  createEmptyGridDocument,
  placeElement,
  deleteGridElement,
  createGridBranch,
  updateGridElement,
  moveGridElement,
  addGridRung,
} from '@/simulator/editor/gridOperations';
import { createGridElement } from '@/simulator/editor/gridElementFactory';
import { exportGridToLadder, type GridExportResult } from '@/simulator/editor/gridExport';

interface GridEditorState {
  document: GridDocument;
  selectedElementId: string | null;
  selectedRungId: string | null;
  /** The armed placement spec from the toolbox. When set, clicking a cell
   * places this component. This is the "Insert Mode" — cursor changes, user
   * clicks a cell, component is placed. */
  armedSpec: PlacementSpec | null;
  lastErrors: string[];

  placeComponent: (rungId: string, spec: PlacementSpec, column: number, branchLevel: number) => GridElement | null;
  deleteElement: (rungId: string, elementId: string) => void;
  createBranch: (rungId: string, startColumn: number, endColumn: number, branchLevel: number, parentLevel?: number) => string | null;
  updateElement: (rungId: string, elementId: string, updates: Partial<GridElement>) => void;
  moveElement: (rungId: string, elementId: string, column: number, branchLevel: number) => void;

  selectElement: (rungId: string, elementId: string) => void;
  clearSelection: () => void;

  armInsert: (spec: PlacementSpec) => void;
  disarmInsert: () => void;

  addRung: () => string;
  resetDocument: (name?: string) => void;
  clearErrors: () => void;
  exportToLadder: () => GridExportResult;
}

function guarded<T>(
  set: (partial: Partial<GridEditorState>) => void,
  get: () => GridEditorState,
  fn: () => T
): T | null {
  try {
    return fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown editor error.';
    set({ lastErrors: [...get().lastErrors, message] });
    return null;
  }
}

export const useGridEditorStore = create<GridEditorState>((set, get) => ({
  document: createEmptyGridDocument('Untitled Ladder'),
  selectedElementId: null,
  selectedRungId: null,
  armedSpec: null,
  lastErrors: [],

  placeComponent: (rungId, spec, column, branchLevel) =>
    guarded(set, get, () => {
      const element = createGridElement(spec, column, branchLevel);
      set({ document: placeElement(get().document, rungId, element) });
      return element;
    }),

  deleteElement: (rungId, elementId) => {
    guarded(set, get, () => {
      const state = get();
      set({
        document: deleteGridElement(state.document, rungId, elementId),
        selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId,
      });
    });
  },

  createBranch: (rungId, startColumn, endColumn, branchLevel, parentLevel = 0) =>
    guarded(set, get, () => {
      const { doc, branchId } = createGridBranch(
        get().document,
        rungId,
        startColumn,
        endColumn,
        branchLevel,
        parentLevel
      );
      set({ document: doc });
      return branchId;
    }),

  updateElement: (rungId, elementId, updates) => {
    guarded(set, get, () =>
      set({ document: updateGridElement(get().document, rungId, elementId, updates) })
    );
  },

  moveElement: (rungId, elementId, column, branchLevel) => {
    guarded(set, get, () =>
      set({ document: moveGridElement(get().document, rungId, elementId, column, branchLevel) })
    );
  },

  selectElement: (rungId, elementId) =>
    set({ selectedRungId: rungId, selectedElementId: elementId }),
  clearSelection: () => set({ selectedElementId: null, selectedRungId: null }),

  armInsert: (spec) => set({ armedSpec: spec, selectedElementId: null }),
  disarmInsert: () => set({ armedSpec: null }),

  addRung: () => {
    const { doc, rungId } = addGridRung(get().document);
    set({ document: doc });
    return rungId;
  },

  resetDocument: (name = 'Untitled Ladder') =>
    set({
      document: createEmptyGridDocument(name),
      selectedElementId: null,
      selectedRungId: null,
      armedSpec: null,
      lastErrors: [],
    }),

  clearErrors: () => set({ lastErrors: [] }),

  exportToLadder: () => {
    const result = exportGridToLadder(get().document);
    if (result.errors.length > 0) set({ lastErrors: result.errors });
    return result;
  },
}));
