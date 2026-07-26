import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const MAX_MESSAGE_LEN = 2000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { status, message, shareToken } = body;

  if (!status || !["approved", "changes_requested"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (!shareToken) {
    return NextResponse.json({ error: "Share token required" }, { status: 400 });
  }

  if (message != null && (typeof message !== "string" || message.length > MAX_MESSAGE_LEN)) {
    return NextResponse.json(
      { error: `Message must be text under ${MAX_MESSAGE_LEN} characters` },
      { status: 400 }
    );
  }

  // Throttle responses per share link + IP so a public estimate can't be flooded.
  if (!rateLimit(`respond:${shareToken}:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many responses. Please wait a bit before trying again." },
      { status: 429 }
    );
  }

  const estimate = await prisma.estimate.findUnique({ where: { id } });

  if (!estimate || estimate.shareToken !== shareToken) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Once approved, the estimate is locked — no further responses or status flips.
  if (estimate.status === "approved") {
    return NextResponse.json(
      { error: "This estimate has already been approved." },
      { status: 409 }
    );
  }

  // Record the response and update the estimate status atomically.
  await prisma.$transaction([
    prisma.customerResponse.create({
      data: {
        estimateId: id,
        status,
        message: message || "",
      },
    }),
    prisma.estimate.update({
      where: { id },
      data: { status },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
