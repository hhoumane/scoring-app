import { prisma } from "@/lib/db";
import { computeRanking, type RankedTeam } from "@/lib/scoring";

export async function getEventBreakdown(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      teams: {
        include: {
          jurorScoresReceived: true,
          teamScoresReceived: true,
        },
      },
      jurors: true,
      criteria: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!event) return null;

  const jurorScoresByTeam = new Map<string, number[]>();
  const teamScoresByTeam = new Map<string, number[]>();

  for (const team of event.teams) {
    jurorScoresByTeam.set(
      team.id,
      team.jurorScoresReceived.map((s) => s.score)
    );
    teamScoresByTeam.set(
      team.id,
      team.teamScoresReceived.map((s) => s.score)
    );
  }

  const ranking: RankedTeam[] = computeRanking(
    event.teams.map((t) => ({
      id: t.id,
      name: t.name,
      manualRank: t.manualRank,
    })),
    jurorScoresByTeam,
    teamScoresByTeam,
    event.juryWeight,
    event.teamScoreMaxPerTeam
  );

  const jurorCompletion = event.jurors.map((juror) => ({
    id: juror.id,
    name: juror.name,
    scoresSubmitted: event.teams.filter((t) =>
      t.jurorScoresReceived.some((s) => s.jurorId === juror.id)
    ).length,
    totalTeams: event.teams.length,
  }));

  const teamCompletion = event.teams.map((team) => ({
    id: team.id,
    name: team.name,
    pointsAssigned: prismaSumGiven(event.teams, team.id),
    hasVoted: event.teams.some((t) =>
      t.teamScoresReceived.some((s) => s.fromTeamId === team.id)
    ),
  }));

  return { event, ranking, jurorCompletion, teamCompletion };
}

function prismaSumGiven(
  teams: { id: string; teamScoresReceived: { fromTeamId: string; score: number }[] }[],
  fromTeamId: string
) {
  let total = 0;
  for (const team of teams) {
    for (const s of team.teamScoresReceived) {
      if (s.fromTeamId === fromTeamId) total += s.score;
    }
  }
  return total;
}
