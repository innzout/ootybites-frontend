// Column-def helpers and types for the admin DataGrid.
//
// These types used to come from `ag-grid-community`. They are now defined here:
// AG Grid shipped an 849 KB (gzipped 232 KB) lazy chunk on every admin list
// screen to render ~20 rows of a server-paginated table, which was the dominant
// cost of opening any admin list page. The grid is a plain table now; this file
// keeps the same shapes so the column definitions in each page are unchanged.

/** What a cellRenderer receives. Mirrors AG Grid's ICellRendererParams subset we use. */
export interface CellRendererParams<T> {
  /**
   * The column's resolved value — from `valueGetter` if present, else `field`.
   *
   * Typed as ReactNode rather than AG Grid's `any`: every column here renders
   * its value into JSX, so this is the contract the call sites actually rely on,
   * and it keeps `{p.value}` type-checked instead of silently accepting an
   * object that would throw at render time.
   */
  value: React.ReactNode;
  /** The whole row. Optional to match the previous AG Grid typing. */
  data?: T;
}

/**
 * Compatibility alias for the AG Grid name the column definitions already use.
 * Kept so removing AG Grid did not require touching 37 cellRenderer signatures.
 */
export type ICellRendererParams<T> = CellRendererParams<T>;

export interface ValueGetterParams<T> {
  data?: T;
}

export interface ColDef<T> {
  /** Property on the row to read. Omit for columns that render from `data`. */
  field?: string;
  headerName?: string;
  /** Sort key reported to the server; defaults to `field`. */
  colId?: string;
  minWidth?: number;
  maxWidth?: number;
  /** 0 = size to content; anything else shares the remaining width. */
  flex?: number;
  sortable?: boolean;
  /** Initial sort direction for this column. */
  sort?: "asc" | "desc" | null;
  /** Accepted for call-site compatibility; the plain table always fits content. */
  resizable?: boolean;
  valueGetter?: (p: ValueGetterParams<T>) => React.ReactNode;
  cellRenderer?: (p: CellRendererParams<T>) => React.ReactNode;
}

export function col<T>(field: ColDef<T>["field"], headerName: string, extra: ColDef<T> = {}): ColDef<T> {
  return { field, headerName, colId: field, ...extra };
}

/** A server-sortable column — colId must match a backend sort key. */
export function sortCol<T>(field: ColDef<T>["field"], headerName: string, extra: ColDef<T> = {}): ColDef<T> {
  return { field, headerName, colId: field, sortable: true, ...extra };
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
    cellRenderer: (p: CellRendererParams<T>) => (p.data ? renderer(p.data) : null),
    ...extra,
  };
}

/**
 * Resolves a column's value for a row: valueGetter wins, else field lookup.
 *
 * The field lookup is cast because a row's property type is only known to the
 * call site. Columns whose underlying value is not directly renderable supply a
 * `cellRenderer`, which receives `data` and ignores `value`.
 */
export function cellValue<T>(colDef: ColDef<T>, row: T): React.ReactNode {
  if (colDef.valueGetter) return colDef.valueGetter({ data: row });
  if (!colDef.field) return undefined;
  return (row as Record<string, unknown>)[colDef.field] as React.ReactNode;
}
