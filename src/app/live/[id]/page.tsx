"use client";

import { use, useCallback, useEffect, useState } from "react";

type JurorProgress = {
  id: string;
  name: string;
  scoresSubmitted: number;
  totalTeams: number;
};
type TeamProgress = {
  id: string;
  name: string;
  pointsAssigned: number;
  hasVoted: boolean;
};
type Ranked = {
  id: string;
  name: string;
  avgJurorScore: number;
  totalTeamScore: number;
  finalScore: number;
  rank: number;
  tied: boolean;
};
type LiveData = {
  name: string;
  status: "draft" | "active" | "closed";
  teamScoreBudget: number;
  jurorCompletion: JurorProgress[];
  teamCompletion: TeamProgress[];
  ranking: Ranked[] | null;
};

const RANK_STYLES: Record<number, string> = {
  1: "text-amber-500",
  2: "text-zinc-400",
  3: "text-amber-700",
};

export default function LiveScreenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<LiveData | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${id}/live`);
    if (!res.ok) {
      setNotFound(true);
      return;
    }
    setData(await res.json());
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  useEffect(() => {
    if (data?.status === "closed") return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [data?.status, load]);

  if (notFound) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="text-xl text-zinc-500">This event could not be found.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="text-xl text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {data.name}
        </h1>
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-wide ${
            data.status === "active"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : data.status === "closed"
                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {data.status === "active" ? "Voting open" : data.status === "closed" ? "Final results" : "Starting soon"}
        </span>
      </div>

      {data.status === "draft" && (
        <p className="mt-24 text-center text-3xl text-zinc-500">
          Voting hasn&apos;t started yet.
        </p>
      )}

      {data.status === "active" && (
        <>
          <div className="mt-12 grid gap-12 sm:grid-cols-2">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
                Jury progress
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {data.jurorCompletion.map((j) => {
                  const done = j.totalTeams > 0 && j.scoresSubmitted >= j.totalTeams;
                  return (
                    <li key={j.id} className="flex items-center justify-between text-2xl">
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {j.name}
                      </span>
                      <span className={done ? "font-semibold text-green-600" : "text-zinc-500"}>
                        {done ? "✓ done" : `${j.scoresSubmitted}/${j.totalTeams}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
                Team voting
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {data.teamCompletion.map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-2xl">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">{t.name}</span>
                    <span
                      className={
                        t.hasVoted ? "font-semibold text-green-600" : "text-zinc-500"
                      }
                    >
                      {t.hasVoted
                        ? `✓ ${t.pointsAssigned}/${data.teamScoreBudget} pts`
                        : "waiting"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <p className="mt-16 text-center text-lg text-zinc-500">
            Results will be revealed when voting closes.
          </p>
        </>
      )}

      {data.status === "closed" && data.ranking && (
        <ol className="mt-12 flex flex-col gap-4">
          {data.ranking.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-6 rounded-xl border border-zinc-200 px-6 py-5 dark:border-zinc-800"
            >
              <span
                className={`w-16 text-5xl font-bold tabular-nums ${
                  RANK_STYLES[t.rank] ?? "text-zinc-500"
                }`}
              >
                {t.rank}
              </span>
              <span className="flex-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                {t.name}
                {t.tied && (
                  <span className="ml-3 align-middle rounded bg-amber-100 px-2 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    TIE
                  </span>
                )}
              </span>
              <span className="text-right">
                <span className="block text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {t.finalScore.toFixed(2)}
                </span>
                <span className="block text-sm text-zinc-500">
                  jury {t.avgJurorScore.toFixed(1)} + teams {t.totalTeamScore}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
