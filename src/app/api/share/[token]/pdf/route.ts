import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { buildEstimatePdf, pdfFilename } from "@/lib/estimate-pdf";
import { getCompanyProfile } from "@/lib/company";

// Public, token-gated PDF download for the customer share page. No auth: the
// unguessable share token is the credential (same trust model as the share page
// itself). A revoked link (shareToken cleared) returns 404.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const estimate = await prisma.estimate.findUnique({
    where: { shareToken: token },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdfBuffer = await buildEstimatePdf(estimate, getCompanyProfile());

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFilename(estimate.jobName)}"`,
    },
  });
}
