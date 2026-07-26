import { describe, it, expect } from "vitest";
import { buildEstimatePdf, pdfFilename, type PdfEstimate } from "./estimate-pdf";
import type { CompanyProfile } from "./company";

const company: CompanyProfile = {
  name: "Real Elite Contracting",
  phone: "555-123-4567",
  email: "info@realelite.example",
  license: "ABC-12345",
  address: "100 Builder Rd, Springfield",
  website: "realelite.example",
};

function makeEstimate(itemCount: number): PdfEstimate {
  return {
    id: "clabcdef12345678",
    customerName: "Jane Homeowner",
    jobName: "Full Kitchen Remodel & Deck",
    address: "742 Evergreen Terrace",
    notes: "Includes permit coordination and debris haul-away.",
    createdAt: new Date("2026-03-15T12:00:00Z"),
    lineItems: Array.from({ length: itemCount }, (_, i) => ({
      name: `Item ${i + 1}`,
      unit: "ea",
      qty: 2,
      unitCost: 50,
      laborHours: 1,
      laborRate: 60,
      markupPct: 15,
    })),
  };
}

function pageCount(buf: Buffer): number {
  return (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
}

describe("buildEstimatePdf", () => {
  it("produces a valid single-page PDF for a small estimate", async () => {
    const buf = await buildEstimatePdf(makeEstimate(3), company);
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(1000);
    expect(pageCount(buf)).toBe(1);
  });

  it("paginates a large estimate onto multiple pages", async () => {
    const buf = await buildEstimatePdf(makeEstimate(35), company);
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pageCount(buf)).toBeGreaterThanOrEqual(2);
  });

  it("renders even with no company contact details", async () => {
    const bare: CompanyProfile = {
      name: "Contractor",
      phone: "",
      email: "",
      license: "",
      address: "",
      website: "",
    };
    const buf = await buildEstimatePdf(makeEstimate(1), bare);
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});

describe("pdfFilename", () => {
  it("slugifies the job name", () => {
    expect(pdfFilename("Full Kitchen Remodel & Deck")).toBe("estimate-Full-Kitchen-Remodel-Deck.pdf");
  });

  it("falls back to a default for empty/symbolic names", () => {
    expect(pdfFilename("  ***  ")).toBe("estimate-estimate.pdf");
    expect(pdfFilename("")).toBe("estimate-estimate.pdf");
  });

  it("cannot inject into the Content-Disposition header", () => {
    const name = pdfFilename('evil"; drop\n');
    expect(name).not.toContain('"');
    expect(name).not.toContain("\n");
  });
});
