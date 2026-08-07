import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type TiebreakEntry = { teamId: string; manualRank: number };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const body = await req.json().catch(() => null);
  const entries: unknown = body?.ranks;

  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "ranks must be an array." }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { teams: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  if (event.status !== "closed") {
    return NextResponse.json(
      { error: "Tie-breaks can only be set after voting is closed." },
      { status: 409 }
    );
  }

  const validTeamIds = new Set(event.teams.map((t) => t.id));
  const parsed: TiebreakEntry[] = [];
  for (const raw of entries as unknown[]) {
    const e = raw as Partial<TiebreakEntry>;
    if (
      typeof e.teamId !== "string" ||
      !validTeamIds.has(e.teamId) ||
      typeof e.manualRank !== "number" ||
      !Number.isInteger(e.manualRank) ||
      e.manualRank < 1
    ) {
      return NextResponse.json({ error: "Invalid tie-break entry." }, { status: 400 });
    }
    parsed.push({ teamId: e.teamId, manualRank: e.manualRank });
  }

  await prisma.$transaction(
    parsed.map((entry) =>
      prisma.team.update({
        where: { id: entry.teamId },
        data: { manualRank: entry.manualRank },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
