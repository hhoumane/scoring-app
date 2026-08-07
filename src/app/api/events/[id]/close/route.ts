import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  if (event.status !== "active") {
    return NextResponse.json(
      { error: "Only an active event can be closed." },
      { status: 409 }
    );
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { status: "closed", closedAt: new Date() },
  });
  return NextResponse.json({ event: updated });
}
