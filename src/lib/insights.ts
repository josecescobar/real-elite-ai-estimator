import { estimateTotal, type TotalsInput } from "./estimate-calculations";

// ---------------------------------------------------------------------------
// Business insights derived from a user's estimates. Pure + deterministic
// (pass `now` in) so it can be unit-tested and reused server-side.
// ---------------------------------------------------------------------------

export interface InsightEstimate {
  status: string;
  createdAt: Date;
  lineItems: TotalsInput[];
}

export interface StatusBucket {
  count: number;
  value: number;
}

export interface MonthlyPoint {
  key: string; // "YYYY-MM"
  label: string; // "Jul 2026"
  count: number;
  value: number;
}

export type KnownStatus = "draft" | "sent" | "approved" | "changes_requested";

export interface Insights {
  total: StatusBucket;
  byStatus: Record<KnownStatus, StatusBucket>;
  /** Total $ of approved estimates — money won. */
  wonValue: number;
  /** Total $ still outstanding with the customer (sent + changes requested). */
  openPipelineValue: number;
  /** approved / (sent + approved + changes_requested); null when nothing sent. */
  winRate: number | null;
  avgEstimateValue: number;
  thisMonth: StatusBucket;
  lastMonth: StatusBucket;
  /** Last 6 months, oldest → newest. */
  monthlyTrend: MonthlyPoint[];
}

const KNOWN_STATUSES: KnownStatus[] = ["draft", "sent", "approved", "changes_requested"];

const emptyBucket = (): StatusBucket => ({ count: 0, value: 0 });

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(year: number, monthIdx: number): string {
  return new Date(Date.UTC(year, monthIdx, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function computeInsights(estimates: InsightEstimate[], now: Date): Insights {
  const byStatus: Record<KnownStatus, StatusBucket> = {
    draft: emptyBucket(),
    sent: emptyBucket(),
    approved: emptyBucket(),
    changes_requested: emptyBucket(),
  };
  const total = emptyBucket();
  const thisMonth = emptyBucket();
  const lastMonth = emptyBucket();

  const nowKey = monthKey(now);
  const lastKey = monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));

  // Six-month trend buckets (oldest → newest), pre-seeded to zero.
  const trend: MonthlyPoint[] = [];
  const trendIndex = new Map<string, MonthlyPoint>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const point: MonthlyPoint = {
      key: monthKey(d),
      label: monthLabel(d.getUTCFullYear(), d.getUTCMonth()),
      count: 0,
      value: 0,
    };
    trend.push(point);
    trendIndex.set(point.key, point);
  }

  for (const est of estimates) {
    const value = estimateTotal(est.lineItems);
    total.count++;
    total.value += value;

    if (KNOWN_STATUSES.includes(est.status as KnownStatus)) {
      const b = byStatus[est.status as KnownStatus];
      b.count++;
      b.value += value;
    }

    const key = monthKey(est.createdAt);
    if (key === nowKey) {
      thisMonth.count++;
      thisMonth.value += value;
    }
    if (key === lastKey) {
      lastMonth.count++;
      lastMonth.value += value;
    }
    const tp = trendIndex.get(key);
    if (tp) {
      tp.count++;
      tp.value += value;
    }
  }

  const sentOut = byStatus.sent.count + byStatus.approved.count + byStatus.changes_requested.count;

  return {
    total,
    byStatus,
    wonValue: byStatus.approved.value,
    openPipelineValue: byStatus.sent.value + byStatus.changes_requested.value,
    winRate: sentOut > 0 ? byStatus.approved.count / sentOut : null,
    avgEstimateValue: total.count > 0 ? total.value / total.count : 0,
    thisMonth,
    lastMonth,
    monthlyTrend: trend,
  };
}

/**
 * Estimates that were shared but haven't been responded to (still "sent") and
 * have gone quiet for `days`. Oldest first — the ones most in need of a nudge.
 */
export function needsFollowUp<T extends { status: string; createdAt: Date }>(
  estimates: T[],
  now: Date,
  days = 7
): T[] {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return estimates
    .filter((e) => e.status === "sent" && e.createdAt.getTime() < cutoff)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
