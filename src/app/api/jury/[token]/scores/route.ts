import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidJurorScore } from "@/lib/scoring";

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

  const juror = await prisma.juror.findUnique({
    where: { token },
    include: { event: { include: { teams: true } } },
  });
  if (!juror) {
    return NextResponse.json({ error: "Invalid link." }, { status: 404 });
  }
  if (juror.event.status !== "active") {
    return NextResponse.json(
      { error: "Voting is not currently open for this event." },
      { status: 409 }
    );
  }

  const validTeamIds = new Set(juror.event.teams.map((t) => t.id));
  const parsed: Entry[] = [];
  const seen = new Set<string>();
  for (const raw of entries as unknown[]) {
    const e = raw as Partial<Entry>;
    if (typeof e.teamId !== "string" || !validTeamIds.has(e.teamId)) {
      return NextResponse.json({ error: "Unknown team." }, { status: 400 });
    }
    if (seen.has(e.teamId)) {
      return NextResponse.json({ error: "Duplicate team entry." }, { status: 400 });
    }
    seen.add(e.teamId);
    if (typeof e.score !== "number" || !isValidJurorScore(e.score)) {
      return NextResponse.json(
        { error: "Score must be an integer between 0 and 100." },
        { status: 400 }
      );
    }
    parsed.push({ teamId: e.teamId, score: e.score });
  }

  await prisma.$transaction(
    parsed.map((entry) =>
      prisma.jurorScore.upsert({
        where: { jurorId_teamId: { jurorId: juror.id, teamId: entry.teamId } },
        create: { jurorId: juror.id, teamId: entry.teamId, score: entry.score },
        update: { score: entry.score },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
