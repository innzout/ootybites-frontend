"use client";
/**
 * Reusable AG Grid (Community) wrapper for the Ootybites admin panel.
 *
 * PATTERN (from hirzout-web's DataGrid / the ifacx app): the grid is RENDER-ONLY.
 * The Go backend owns pagination and sorting — each view fetches one page via the
 * API (page/limit/sort/order) and feeds the rows here as `rowData`; the shared
 * <Pagination> control drives page changes and `onServerSort` reports sort model
 * changes back so the caller can refetch. Community (MIT) edition only.
 *
 * This module is heavy, so pages should load it lazily via next/dynamic
 * (ssr:false) to keep it out of the initial admin bundle (code splitting).
 */
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  type ColDef,
  type RowClickedEvent,
  type GetRowIdParams,
  type SortChangedEvent,
} from "ag-grid-community";

// Register the Community modules once for the whole app.
ModuleRegistry.registerModules([AllCommunityModule]);

// Ootybites emerald theme — mirrors the app tokens (emerald green accent, navy
// ink, hairline borders, Jakarta font) so the grid matches the rest of the panel.
export const ootyTheme = themeQuartz.withParams({
  accentColor: "#0e7c57",
  foregroundColor: "#0d1b2e",
  backgroundColor: "#ffffff",
  borderColor: "#e6ebf3",
  headerBackgroundColor: "#ecf7f2",
  headerTextColor: "#5a6b85",
  headerFontWeight: 700,
  headerFontSize: 11,
  rowHoverColor: "#ecf7f2",
  oddRowBackgroundColor: "#ffffff",
  fontFamily: "var(--font-jakarta), system-ui, sans-serif",
  headerFontFamily: "var(--font-jakarta), system-ui, sans-serif",
  fontSize: 14,
  headerHeight: 44,
  rowHeight: 52,
  cellHorizontalPadding: 18,
  wrapperBorder: true,
  wrapperBorderRadius: 16,
  borderRadius: 8,
});

export interface DataGridProps<T> {
  rowData: T[];
  columnDefs: ColDef<T>[];
  /** Row click handler (opens detail). Row gets a pointer cursor when set. */
  onRowClicked?: (row: T) => void;
  /** Server-side sort: reports the active sort column + direction (or null). */
  onServerSort?: (colId: string | null, dir: "asc" | "desc" | null) => void;
  getRowId?: (row: T) => string;
  emptyText?: string;
  /** Fixed pixel height; omit for autoHeight (grows to fit the page of rows). */
  height?: number;
  loading?: boolean;
}

export function DataGrid<T>({
  rowData,
  columnDefs,
  onRowClicked,
  onServerSort,
  getRowId,
  emptyText,
  height,
  loading,
}: DataGridProps<T>) {
  const autoHeight = height == null;
  return (
    <div style={autoHeight ? { width: "100%" } : { height, width: "100%" }}>
      <AgGridReact<T>
        theme={ootyTheme}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={{ sortable: false, resizable: true, flex: 1, minWidth: 90 }}
        domLayout={autoHeight ? "autoHeight" : undefined}
        suppressCellFocus
        loading={loading}
        // Server owns sorting: report the sort model up and let the caller refetch.
        onSortChanged={
          onServerSort
            ? (e: SortChangedEvent<T>) => {
                const sorted = e.api.getColumnState().find((c) => c.sort);
                onServerSort(sorted?.colId ?? null, (sorted?.sort as "asc" | "desc") ?? null);
              }
            : undefined
        }
        rowStyle={onRowClicked ? { cursor: "pointer" } : undefined}
        onRowClicked={
          onRowClicked
            ? (e: RowClickedEvent<T>) => {
                // Ignore clicks originating from interactive controls in a cell.
                const target = e.event?.target as HTMLElement | null;
                if (target && target.closest("button, a, input, select, label")) return;
                if (e.data) onRowClicked(e.data);
              }
            : undefined
        }
        getRowId={getRowId ? (p: GetRowIdParams<T>) => getRowId(p.data) : undefined}
        overlayNoRowsTemplate={`<span style="color:#5a6b85;font-size:14px;font-weight:600">${emptyText ?? "No records found."}</span>`}
      />
    </div>
  );
}
