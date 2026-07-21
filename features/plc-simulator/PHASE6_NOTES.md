# Phase 6.0 — Industrial PLC IDE Shell

Scope: **UI only**. Nothing under `src/simulator/` (Runtime, Logic Engine,
Memory Engine, Timer/Counter/Branch engines, Debugger data layer) or
`src/simulator/editor/operations.ts` (the Phase 3 editor operations) was
touched — verified by re-running `tsc -b`, which reports the exact same
pre-existing errors in those files before and after this pass, none of
them newly introduced.

## What changed

| Area | File(s) | What |
|---|---|---|
| Toolbar | `SimulatorToolbar.tsx` | Restyled into an icon-first ribbon (CX-Programmer style), grouped: mode tools / Add Rung / scan mode / Run-Stop-Step-Reset. Same props, same callbacks. |
| Toolbox | `ComponentPalette.tsx` | Regrouped into Contacts / Coils / Timers / Counters / Memory / Instructions / Comments, each collapsible. Same drag contract (`DRAG_MIME`, `specForDragKind`, `addressTypeForDragKind`) — `LadderCanvas.tsx` needed no changes. |
| Properties | `PropertiesPanel.tsx` (new) | Always-visible right dock: Type / Address / Comment / Description / Current Value / Status / Force. Reads `useLadderEditorStore`'s existing `selection` + calls the existing `updateElement`; reads `usePlcStore` for live value/force. Preset is shown read-only — editing it would require extending `updateElementProperties` in `editor/operations.ts`, which is out of scope this phase. The old double-click `PropertyDialog` modal still works exactly as before (untouched) — this panel is additive, not a replacement. |
| Bottom Panel | `BottomPanel.tsx` (new), `DebuggerPanel.tsx` | Docked, collapsible bottom panel with tabs: I/O, Watch, Errors, Live Memory, Force Mode, Scan Time, Cross Reference, Auto Test. All tab *content* is the exact Phase 5.5 Debugger code, just re-hosted in a `bare` layout mode instead of a floating side card. I/O is the existing `SimulationPanel`, also given a `bare` mode. |
| Status Bar | `StatusBar.tsx` (new) | RUN/STOP, Scan Time, Scan #, Instruction/rung count, current rung + address (from selection), error count — all sourced from state that already existed in `usePlcStore`/`useLadderEditorStore`. |
| Shell | `LadderEditorScreen.tsx` | Recomposed into Toolbar → (Toolbox / Canvas / Properties) → Bottom Panel → Status Bar. Desktop keeps Toolbox + Properties permanently docked; `<md` collapses them into a Toolbox bottom sheet and a Properties drawer, opened from compact toolbar buttons — the interaction workflow (click a tool → click the canvas) is identical on every breakpoint. |
| Theme | `styles/globals.css` | New `.plc-ide`-scoped CSS variables (dark industrial workbench palette) + a thin-scrollbar utility. Scoped so it never leaks into the rest of the app (Home/Quiz/Ranking/etc. keep the existing light/dark GENSPACE theme). |
| Page | `pages/PlcSimulator/index.tsx` | Dropped the old title/description block so the IDE can claim the full viewport, per the brief. |

## Verified

- `npm install && npx tsc -b` — the only errors reported are pre-existing
  ones in files this phase never touched (`vite.config.ts` missing
  `@types/node`, a `react-router` `NavLink` typing mismatch in
  `NavBar.tsx`, and a few `Address` re-export issues inside
  `simulator/`). None of the files listed above appear in the error
  output.
- Not verified: actual rendering in a browser (`npm run dev`) — this
  sandbox has no display. Please do a visual pass, especially the mobile
  bottom-sheet/drawer breakpoint behavior and the `-mx-5/-mb-28` bleed
  math in `LadderEditorScreen.tsx` against your real `RootLayout` header
  height, which was tuned by reading the layout, not by measuring it live.

## Deliberately not in this pass (candidates for Phase 6.1)

- **Address Picker popup** (double click → categorized/searchable modal).
  Today double-click still opens the original Phase 5 `PropertyDialog`
  (type <select> + number <input>); the brief's "modern popup with
  Inputs/Outputs/Memory/Timer/Counter categories + search" is a bigger,
  separate component worth its own pass.
- **Preset editing** for Timer/Counter from the Properties Panel (needs an
  `editor/operations.ts` change, out of scope).
- **Live Power Flow color/weight polish** on the canvas itself
  (`ElementNode.tsx`/`ConnectionLine.tsx`/`constants.ts`) — the green
  power-flow highlighting already exists from Phase 5 and now sits on a
  dark industrial canvas instead of a light one; a deliberate pass to
  thicken active wires / add a glow could push it further toward the
  "modern Android simulator" look specifically requested.
- **Resizable** (drag-to-resize, not just collapse/expand) Bottom Panel.
- A **Mini Map** for the canvas (called out as optional in the brief).
