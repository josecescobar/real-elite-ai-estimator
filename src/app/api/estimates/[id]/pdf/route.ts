import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { estimateTotals, lineItemBreakdown } from "@/lib/estimate-calculations";
import { getCompanyProfile } from "@/lib/company";

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (estimate.userId !== user!.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Calculate totals
  const { materials: totalMaterials, labor: totalLabor, markup: totalMarkup, total: grandTotal } =
    estimateTotals(estimate.lineItems);

  // Build PDF
  const doc = new PDFDocument({ margin: 50, size: "LETTER" });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pdfDone = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // --- Branded header ---
  const company = getCompanyProfile();
  const LEFT = 50;
  const RIGHT = 562;
  const topY = 50;
  const dateFmt = (d: Date) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const created = new Date(estimate.createdAt);
  const validUntil = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Company (left)
  doc.fontSize(18).font("Helvetica-Bold").fillColor("#1d4ed8").text(company.name, LEFT, topY, { width: 320 });
  doc.fillColor("#000000").font("Helvetica").fontSize(9);
  let cy = topY + 24;
  for (const line of [
    company.address,
    [company.phone, company.email].filter(Boolean).join("    "),
    company.website,
    company.license ? `License #${company.license}` : "",
  ].filter(Boolean)) {
    doc.text(line, LEFT, cy, { width: 320 });
    cy += 12;
  }

  // Estimate meta (right)
  doc.font("Helvetica-Bold").fontSize(22).text("ESTIMATE", RIGHT - 220, topY, { width: 220, align: "right" });
  doc.font("Helvetica").fontSize(9);
  let my = topY + 30;
  for (const line of [
    `Estimate #${estimate.id.slice(-8).toUpperCase()}`,
    `Date: ${dateFmt(created)}`,
    `Valid until: ${dateFmt(validUntil)}`,
  ]) {
    doc.text(line, RIGHT - 220, my, { width: 220, align: "right" });
    my += 12;
  }

  // Divider
  const headerBottom = Math.max(cy, my) + 8;
  doc.moveTo(LEFT, headerBottom).lineTo(RIGHT, headerBottom).stroke();

  // Prepared-for (left) / Job (right)
  const infoY = headerBottom + 14;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#6b7280").text("PREPARED FOR", LEFT, infoY);
  doc.fillColor("#000000").font("Helvetica").fontSize(12).text(estimate.customerName || "—", LEFT, infoY + 12, { width: 260 });
  let leftBottom = infoY + 28;
  if (estimate.address) {
    doc.font("Helvetica").fontSize(9).fillColor("#374151").text(estimate.address, LEFT, leftBottom, { width: 260 });
    doc.fillColor("#000000");
    leftBottom += 14;
  }

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#6b7280").text("JOB", RIGHT - 260, infoY, { width: 260, align: "right" });
  doc.fillColor("#000000").font("Helvetica").fontSize(12).text(estimate.jobName || "—", RIGHT - 260, infoY + 12, { width: 260, align: "right" });

  let infoBottom = Math.max(leftBottom, infoY + 28);
  if (estimate.notes) {
    infoBottom += 6;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#6b7280").text("NOTES", LEFT, infoBottom);
    doc.fillColor("#000000").font("Helvetica").fontSize(9).text(estimate.notes, LEFT, infoBottom + 12, { width: RIGHT - LEFT });
    infoBottom = doc.y;
  }

  // Position cursor for the line-item table
  doc.x = LEFT;
  doc.y = infoBottom + 20;

  // Line items table header
  const tableTop = doc.y;
  const col = { name: 50, qty: 250, unit: 300, materials: 350, labor: 430, total: 480 };

  doc.fontSize(9).font("Helvetica-Bold");
  doc.text("Item", col.name, tableTop);
  doc.text("Qty", col.qty, tableTop);
  doc.text("Unit", col.unit, tableTop);
  doc.text("Materials", col.materials, tableTop);
  doc.text("Labor", col.labor, tableTop);
  doc.text("Line Total", col.total, tableTop);

  doc.moveTo(50, tableTop + 14).lineTo(562, tableTop + 14).stroke();

  let y = tableTop + 20;
  doc.font("Helvetica").fontSize(9);

  for (const item of estimate.lineItems) {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }

    const { materials, labor, total: lineTotal } = lineItemBreakdown(item);

    // Advance by the wrapped name height so long names don't overlap the next row
    const rowHeight = Math.max(16, doc.heightOfString(item.name, { width: 195 }) + 4);
    doc.text(item.name, col.name, y, { width: 195 });
    doc.text(String(item.qty), col.qty, y);
    doc.text(item.unit, col.unit, y);
    doc.text(`$${fmt(materials)}`, col.materials, y);
    doc.text(`$${fmt(labor)}`, col.labor, y);
    doc.text(`$${fmt(lineTotal)}`, col.total, y);

    y += rowHeight;
  }

  // Keep the totals block from running off the bottom of the page
  if (y > 650) {
    doc.addPage();
    y = 50;
  }

  // Totals
  y += 10;
  doc.moveTo(350, y).lineTo(562, y).stroke();
  y += 8;

  doc.font("Helvetica").fontSize(10);
  doc.text("Materials:", 350, y);
  doc.text(`$${fmt(totalMaterials)}`, col.total, y);
  y += 16;

  doc.text("Labor:", 350, y);
  doc.text(`$${fmt(totalLabor)}`, col.total, y);
  y += 16;

  doc.text("Markup:", 350, y);
  doc.text(`$${fmt(totalMarkup)}`, col.total, y);
  y += 16;

  doc.moveTo(350, y).lineTo(562, y).stroke();
  y += 8;

  doc.font("Helvetica-Bold").fontSize(12);
  doc.text("TOTAL:", 350, y);
  doc.text(`$${fmt(grandTotal)}`, col.total, y);

  // --- Footer: terms + acceptance ---
  let footerY = y + 44;
  if (footerY > 650) {
    doc.addPage();
    footerY = 50;
  }
  doc.moveTo(LEFT, footerY).lineTo(RIGHT, footerY).stroke();
  footerY += 10;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#374151").text("Terms", LEFT, footerY);
  doc.font("Helvetica").fontSize(8).fillColor("#6b7280").text(
    `This estimate is valid until ${dateFmt(validUntil)}. Prices are based on current material and labor costs and may change if the scope of work changes. A signed acceptance authorizes ${company.name} to proceed with the work described above.`,
    LEFT,
    footerY + 13,
    { width: RIGHT - LEFT }
  );
  doc.fillColor("#000000");

  let sigY = doc.y + 28;
  if (sigY > 690) {
    doc.addPage();
    sigY = 50;
  }
  doc.font("Helvetica-Bold").fontSize(10).text("Acceptance", LEFT, sigY);
  sigY += 26;
  doc.moveTo(LEFT, sigY).lineTo(LEFT + 240, sigY).stroke();
  doc.moveTo(RIGHT - 160, sigY).lineTo(RIGHT, sigY).stroke();
  doc.font("Helvetica").fontSize(8).fillColor("#6b7280");
  doc.text("Customer signature", LEFT, sigY + 4);
  doc.text("Date", RIGHT - 160, sigY + 4);
  doc.fillColor("#000000");

  doc.end();

  const pdfBuffer = await pdfDone;

  // Sanitize the job name for the filename so it can't inject into the header
  const safeJob =
    estimate.jobName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "estimate";

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="estimate-${safeJob}.pdf"`,
    },
  });
}
