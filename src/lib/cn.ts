import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn merges conditional class names and resolves Tailwind conflicts
// (last-wins), so component variants can be overridden cleanly via className.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
