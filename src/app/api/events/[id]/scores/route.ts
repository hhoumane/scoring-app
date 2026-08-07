import { NextResponse } from "next/server";
import { getEventBreakdown } from "@/lib/eventData";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const data = await getEventBreakdown(eventId);
  if (!data) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  return NextResponse.json({
    ranking: data.ranking,
    jurorCompletion: data.jurorCompletion,
    teamCompletion: data.teamCompletion,
    eventStatus: data.event.status,
  });
}
