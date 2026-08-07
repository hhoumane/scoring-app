import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEventBreakdown } from "@/lib/eventData";
import { parseTeamScoreSettings } from "@/lib/scoring";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getEventBreakdown(id);
  if (!data) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  if (event.status !== "draft") {
    return NextResponse.json(
      { error: "Team scoring settings can only be changed while the event is in draft." },
      { status: 409 }
    );
  }

  const settings = parseTeamScoreSettings(
    {
      teamScoreBudget: body?.teamScoreBudget,
      teamScoreMaxPerTeam: body?.teamScoreMaxPerTeam,
    },
    { teamScoreBudget: event.teamScoreBudget, teamScoreMaxPerTeam: event.teamScoreMaxPerTeam }
  );
  if (!settings.ok) {
    return NextResponse.json({ error: settings.error }, { status: 400 });
  }

  const updated = await prisma.event.update({
    where: { id },
    data: settings.settings,
  });
  return NextResponse.json({ event: updated });
}
