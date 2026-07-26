// Build a spreadsheet-friendly CSV of estimates (one row per estimate) for
// bookkeeping / accounting export. Pure and dependency-free so it can be unit
// tested and reused by the export route.

import { estimateTotals, type TotalsInput } from "./estimate-calculations";

export interface CsvEstimate {
  createdAt: Date | string;
  jobName: string;
  customerName: string;
  address: string;
  status: string;
  clientName?: string | null;
  projectName?: string | null;
  lineItems: TotalsInput[];
}

const HEADERS = [
  "Date",
  "Job Name",
  "Customer",
  "Address",
  "Status",
  "Client",
  "Project",
  "Line Items",
  "Materials",
  "Labor",
  "Markup",
  "Total",
] as const;

/**
 * Escape a single value for CSV per RFC 4180: wrap it in double quotes when it
 * contains a comma, quote, or newline, and double any embedded quotes.
 */
export function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function isoDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function money(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

/** Render estimates as an RFC-4180 CSV string with a header row (CRLF line endings). */
export function estimatesToCsv(estimates: CsvEstimate[]): string {
  const rows: string[] = [HEADERS.map(csvEscape).join(",")];

  for (const est of estimates) {
    const totals = estimateTotals(est.lineItems);
    const cells: (string | number)[] = [
      isoDate(est.createdAt),
      est.jobName,
      est.customerName,
      est.address,
      est.status,
      est.clientName || "",
      est.projectName || "",
      est.lineItems.length,
      money(totals.materials),
      money(totals.labor),
      money(totals.markup),
      money(totals.total),
    ];
    rows.push(cells.map(csvEscape).join(","));
  }

  return rows.join("\r\n");
}
