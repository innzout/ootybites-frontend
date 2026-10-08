"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gamepad2, Trophy, Gift, ChevronRight } from "lucide-react";
import { getLeaderboard, getGameSeason, type LeaderRow, type GameSeason } from "@/lib/endpoints";

// A promo panel for the arcade on the storefront home page. It shows the live
// league leader, which is the actual hook — a number to beat is far more
// motivating than a generic "play our game" banner.
export function GamePromo() {
  const [top, setTop] = useState<LeaderRow | null>(null);
  const [season, setSeason] = useState<GameSeason | null>(null);

  useEffect(() => {
    getLeaderboard()
      .then((d) => setTop(d.leaders?.[0] ?? null))
      .catch(() => setTop(null));
    // The prize used to be hardcoded here, so the storefront promised a hamper
    // whether or not a league was running. It now comes from the open season.
    getGameSeason()
      .then((d) => setSeason(d.season))
      .catch(() => setSeason(null));
  }, []);

  return (
    <Link
      href="/play"
      className="group relative block overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white shadow-soft transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 sm:p-8"
    >
      {/* Decorative hills + sun, echoing the game's own backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute right-6 top-6 h-16 w-16 rounded-full bg-accent-300/40 blur-xl" />
        <svg
          className="absolute bottom-0 left-0 h-24 w-full"
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          fill="none"
        >
          <path d="M0 70 Q 50 30 100 60 T 200 55 T 300 45 T 400 65 V100 H0Z" fill="rgba(255,255,255,0.10)" />
          <path d="M0 82 Q 60 55 120 75 T 240 70 T 360 78 T 400 84 V100 H0Z" fill="rgba(255,255,255,0.14)" />
        </svg>
      </div>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-300 backdrop-blur">
            <Gamepad2 className="h-3.5 w-3.5" /> Ootybites Arcade
          </span>

          <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
            Ooty Bites Dash
          </h2>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/85">
            Run the delivery route through the tea hills, grab the goods and dodge the rocks. One
            button — how far can you get?
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
            {season && season.prize ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/90 px-3 py-1.5 text-white">
                <Gift className="h-3.5 w-3.5" /> {season.name}: top the league, win {season.prize}
              </span>
            ) : season ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/90 px-3 py-1.5 text-white">
                <Gift className="h-3.5 w-3.5" /> {season.name} is live — top the league
              </span>
            ) : (
              // Between seasons: say so rather than advertise a prize nobody can win.
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-white backdrop-blur">
                <Gift className="h-3.5 w-3.5" /> Next season starting soon
              </span>
            )}
            {top && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-white backdrop-blur">
                <Trophy className="h-3.5 w-3.5 text-accent-300" />
                Beat {top.name} — {top.score.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-white px-5 py-2.5 font-bold text-brand-700 shadow-md transition-transform group-hover:translate-x-0.5 sm:self-auto">
          Play now
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
