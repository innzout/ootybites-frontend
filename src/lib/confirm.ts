"use client";

import { create } from "zustand";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions | null;
  resolve: ((v: boolean) => void) | null;
  request: (o: ConfirmOptions) => Promise<boolean>;
  respond: (v: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  request: (o) =>
    new Promise<boolean>((resolve) => set({ open: true, options: o, resolve })),
  respond: (v) => {
    get().resolve?.(v);
    set({ open: false, options: null, resolve: null });
  },
}));

// askConfirm opens the centered confirmation modal and resolves to the user's
// choice. Usable from anywhere: `if (!(await askConfirm({ ... }))) return;`
export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().request(options);
}
