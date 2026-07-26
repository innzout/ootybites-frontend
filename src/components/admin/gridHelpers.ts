// Lightweight column-def helpers. Only the ColDef *type* is imported (erased at
// build time), so importing these does NOT pull the heavy AG Grid runtime into a
// page bundle — the grid itself is loaded lazily via next/dynamic.
import type { ColDef, ICellRendererParams } from "ag-grid-community";

export function col<T>(field: ColDef<T>["field"], headerName: string, extra: ColDef<T> = {}): ColDef<T> {
  return { field, headerName, colId: field as string, ...extra };
}

/** A server-sortable column — colId must match a backend sort key. */
export function sortCol<T>(field: ColDef<T>["field"], headerName: string, extra: ColDef<T> = {}): ColDef<T> {
  return { field, headerName, colId: field as string, sortable: true, ...extra };
}

/** Right-aligned, non-sortable actions column that renders custom buttons. */
export function actionCol<T>(
  headerName: string,
  renderer: (row: T) => React.ReactNode,
  extra: ColDef<T> = {},
): ColDef<T> {
  return {
    headerName,
    sortable: false,
    resizable: false,
    minWidth: 120,
    flex: 0,
    cellRenderer: (p: ICellRendererParams<T>) => (p.data ? renderer(p.data) : null),
    ...extra,
  };
}
