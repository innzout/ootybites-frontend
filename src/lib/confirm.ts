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

/**
 * Asks before signing out. Logout is one of the actions CLAUDE.md rule 6 says
 * must be confirmed: a stray tap otherwise throws away the session, and for a
 * customer mid-checkout the cart context along with it. Shared so the shop,
 * admin and dealer bars all ask the same question.
 */
export function confirmLogout(): Promise<boolean> {
  return askConfirm({
    title: "Log out?",
    message: "You will need to sign in again to continue.",
    confirmText: "Log out",
  });
}
