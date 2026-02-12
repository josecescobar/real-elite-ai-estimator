import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

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
  let totalMaterials = 0;
  let totalLabor = 0;
  let totalMarkup = 0;

  for (const item of estimate.lineItems) {
    const materials = item.qty * item.unitCost;
    const labor = item.laborHours * item.laborRate;
    const subtotal = materials + labor;
    const markup = subtotal * (item.markupPct / 100);
    totalMaterials += materials;
    totalLabor += labor;
    totalMarkup += markup;
  }

  const grandTotal = totalMaterials + totalLabor + totalMarkup;

  // Build PDF
  const doc = new PDFDocument({ margin: 50, size: "LETTER" });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pdfDone = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // Header
  doc.fontSize(22).font("Helvetica-Bold").text("ESTIMATE", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(14).font("Helvetica").text("Real Elite AI Estimator", { align: "center" });
  doc.moveDown(1);

  // Estimate info
  doc.fontSize(11).font("Helvetica-Bold");
  doc.text(`Customer: `, { continued: true }).font("Helvetica").text(estimate.customerName);
  doc.font("Helvetica-Bold").text(`Job: `, { continued: true }).font("Helvetica").text(estimate.jobName);
  if (estimate.address) {
    doc.font("Helvetica-Bold").text(`Address: `, { continued: true }).font("Helvetica").text(estimate.address);
  }
  doc.font("Helvetica-Bold").text(`Date: `, { continued: true }).font("Helvetica").text(
    new Date(estimate.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );
  if (estimate.notes) {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").text(`Notes: `, { continued: true }).font("Helvetica").text(estimate.notes);
  }

  doc.moveDown(1);

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

    const materials = item.qty * item.unitCost;
    const labor = item.laborHours * item.laborRate;
    const subtotal = materials + labor;
    const markup = subtotal * (item.markupPct / 100);
    const lineTotal = subtotal + markup;

    doc.text(item.name, col.name, y, { width: 195 });
    doc.text(String(item.qty), col.qty, y);
    doc.text(item.unit, col.unit, y);
    doc.text(`$${fmt(materials)}`, col.materials, y);
    doc.text(`$${fmt(labor)}`, col.labor, y);
    doc.text(`$${fmt(lineTotal)}`, col.total, y);

    y += 16;
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

  doc.end();

  const pdfBuffer = await pdfDone;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="estimate-${estimate.jobName.replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
