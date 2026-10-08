"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { Notification } from "@/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Feed {
  notifications: Notification[];
  unread: number;
}

// NotificationBell is a reusable bell + unread badge + dropdown panel. The
// caller supplies the fetch + mark-read functions, so it works for both the
// customer and the admin feeds. `tone` picks light (on dark navbars) or dark
// (on light surfaces) icon colours.
export function NotificationBell({
  fetchFeed,
  markRead,
  tone = "light",
  align = "right",
  hrefFor,
}: {
  fetchFeed: () => Promise<Feed>;
  markRead: () => Promise<unknown>;
  tone?: "light" | "dark";
  // Which edge the dropdown anchors to. Use "left" when the bell sits near the
  // left of the viewport (e.g. the admin sidebar) so the panel opens rightward.
  align?: "left" | "right";
  // Resolve a notification to a target route (e.g. its order). Return null for
  // notifications with no destination — those render as plain, non-clickable rows.
  hrefFor?: (n: Notification) => string | null;
}) {
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<Feed>({ notifications: [], unread: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetchFeed()
      .then(setFeed)
      .catch(() => {});
  }, [fetchFeed]);

  // Initial load + poll every 30s.
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && feed.unread > 0) {
      await markRead().catch(() => {});
      setFeed((f) => ({ notifications: f.notifications.map((n) => ({ ...n, is_read: true })), unread: 0 }));
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label="Notifications"
        className={cn(
          "relative rounded-full p-2 transition-colors",
          tone === "light" ? "text-cream/80 hover:bg-white/10 hover:text-white" : "text-muted hover:bg-brand-50 hover:text-brand-700",
        )}
      >
        <Bell className="h-5 w-5" />
        {feed.unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
            {feed.unread > 9 ? "9+" : feed.unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-80 max-w-[85vw] overflow-hidden rounded-2xl border border-line bg-white shadow-xl",
            align === "left" ? "left-0" : "right-0",
          )}
        >
          <div className="border-b border-line px-4 py-2.5">
            <p className="font-display text-sm font-bold text-ink">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {feed.notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">You&rsquo;re all caught up.</p>
            ) : (
              feed.notifications.map((n) => {
                const href = hrefFor?.(n) ?? null;
                const body = (
                  <>
                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-muted">{formatDate(n.created_at)}</p>
                  </>
                );
                return href ? (
                  <Link
                    key={n.id}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-brand-50/60"
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={n.id} className="border-b border-line px-4 py-3 last:border-0">
                    {body}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
