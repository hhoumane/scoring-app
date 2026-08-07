"use client";

import { use, useCallback, useEffect, useState } from "react";

type Team = { id: string; name: string; token: string; manualRank: number | null };
type Juror = { id: string; name: string; token: string };
type Event = {
  id: string;
  name: string;
  status: "draft" | "active" | "closed";
  teamScoreBudget: number;
  teamScoreMaxPerTeam: number;
  teams: Team[];
  jurors: Juror[];
};
type RankedTeam = {
  id: string;
  name: string;
  avgJurorScore: number;
  totalTeamScore: number;
  finalScore: number;
  rank: number;
  tied: boolean;
  manualRank: number | null;
};
type Completion = { id: string; name: string; scoresSubmitted?: number; totalTeams?: number; pointsAssigned?: number };

type BreakdownData = {
  event: Event;
  ranking: RankedTeam[];
  jurorCompletion: Completion[];
  teamCompletion: Completion[];
};

function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<BreakdownData | null>(null);
  const [error, setError] = useState("");
  const [teamName, setTeamName] = useState("");
  const [jurorName, setJurorName] = useState("");
  const [tieInputs, setTieInputs] = useState<Record<string, string>>({});
  const [editingSettings, setEditingSettings] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [maxPerTeamInput, setMaxPerTeamInput] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${id}`);
    if (!res.ok) return;
    const json = await res.json();
    setData(json);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  useEffect(() => {
    if (data?.event.status !== "active") return;
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [data?.event.status, load]);

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    const res = await fetch(`/api/events/${id}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamName }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setTeamName("");
    setError("");
    load();
  }

  async function addJuror(e: React.FormEvent) {
    e.preventDefault();
    if (!jurorName.trim()) return;
    const res = await fetch(`/api/events/${id}/jurors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: jurorName }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setJurorName("");
    setError("");
    load();
  }

  async function startEvent() {
    setError("");
    const res = await fetch(`/api/events/${id}/start`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    load();
  }

  async function closeEvent() {
    if (!confirm("Close voting? Jurors and teams will no longer be able to submit or edit scores.")) return;
    setError("");
    const res = await fetch(`/api/events/${id}/close`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    load();
  }

  async function saveScoringSettings(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamScoreBudget: Number(budgetInput),
        teamScoreMaxPerTeam: Number(maxPerTeamInput),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setEditingSettings(false);
    load();
  }

  async function submitTieBreak(teamIds: string[]) {
    const ranks = teamIds
      .map((teamId) => ({ teamId, manualRank: Number(tieInputs[teamId]) }))
      .filter((r) => Number.isInteger(r.manualRank) && r.manualRank > 0);
    if (ranks.length === 0) return;
    const res = await fetch(`/api/events/${id}/tiebreak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ranks }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    load();
  }

  if (!data) {
    return <div className="mx-auto max-w-3xl flex-1 px-6 py-12 text-sm text-zinc-500">Loading…</div>;
  }

  const { event, ranking, jurorCompletion, teamCompletion } = data;

  const tiedGroups = new Map<number, RankedTeam[]>();
  for (const t of ranking) {
    if (!t.tied) continue;
    const group = tiedGroups.get(t.finalScore) ?? [];
    group.push(t);
    tiedGroups.set(t.finalScore, group);
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{event.name}</h1>
        <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium capitalize text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {event.status}
        </span>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 flex gap-3">
        {event.status === "draft" && (
          <button
            onClick={startEvent}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Start event
          </button>
        )}
        {event.status === "active" && (
          <button
            onClick={closeEvent}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Close voting
          </button>
        )}
      </div>

      <div className="mt-6 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
        {!editingSettings ? (
          <div className="flex items-center justify-between">
            <p className="text-zinc-700 dark:text-zinc-300">
              Team scoring: each team shares{" "}
              <span className="font-medium">{event.teamScoreBudget} points</span>, up to{" "}
              <span className="font-medium">{event.teamScoreMaxPerTeam}</span> per team.
            </p>
            {event.status === "draft" && (
              <button
                onClick={() => {
                  setBudgetInput(String(event.teamScoreBudget));
                  setMaxPerTeamInput(String(event.teamScoreMaxPerTeam));
                  setEditingSettings(true);
                }}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Edit
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={saveScoringSettings} className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              Points each team can share
              <input
                type="number"
                min={1}
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              Max points per team
              <input
                type="number"
                min={1}
                value={maxPerTeamInput}
                onChange={(e) => setMaxPerTeamInput(e.target.value)}
                className="w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingSettings(false)}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Teams</h2>
          {event.status === "draft" && (
            <form onSubmit={addTeam} className="mt-3 flex gap-2">
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team name"
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                Add
              </button>
            </form>
          )}
          <ul className="mt-3 flex flex-col gap-2">
            {event.teams.map((t) => {
              const completion = teamCompletion.find((c) => c.id === t.id);
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{t.name}</p>
                    <p className="text-xs text-zinc-500">
                      {completion?.pointsAssigned ?? 0}/{event.teamScoreBudget} points assigned
                    </p>
                  </div>
                  <CopyLink path={`/team/${t.token}`} />
                </li>
              );
            })}
            {event.teams.length === 0 && <p className="text-sm text-zinc-500">No teams yet.</p>}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Jurors</h2>
          {event.status === "draft" && (
            <form onSubmit={addJuror} className="mt-3 flex gap-2">
              <input
                value={jurorName}
                onChange={(e) => setJurorName(e.target.value)}
                placeholder="Juror name"
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                Add
              </button>
            </form>
          )}
          <ul className="mt-3 flex flex-col gap-2">
            {event.jurors.map((j) => {
              const completion = jurorCompletion.find((c) => c.id === j.id);
              return (
                <li
                  key={j.id}
                  className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{j.name}</p>
                    <p className="text-xs text-zinc-500">
                      {completion?.scoresSubmitted ?? 0}/{completion?.totalTeams ?? 0} teams scored
                    </p>
                  </div>
                  <CopyLink path={`/jury/${j.token}`} />
                </li>
              );
            })}
            {event.jurors.length === 0 && <p className="text-sm text-zinc-500">No jurors yet.</p>}
          </ul>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {event.status === "closed" ? "Final ranking" : "Live score breakdown"}
        </h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-2">Rank</th>
              <th className="py-2 pr-2">Team</th>
              <th className="py-2 pr-2">Avg juror score</th>
              <th className="py-2 pr-2">Team points</th>
              <th className="py-2 pr-2">Final score</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((t) => (
              <tr key={t.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2 pr-2 font-medium">
                  {t.rank}
                  {t.tied && (
                    <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      TIE
                    </span>
                  )}
                </td>
                <td className="py-2 pr-2">{t.name}</td>
                <td className="py-2 pr-2">{t.avgJurorScore.toFixed(2)}</td>
                <td className="py-2 pr-2">{t.totalTeamScore}</td>
                <td className="py-2 pr-2 font-semibold">{t.finalScore.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {event.status === "closed" && tiedGroups.size > 0 && (
        <section className="mt-10 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Break ties</h2>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            Assign a distinct rank number to each tied team below, then submit to resolve the tie.
          </p>
          {[...tiedGroups.entries()].map(([score, teams]) => (
            <div key={score} className="mt-4">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                Tied at final score {score.toFixed(2)}
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {teams.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="w-40 text-sm text-zinc-800 dark:text-zinc-200">{t.name}</span>
                    <input
                      type="number"
                      min={1}
                      placeholder="Rank"
                      defaultValue={t.manualRank ?? ""}
                      onChange={(e) =>
                        setTieInputs((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => submitTieBreak(teams.map((t) => t.id))}
                className="mt-3 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
              >
                Submit ranks for this group
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
