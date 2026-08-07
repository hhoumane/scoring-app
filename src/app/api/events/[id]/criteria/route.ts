import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const percentage = body?.percentage;

  if (!name) {
    return NextResponse.json({ error: "Criterion name is required." }, { status: 400 });
  }
  if (typeof percentage !== "number" || !Number.isInteger(percentage) || percentage < 1 || percentage > 100) {
    return NextResponse.json(
      { error: "Percentage must be an integer between 1 and 100." },
      { status: 400 }
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { criteria: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  if (event.status !== "draft") {
    return NextResponse.json(
      { error: "Criteria can only be added while the event is in draft." },
      { status: 409 }
    );
  }

  const existingTotal = event.criteria.reduce((sum, c) => sum + c.percentage, 0);
  if (existingTotal + percentage > 100) {
    return NextResponse.json(
      {
        error: `Percentages can't exceed 100 total (already at ${existingTotal}, ${
          100 - existingTotal
        } left).`,
      },
      { status: 409 }
    );
  }

  const existingName = event.criteria.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  if (existingName) {
    return NextResponse.json(
      { error: "A criterion with this name already exists." },
      { status: 409 }
    );
  }

  const criterion = await prisma.criterion.create({
    data: { eventId, name, percentage },
  });
  return NextResponse.json({ criterion }, { status: 201 });
}
