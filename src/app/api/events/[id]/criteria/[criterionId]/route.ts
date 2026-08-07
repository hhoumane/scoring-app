import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; criterionId: string }> }
) {
  const { id: eventId, criterionId } = await params;

  const criterion = await prisma.criterion.findUnique({
    where: { id: criterionId },
    include: { event: true },
  });
  if (!criterion || criterion.eventId !== eventId) {
    return NextResponse.json({ error: "Criterion not found." }, { status: 404 });
  }
  if (criterion.event.status !== "draft") {
    return NextResponse.json(
      { error: "Criteria can only be removed while the event is in draft." },
      { status: 409 }
    );
  }

  await prisma.criterion.delete({ where: { id: criterionId } });
  return NextResponse.json({ ok: true });
}
