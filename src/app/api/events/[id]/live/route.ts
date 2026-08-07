import { NextResponse } from "next/server";
import { getEventBreakdown } from "@/lib/eventData";

// Public, token-free payload for the projector screen. Rankings are only
// included once voting has closed so mid-vote standings can't influence
// jurors or teams who glance at the screen.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getEventBreakdown(id);
  if (!data) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({
    name: data.event.name,
    status: data.event.status,
    teamScoreBudget: data.event.teamScoreBudget,
    jurorCompletion: data.jurorCompletion,
    teamCompletion: data.teamCompletion,
    ranking: data.event.status === "closed" ? data.ranking : null,
  });
}
