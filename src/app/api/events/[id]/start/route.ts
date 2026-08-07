import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { teams: true, jurors: true } } },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  if (event.status !== "draft") {
    return NextResponse.json(
      { error: "Only a draft event can be started." },
      { status: 409 }
    );
  }
  if (event._count.teams < 1 || event._count.jurors < 1) {
    return NextResponse.json(
      { error: "Add at least one team and one juror before starting." },
      { status: 409 }
    );
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { status: "active", startedAt: new Date() },
  });
  return NextResponse.json({ event: updated });
}
