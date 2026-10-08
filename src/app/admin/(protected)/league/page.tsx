"use client";

import { useCallback, useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import {
  adminListSeasons,
  adminOpenSeason,
  adminCloseSeason,
  type AdminSeason,
} from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { askConfirm } from "@/lib/confirm";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataGrid } from "@/components/admin/DataGrid";
import { col, actionCol, type ICellRendererParams } from "@/components/admin/gridHelpers";

// Game league admin: run seasons and see who won, so the giveaway the storefront
// advertises can actually be handed over. Closing a season freezes its winner on
// the season row — the result can't drift afterwards.
export default function AdminLeaguePage() {
  const [seasons, setSeasons] = useState<AdminSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [prize, setPrize] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    adminListSeasons()
      .then((d) => setSeasons(d.seasons ?? []))
      .catch(() => setSeasons([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const open = seasons.find((s) => s.ends_at === null) ?? null;

  async function startSeason() {
    if (!name.trim()) return;
    // Opening a season ends the running one and clears the standings.
    const warn = open
      ? `This ends "${open.name}", freezes its winner, and resets the league table.`
      : "This starts a new league season.";
    if (!(await askConfirm({ title: "Start a new season?", message: warn, confirmText: "Start season" }))) return;

    setBusy(true);
    try {
      await adminOpenSeason(name.trim(), prize.trim());
      setName("");
      setPrize("");
      toast.success("Season started");
      load();
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not start the season");
    } finally {
      setBusy(false);
    }
  }

  async function endSeason() {
    if (!open) return;
    if (
      !(await askConfirm({
        title: `End "${open.name}"?`,
        message: "The top scorer is recorded as the winner and the league table resets. This cannot be undone.",
        tone: "danger",
        confirmText: "End season",
      }))
    )
      return;
    setBusy(true);
    try {
      await adminCloseSeason();
      toast.success("Season closed");
      load();
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not close the season");
    } finally {
      setBusy(false);
    }
  }

  const columnDefs = [
    col<AdminSeason>("name", "Season", {
      minWidth: 170,
      cellRenderer: (p: ICellRendererParams<AdminSeason>) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">{p.value}</span>
          {p.data?.ends_at === null && <Badge tone="success">Running</Badge>}
        </div>
      ),
    }),
    col<AdminSeason>("prize", "Prize", {
      minWidth: 170,
      cellRenderer: (p: ICellRendererParams<AdminSeason>) => (
        <span className="text-muted">{p.value || "—"}</span>
      ),
    }),
    col<AdminSeason>("players", "Players", {
      maxWidth: 110,
      cellRenderer: (p: ICellRendererParams<AdminSeason>) => <span className="text-muted">{p.value}</span>,
    }),
    col<AdminSeason>("starts_at", "Ran", {
      minWidth: 190,
      cellRenderer: (p: ICellRendererParams<AdminSeason>) => (
        <span className="text-muted">
          {formatDate(String(p.value))} → {p.data?.ends_at ? formatDate(p.data.ends_at) : "now"}
        </span>
      ),
    }),
    // The point of the screen: who to contact, and what they scored.
    actionCol<AdminSeason>("Winner", (s) =>
      s.ends_at === null ? (
        <span className="text-xs text-muted">in progress</span>
      ) : s.winner_customer_id ? (
        <div className="text-right leading-tight">
          <div className="font-semibold text-ink">{s.winner_name?.trim() || "Runner"}</div>
          <div className="text-xs text-muted">
            {s.winner_phone ?? "no phone"} · {s.winner_score} pts
          </div>
        </div>
      ) : (
        <span className="text-xs text-muted">nobody played</span>
      ),
      { minWidth: 200 },
    ),
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Game league"
        subtitle="Seasons and winners for Ooty Bites Dash"
        breadcrumbs={[{ label: "Game league" }]}
        action={
          open ? (
            <Button variant="danger" onClick={endSeason} loading={busy}>
              End “{open.name}”
            </Button>
          ) : null
        }
      />

      <div className="mb-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="flex items-center gap-2 font-display font-bold text-ink">
          <Trophy className="h-4 w-4 text-accent-500" /> Start a season
        </h2>
        <p className="mt-1 text-sm text-muted">
          {open
            ? `“${open.name}” is running. Starting a new season ends it, records its winner and resets the table.`
            : "No season is running — the storefront is not advertising a prize right now."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input label="Season name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Diwali Season" />
          <Input
            label="Prize"
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            placeholder="A Nilgiri hamper"
          />
          <Button onClick={startSeason} loading={busy} disabled={!name.trim()}>
            Start season
          </Button>
        </div>
      </div>

      <DataGrid<AdminSeason>
        rowData={seasons}
        columnDefs={columnDefs}
        getRowId={(s) => s.id}
        sortable
        pagination
        pageSize={10}
        emptyText="No seasons yet — start the first one above."
      />
    </div>
  );
}
