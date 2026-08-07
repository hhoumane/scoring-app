"use client";

import { use, useEffect, useMemo, useState } from "react";

const BUDGET = 50;
const MAX_PER_TEAM = 20;

type OtherTeam = { id: string; name: string };
type TeamData = {
  team: { id: string; name: string };
  event: { id: string; name: string; status: "draft" | "active" | "closed" };
  otherTeams: OtherTeam[];
  scores: Record<string, number>;
};

export default function TeamPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<TeamData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/team/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const json: TeamData = await res.json();
        setData(json);
        setScores(
          Object.fromEntries(
            Object.entries(json.scores).map(([teamId, score]) => [teamId, String(score)])
          )
        );
      })
      .catch(() => setNotFound(true));
  }, [token]);

  const total = useMemo(
    () => Object.values(scores).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [scores]
  );
  const remaining = BUDGET - total;

  async function save() {
    if (!data) return;
    setStatus("saving");
    setError("");
    const entries = data.otherTeams.map((t) => ({
      teamId: t.id,
      score: Number(scores[t.id] || 0),
    }));

    const res = await fetch(`/api/team/${token}/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores: entries }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatus("error");
      setError(json.error ?? "Something went wrong.");
      return;
    }
    setStatus("saved");
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-md flex-1 px-6 py-16 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          This link is invalid. Double-check the URL you were given.
        </p>
      </div>
    );
  }

  if (!data) {
    return <div className="mx-auto max-w-md flex-1 px-6 py-16 text-sm text-zinc-500">Loading…</div>;
  }

  const locked = data.event.status !== "active";
  const over = remaining < 0;

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{data.event.name}</p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {data.team.name}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        You have {BUDGET} points to distribute among other teams, up to {MAX_PER_TEAM} points
        per team.
      </p>

      {locked && (
        <p className="mt-4 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          {data.event.status === "draft"
            ? "Voting hasn't started yet."
            : "Voting is closed. Scores can no longer be changed."}
        </p>
      )}

      {!locked && (
        <p
          className={`mt-4 text-sm font-medium ${over ? "text-red-600" : "text-zinc-700 dark:text-zinc-300"}`}
        >
          {remaining} of {BUDGET} points remaining
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {data.otherTeams.map((team) => (
          <div key={team.id} className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {team.name}
            </label>
            <input
              type="number"
              min={0}
              max={MAX_PER_TEAM}
              disabled={locked}
              value={scores[team.id] ?? ""}
              onChange={(e) =>
                setScores((prev) => ({ ...prev, [team.id]: e.target.value }))
              }
              className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:disabled:bg-zinc-950"
            />
          </div>
        ))}
        {data.otherTeams.length === 0 && (
          <p className="text-sm text-zinc-500">No other teams to score yet.</p>
        )}
      </div>

      {!locked && (
        <button
          onClick={save}
          disabled={status === "saving" || over}
          className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {status === "saving" ? "Saving…" : "Save scores"}
        </button>
      )}
      {status === "saved" && (
        <p className="mt-2 text-sm text-green-600">Scores saved.</p>
      )}
      {status === "error" && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
