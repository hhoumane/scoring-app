import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Team name is required." }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  if (event.status !== "draft") {
    return NextResponse.json(
      { error: "Teams can only be added while the event is in draft." },
      { status: 409 }
    );
  }

  const existing = await prisma.team.findUnique({
    where: { eventId_name: { eventId, name } },
  });
  if (existing) {
    return NextResponse.json({ error: "A team with this name already exists." }, { status: 409 });
  }

  const team = await prisma.team.create({ data: { eventId, name } });
  return NextResponse.json({ team }, { status: 201 });
}
