"use client";

import { use, useEffect, useState } from "react";

type Team = { id: string; name: string };
type JuryData = {
  juror: { id: string; name: string };
  event: { id: string; name: string; status: "draft" | "active" | "closed" };
  teams: Team[];
  scores: Record<string, number>;
};

export default function JuryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<JuryData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/jury/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const json: JuryData = await res.json();
        setData(json);
        setScores(
          Object.fromEntries(
            Object.entries(json.scores).map(([teamId, score]) => [teamId, String(score)])
          )
        );
      })
      .catch(() => setNotFound(true));
  }, [token]);

  async function save() {
    if (!data) return;
    setStatus("saving");
    setError("");
    const entries = Object.entries(scores)
      .filter(([, v]) => v !== "")
      .map(([teamId, v]) => ({ teamId, score: Number(v) }));

    const res = await fetch(`/api/jury/${token}/scores`, {
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

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{data.event.name}</p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Welcome, {data.juror.name}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Give each team a score out of 100.
      </p>

      {locked && (
        <p className="mt-4 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          {data.event.status === "draft"
            ? "Voting hasn't started yet."
            : "Voting is closed. Scores can no longer be changed."}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {data.teams.map((team) => (
          <div key={team.id} className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {team.name}
            </label>
            <input
              type="number"
              min={0}
              max={100}
              disabled={locked}
              value={scores[team.id] ?? ""}
              onChange={(e) =>
                setScores((prev) => ({ ...prev, [team.id]: e.target.value }))
              }
              className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:disabled:bg-zinc-950"
            />
          </div>
        ))}
        {data.teams.length === 0 && (
          <p className="text-sm text-zinc-500">No teams have been added yet.</p>
        )}
      </div>

      {!locked && (
        <button
          onClick={save}
          disabled={status === "saving"}
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
