"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type EventSummary = {
  id: string;
  name: string;
  status: "draft" | "active" | "closed";
  createdAt: string;
  _count: { teams: number; jurors: number };
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function AdminPage() {
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [name, setName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [teamScoreBudget, setTeamScoreBudget] = useState("50");
  const [teamScoreMaxPerTeam, setTeamScoreMaxPerTeam] = useState("20");
  const [juryWeight, setJuryWeight] = useState("70");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/events");
    const data = await res.json();
    setEvents(data.events);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, []);

  async function deleteEvent(ev: EventSummary) {
    if (
      !confirm(
        `Delete "${ev.name}"? This permanently removes its teams, jurors, and all scores.`
      )
    )
      return;
    const res = await fetch(`/api/events/${ev.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    load();
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        teamScoreBudget: Number(teamScoreBudget),
        teamScoreMaxPerTeam: Number(teamScoreMaxPerTeam),
        juryWeight: Number(juryWeight),
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setName("");
    load();
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Organizer Dashboard
      </h1>

      <form onSubmit={createEvent} className="mt-6">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New event name"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Create event
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className="mt-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {showSettings ? "Hide" : "Customize"} team scoring rules
        </button>

        {showSettings && (
          <div className="mt-3 flex flex-wrap items-end gap-4 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              Points each team can share
              <input
                type="number"
                min={1}
                value={teamScoreBudget}
                onChange={(e) => setTeamScoreBudget(e.target.value)}
                className="w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              Max points per team
              <input
                type="number"
                min={1}
                value={teamScoreMaxPerTeam}
                onChange={(e) => setTeamScoreMaxPerTeam(e.target.value)}
                className="w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              Jury weight % (teams get the rest)
              <input
                type="number"
                min={0}
                max={100}
                value={juryWeight}
                onChange={(e) => setJuryWeight(e.target.value)}
                className="w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          </div>
        )}
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-8 flex flex-col gap-3">
        {events === null && (
          <p className="text-sm text-zinc-500">Loading…</p>
        )}
        {events?.length === 0 && (
          <p className="text-sm text-zinc-500">No events yet. Create one above.</p>
        )}
        {events?.map((ev) => (
          <div
            key={ev.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <Link href={`/admin/events/${ev.id}`} className="flex-1">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{ev.name}</p>
              <p className="text-xs text-zinc-500">
                {ev._count.teams} teams · {ev._count.jurors} jurors
              </p>
            </Link>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[ev.status]}`}
              >
                {ev.status}
              </span>
              <button
                onClick={() => deleteEvent(ev)}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
