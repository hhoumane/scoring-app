import { NextResponse } from "next/server";
import { getEventBreakdown } from "@/lib/eventData";

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
