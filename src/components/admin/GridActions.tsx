"use client";
import { Pencil } from "lucide-react";

// Shared per-row action controls for admin grids, so every list uses the same
// look: an optional pill toggle, an Edit button, and a Delete link.
export function GridActions({
  onEdit,
  onDelete,
  toggle,
}: {
  onEdit: () => void;
  onDelete: () => void;
  toggle?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex h-full items-center justify-end gap-2">
      {toggle && (
        <button
          onClick={toggle.onClick}
          className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-muted hover:border-brand-400 hover:text-brand-600"
        >
          {toggle.label}
        </button>
      )}
      <button
        onClick={onEdit}
        className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
      >
        <Pencil className="h-3 w-3" /> Edit
      </button>
      <button onClick={onDelete} className="text-xs font-semibold text-red-600 hover:underline">
        Delete
      </button>
    </div>
  );
}
