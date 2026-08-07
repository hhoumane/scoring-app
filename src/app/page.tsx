import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-6 px-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Scoring Platform
        </h1>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          Create events, invite jurors and teams to vote, and track live
          rankings.
        </p>
        <Link
          href="/admin"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Go to Organizer Dashboard
        </Link>
      </main>
    </div>
  );
}
