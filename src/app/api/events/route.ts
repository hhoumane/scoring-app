import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseTeamScoreSettings } from "@/lib/scoring";

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { teams: true, jurors: true } } },
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
  });
  if (!settings.ok) {
    return NextResponse.json({ error: settings.error }, { status: 400 });
  }

  const event = await prisma.event.create({ data: { name, ...settings.settings } });
  return NextResponse.json({ event }, { status: 201 });
}
