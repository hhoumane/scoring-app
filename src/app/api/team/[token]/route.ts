import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const team = await prisma.team.findUnique({
    where: { token },
    include: {
      event: { include: { teams: { orderBy: { name: "asc" } } } },
      teamScoresGiven: true,
    },
  });

  if (!team) {
    return NextResponse.json({ error: "Invalid link." }, { status: 404 });
  }

  const scoresByTeamId = Object.fromEntries(
    team.teamScoresGiven.map((s) => [s.toTeamId, s.score])
  );

  return NextResponse.json({
    team: { id: team.id, name: team.name },
    event: { id: team.event.id, name: team.event.name, status: team.event.status },
    otherTeams: team.event.teams
      .filter((t) => t.id !== team.id)
      .map((t) => ({ id: t.id, name: t.name })),
    scores: scoresByTeamId,
  });
}
