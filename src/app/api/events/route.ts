import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseTeamScoreSettings } from "@/lib/scoring";

const STATUS_ORDER = { active: 0, draft: 1, closed: 2 } as const;

export async function GET() {
  const events = await prisma.event.findMany({
    include: { _count: { select: { teams: true, jurors: true } } },
  });

  events.sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    const aDate = a.startedAt ?? a.createdAt;
    const bDate = b.startedAt ?? b.createdAt;
    return bDate.getTime() - aDate.getTime();
  });

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Event name is required." }, { status: 400 });
  }

  const settings = parseTeamScoreSettings({
    teamScoreBudget: body?.teamScoreBudget,
    teamScoreMaxPerTeam: body?.teamScoreMaxPerTeam,
    juryWeight: body?.juryWeight,
  });
  if (!settings.ok) {
    return NextResponse.json({ error: settings.error }, { status: 400 });
  }

  const event = await prisma.event.create({ data: { name, ...settings.settings } });
  return NextResponse.json({ event }, { status: 201 });
}
