import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateTeamScoreSubmission } from "@/lib/scoring";

type Entry = { teamId: string; score: number };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json().catch(() => null);
  const entries: unknown = body?.scores;

  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "scores must be an array." }, { status: 400 });
  }

  const team = await prisma.team.findUnique({
    where: { token },
    include: { event: { include: { teams: true } } },
  });
  if (!team) {
    return NextResponse.json({ error: "Invalid link." }, { status: 404 });
  }
  if (team.event.status !== "active") {
    return NextResponse.json(
      { error: "Voting is not currently open for this event." },
      { status: 409 }
    );
  }

  const validTeamIds = new Set(
    team.event.teams.filter((t) => t.id !== team.id).map((t) => t.id)
  );

  const parsed: Entry[] = [];
  for (const raw of entries as unknown[]) {
    const e = raw as Partial<Entry>;
    if (typeof e.teamId !== "string" || typeof e.score !== "number") {
      return NextResponse.json({ error: "Invalid score entry." }, { status: 400 });
    }
    parsed.push({ teamId: e.teamId, score: e.score });
  }

  const validation = validateTeamScoreSubmission(
    team.id,
    parsed.map((e) => ({ toTeamId: e.teamId, score: e.score })),
    validTeamIds
  );
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.map((entry) =>
      prisma.teamScore.upsert({
        where: {
          fromTeamId_toTeamId: { fromTeamId: team.id, toTeamId: entry.teamId },
        },
        create: { fromTeamId: team.id, toTeamId: entry.teamId, score: entry.score },
        update: { score: entry.score },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
