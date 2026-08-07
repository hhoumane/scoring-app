export const JUROR_SCORE_MIN = 0;
export const JUROR_SCORE_MAX = 100;

export const DEFAULT_TEAM_SCORE_BUDGET = 50;
export const DEFAULT_TEAM_SCORE_MAX_PER_TARGET = 20;
export const DEFAULT_JURY_WEIGHT = 70;

export function isValidJurorScore(score: number): boolean {
  return (
    Number.isInteger(score) &&
    score >= JUROR_SCORE_MIN &&
    score <= JUROR_SCORE_MAX
  );
}

export function isValidTeamScoreValue(score: number, maxPerTarget: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= maxPerTarget;
}

export type TeamScoreSettings = {
  teamScoreBudget: number;
  teamScoreMaxPerTeam: number;
  juryWeight: number;
};

export type TeamScoreSettingsResult =
  | { ok: true; settings: TeamScoreSettings }
  | { ok: false; error: string };

/** Validates organizer-supplied team-scoring settings, falling back to `fallback` when omitted. */
export function parseTeamScoreSettings(
  input: { teamScoreBudget?: unknown; teamScoreMaxPerTeam?: unknown; juryWeight?: unknown },
  fallback: TeamScoreSettings = {
    teamScoreBudget: DEFAULT_TEAM_SCORE_BUDGET,
    teamScoreMaxPerTeam: DEFAULT_TEAM_SCORE_MAX_PER_TARGET,
    juryWeight: DEFAULT_JURY_WEIGHT,
  }
): TeamScoreSettingsResult {
  const budget =
    input.teamScoreBudget === undefined ? fallback.teamScoreBudget : input.teamScoreBudget;
  const maxPerTeam =
    input.teamScoreMaxPerTeam === undefined
      ? fallback.teamScoreMaxPerTeam
      : input.teamScoreMaxPerTeam;
  const juryWeight =
    input.juryWeight === undefined ? fallback.juryWeight : input.juryWeight;

  if (typeof budget !== "number" || !Number.isInteger(budget) || budget < 1) {
    return { ok: false, error: "Team point budget must be a positive integer." };
  }
  if (typeof maxPerTeam !== "number" || !Number.isInteger(maxPerTeam) || maxPerTeam < 1) {
    return { ok: false, error: "Max points per team must be a positive integer." };
  }
  if (maxPerTeam > budget) {
    return {
      ok: false,
      error: "Max points per team cannot be greater than the total point budget.",
    };
  }
  if (
    typeof juryWeight !== "number" ||
    !Number.isInteger(juryWeight) ||
    juryWeight < 0 ||
    juryWeight > 100
  ) {
    return { ok: false, error: "Jury weight must be an integer between 0 and 100." };
  }

  return {
    ok: true,
    settings: { teamScoreBudget: budget, teamScoreMaxPerTeam: maxPerTeam, juryWeight },
  };
}

export type TeamScoreEntry = { toTeamId: string; score: number };

export type TeamScoreValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/** Validates a full set of scores one team assigns to the other teams. */
export function validateTeamScoreSubmission(
  fromTeamId: string,
  entries: TeamScoreEntry[],
  validTeamIds: Set<string>,
  budget: number,
  maxPerTarget: number
): TeamScoreValidationResult {
  const seen = new Set<string>();
  let total = 0;

  for (const entry of entries) {
    if (entry.toTeamId === fromTeamId) {
      return { ok: false, error: "A team cannot assign a score to itself." };
    }
    if (!validTeamIds.has(entry.toTeamId)) {
      return { ok: false, error: "Unknown target team." };
    }
    if (seen.has(entry.toTeamId)) {
      return { ok: false, error: "Duplicate score entry for the same team." };
    }
    seen.add(entry.toTeamId);

    if (!isValidTeamScoreValue(entry.score, maxPerTarget)) {
      return {
        ok: false,
        error: `Score must be an integer between 0 and ${maxPerTarget}.`,
      };
    }
    total += entry.score;
  }

  if (total !== budget) {
    return {
      ok: false,
      error: `You must assign your entire ${budget}-point budget (currently ${total}).`,
    };
  }

  return { ok: true };
}

export type RankableTeam = {
  id: string;
  name: string;
  manualRank: number | null;
};

export type RankedTeam = {
  id: string;
  name: string;
  avgJurorScore: number;
  avgTeamScore: number;
  finalScore: number;
  rank: number;
  tied: boolean;
  manualRank: number | null;
};

/**
 * Final score = juryWeight% of the jury average (0-100) plus the remaining
 * weight applied to the participants' average, normalized from its
 * 0-maxPerTeam scale to 0-100 so the weights mean what they say.
 * Ties (identical finalScore) share a rank unless a manualRank has been set by the
 * organizer to break the tie, in which case manualRank takes precedence for ordering.
 */
export function computeRanking(
  teams: RankableTeam[],
  jurorScoresByTeam: Map<string, number[]>,
  teamScoresByTeam: Map<string, number[]>,
  juryWeight: number,
  teamScoreMaxPerTeam: number
): RankedTeam[] {
  const average = (values: number[]) =>
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  const scored = teams.map((team) => {
    const avgJurorScore = average(jurorScoresByTeam.get(team.id) ?? []);
    const avgTeamScore = average(teamScoresByTeam.get(team.id) ?? []);
    const normalizedTeamScore =
      teamScoreMaxPerTeam > 0 ? (avgTeamScore / teamScoreMaxPerTeam) * 100 : 0;
    const finalScore =
      (juryWeight / 100) * avgJurorScore +
      ((100 - juryWeight) / 100) * normalizedTeamScore;
    return {
      id: team.id,
      name: team.name,
      avgJurorScore,
      avgTeamScore,
      finalScore,
      manualRank: team.manualRank,
    };
  });

  // Sort by manualRank first (when present) as tie-break, then by finalScore desc.
  const sorted = [...scored].sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (a.manualRank != null && b.manualRank != null) {
      return a.manualRank - b.manualRank;
    }
    if (a.manualRank != null) return -1;
    if (b.manualRank != null) return 1;
    return 0;
  });

  // Group teams by finalScore to detect ties and check whether the organizer
  // has fully resolved a group with distinct manual ranks.
  const groups = new Map<number, typeof sorted>();
  for (const t of sorted) {
    const group = groups.get(t.finalScore) ?? [];
    group.push(t);
    groups.set(t.finalScore, group);
  }
  const tiedIds = new Set<string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const fullyResolved =
      group.every((t) => t.manualRank != null) &&
      new Set(group.map((t) => t.manualRank)).size === group.length;
    if (!fullyResolved) {
      for (const t of group) tiedIds.add(t.id);
    }
  }

  const result: RankedTeam[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const team = sorted[i];
    const prev = sorted[i - 1];
    const samePosition =
      prev !== undefined &&
      prev.finalScore === team.finalScore &&
      tiedIds.has(team.id);
    const rank = samePosition ? result[i - 1].rank : i + 1;
    result.push({ ...team, rank, tied: tiedIds.has(team.id) });
  }

  return result;
}
