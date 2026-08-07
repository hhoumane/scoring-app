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

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
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

      <form onSubmit={createEvent} className="mt-6 flex gap-2">
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
          <Link
            key={ev.id}
            href={`/admin/events/${ev.id}`}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{ev.name}</p>
              <p className="text-xs text-zinc-500">
                {ev._count.teams} teams · {ev._count.jurors} jurors
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[ev.status]}`}
            >
              {ev.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
