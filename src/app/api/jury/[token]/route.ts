import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const juror = await prisma.juror.findUnique({
    where: { token },
    include: {
      event: {
        include: {
          teams: { orderBy: { name: "asc" } },
          criteria: { orderBy: { createdAt: "asc" } },
        },
      },
      scores: true,
    },
  });

  if (!juror) {
    return NextResponse.json({ error: "Invalid link." }, { status: 404 });
  }

  const scoresByTeamId = Object.fromEntries(
    juror.scores.map((s) => [s.teamId, s.score])
  );

  return NextResponse.json({
    juror: { id: juror.id, name: juror.name },
    event: { id: juror.event.id, name: juror.event.name, status: juror.event.status },
    teams: juror.event.teams.map((t) => ({ id: t.id, name: t.name })),
    criteria: juror.event.criteria.map((c) => ({ id: c.id, name: c.name, percentage: c.percentage })),
    scores: scoresByTeamId,
  });
}
