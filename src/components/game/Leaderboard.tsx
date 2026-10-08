"use client";

import { useEffect, useState } from "react";
import { Trophy, Gift } from "lucide-react";
import { getLeaderboard, type LeaderRow } from "@/lib/endpoints";

const MEDALS = ["🥇", "🥈", "🥉"];

// The public league table. `refreshKey` changes after each run so a new personal
// best shows up without a page reload.
export function Leaderboard({ refreshKey, myRank }: { refreshKey: number; myRank?: number }) {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getLeaderboard()
      .then((d) => setRows(d.leaders ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoaded(true));
  }, [refreshKey]);

  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-product">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Trophy className="h-4 w-4 text-accent-500" /> League table
        </h2>
        {myRank ? (
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
            You&rsquo;re #{myRank}
          </span>
        ) : null}
      </div>

      {!loaded ? (
        <p className="mt-4 text-sm text-muted">Loading the table…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No scores yet — be the first name on the board.
        </p>
      ) : (
        <ol className="mt-4 space-y-1.5">
          {rows.map((r) => (
            <li
              key={`${r.rank}-${r.name}`}
              className="flex items-center gap-3 rounded-xl px-2.5 py-2 odd:bg-surface"
            >
              <span className="w-7 shrink-0 text-center text-sm font-bold text-muted">
                {MEDALS[r.rank - 1] ?? r.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{r.name}</span>
              <span className="shrink-0 font-display text-sm font-bold text-brand-700">
                {r.score.toLocaleString("en-IN")}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-accent-300/20 p-3 text-xs leading-relaxed text-ink">
        <Gift className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
        <p>
          <span className="font-semibold">Season giveaway:</span> the top runners when the season
          closes win an Ootybites hamper. Keep your name on the board!
        </p>
      </div>
    </div>
  );
}
