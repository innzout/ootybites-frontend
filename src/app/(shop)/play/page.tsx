"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Trophy, Gamepad2, Gift } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getGameHighScore, getGameSeason, startGameRun, submitGameScore, type GameSeason } from "@/lib/endpoints";
import { Leaderboard } from "@/components/game/Leaderboard";
import { Spinner } from "@/components/ui/Spinner";

// The canvas game is client-only (it touches window/canvas) — never SSR it.
const RunnerGame = dynamic(() => import("@/components/game/RunnerGame").then((m) => m.RunnerGame), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-3xl border border-line bg-[#cfe6da]"
      style={{ aspectRatio: "900 / 340" }}
    >
      <Spinner />
    </div>
  ),
});

const GUEST_KEY = "ob_game_best";

export default function PlayPage() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  // Ticket for the run in progress. Opened when the player starts, spent when
  // the score is submitted; a run with no ticket is rejected by the server.
  const ticketRef = useRef<string | null>(null);

  // Which league this run counts towards. Null between seasons.
  useEffect(() => {
    getGameSeason()
      .then((d) => setSeason(d.season))
      .catch(() => setSeason(null))
      .finally(() => setSeasonLoaded(true));
  }, []);

  const onStart = useCallback(() => {
    ticketRef.current = null;
    if (!isAuthed) return;
    startGameRun()
      .then((d) => {
        ticketRef.current = d.ticket;
      })
      .catch(() => {});
  }, [isAuthed]);
  const [highScore, setHighScore] = useState(0);
  const [season, setSeason] = useState<GameSeason | null>(null);
  const [seasonLoaded, setSeasonLoaded] = useState(false);
  const [rank, setRank] = useState<number | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load the stored best — from the server when signed in, else device-local.
  useEffect(() => {
    if (isAuthed) {
      getGameHighScore()
        .then((d) => {
          setHighScore(d.high_score ?? 0);
          setRank(d.rank || undefined);
        })
        .catch(() => {});
    } else if (typeof window !== "undefined") {
      setHighScore(Number(localStorage.getItem(GUEST_KEY) || 0));
    }
  }, [isAuthed]);

  // Persist a finished run (server for members, localStorage for guests).
  const onSubmit = useCallback(
    (score: number) => {
      if (isAuthed) {
        const ticket = ticketRef.current;
        ticketRef.current = null; // one ticket per run
        if (!ticket) return; // run was not opened server-side; nothing to record
        submitGameScore(score, ticket)
          .then((d) => {
            setHighScore(d.high_score ?? score);
            setRefreshKey((k) => k + 1); // refresh the league table
            return getGameHighScore();
          })
          .then((d) => setRank(d.rank || undefined))
          .catch(() => {});
      } else {
        const local = Number(localStorage.getItem(GUEST_KEY) || 0);
        if (score > local) {
          localStorage.setItem(GUEST_KEY, String(score));
          setHighScore(score);
        }
      }
    },
    [isAuthed],
  );

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-500">
            <Gamepad2 className="h-4 w-4" /> Ootybites Arcade
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-ink sm:text-3xl">Ooty Bites Dash</h1>
          <p className="mt-1 text-sm text-muted">
            Run the delivery route through the Nilgiris — press Space to jump and collect the goods.
          </p>
          {/* Say what is actually at stake. The board resets each season, so a
              new player is never looking at an unbeatable all-time record. */}
          {seasonLoaded && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Gift className="h-3.5 w-3.5" />
              {season
                ? season.prize
                  ? `${season.name} — top the league to win ${season.prize}`
                  : `${season.name} is live`
                : "Between seasons — scores still count towards your personal best"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 shadow-sm">
          <Trophy className="h-4 w-4 text-accent-500" />
          <span className="text-sm font-semibold text-ink">
            Best <span className="text-brand-700">{highScore}</span>
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <RunnerGame highScore={highScore} onStart={onStart} onSubmit={onSubmit} />
          {!isAuthed && (
            <p className="mt-4 text-center text-sm text-muted">
              <Link href="/login" className="font-semibold text-brand-600 hover:underline">
                Sign in
              </Link>{" "}
              to save your score and enter the league.
            </p>
          )}
        </div>
        <Leaderboard refreshKey={refreshKey} myRank={rank} />
      </div>
    </section>
  );
}
