import { describe, it, expect } from "vitest";
import { csvEscape, estimatesToCsv, type CsvEstimate } from "./csv-export";

describe("csvEscape", () => {
  it("leaves plain values untouched", () => {
    expect(csvEscape("Kitchen Remodel")).toBe("Kitchen Remodel");
    expect(csvEscape(42)).toBe("42");
  });

  it("quotes values containing a comma", () => {
    expect(csvEscape("Smith, John")).toBe('"Smith, John"');
  });

  it("quotes and doubles embedded quotes", () => {
    expect(csvEscape('12" pipe')).toBe('"12"" pipe"');
  });

  it("quotes values containing newlines", () => {
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("estimatesToCsv", () => {
  const base: CsvEstimate = {
    createdAt: "2026-03-15T12:00:00.000Z",
    jobName: "Deck Build",
    customerName: "Jane Doe",
    address: "123 Main St",
    status: "sent",
    clientName: "Acme Co",
    projectName: "Backyard",
    lineItems: [
      // materials 100, labor 200, markup (300*0.1)=30, total 330
      { qty: 10, unitCost: 10, laborHours: 4, laborRate: 50, markupPct: 10 },
    ],
  };

  it("emits a header row first", () => {
    const csv = estimatesToCsv([]);
    expect(csv).toBe(
      "Date,Job Name,Customer,Address,Status,Client,Project,Line Items,Materials,Labor,Markup,Total"
    );
  });

  it("renders one row per estimate with computed money totals", () => {
    const csv = estimatesToCsv([base]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      "2026-03-15,Deck Build,Jane Doe,123 Main St,sent,Acme Co,Backyard,1,100.00,200.00,30.00,330.00"
    );
  });

  it("escapes commas and quotes in text fields", () => {
    const csv = estimatesToCsv([
      { ...base, jobName: 'Trim, 12" casing', customerName: "Smith, John" },
    ]);
    const row = csv.split("\r\n")[1];
    expect(row).toContain('"Trim, 12"" casing"');
    expect(row).toContain('"Smith, John"');
  });

  it("handles missing client/project and empty line items", () => {
    const csv = estimatesToCsv([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        jobName: "Consult",
        customerName: "Bob",
        address: "",
        status: "draft",
        lineItems: [],
      },
    ]);
    expect(csv.split("\r\n")[1]).toBe(
      "2026-01-01,Consult,Bob,,draft,,,0,0.00,0.00,0.00,0.00"
    );
  });

  it("aggregates totals across multiple line items", () => {
    const csv = estimatesToCsv([
      {
        ...base,
        lineItems: [
          { qty: 1, unitCost: 100, laborHours: 0, laborRate: 0, markupPct: 0 },
          { qty: 0, unitCost: 0, laborHours: 2, laborRate: 50, markupPct: 20 },
        ],
      },
    ]);
    // materials 100, labor 100, markup (100*0.2)=20, total 220
    const row = csv.split("\r\n")[1];
    expect(row.endsWith("2,100.00,100.00,20.00,220.00")).toBe(true);
  });
});
