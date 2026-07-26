import { describe, it, expect } from "vitest";
import { computeInsights, needsFollowUp, type InsightEstimate } from "./insights";

// Single line item whose total equals `n` (qty=n, unitCost=1, no labor/markup).
const items = (n: number) => [
  { qty: n, unitCost: 1, laborHours: 0, laborRate: 0, markupPct: 0 },
];

const NOW = new Date("2026-07-15T12:00:00Z");

const estimates: InsightEstimate[] = [
  { status: "approved", createdAt: new Date("2026-07-10T00:00:00Z"), lineItems: items(1000) },
  { status: "sent", createdAt: new Date("2026-07-14T00:00:00Z"), lineItems: items(500) }, // recent
  { status: "sent", createdAt: new Date("2026-07-01T00:00:00Z"), lineItems: items(300) }, // stale
  { status: "changes_requested", createdAt: new Date("2026-06-20T00:00:00Z"), lineItems: items(800) },
  { status: "draft", createdAt: new Date("2026-07-05T00:00:00Z"), lineItems: items(200) },
  { status: "approved", createdAt: new Date("2026-05-10T00:00:00Z"), lineItems: items(2000) },
];

describe("computeInsights", () => {
  const i = computeInsights(estimates, NOW);

  it("totals across all estimates", () => {
    expect(i.total.count).toBe(6);
    expect(i.total.value).toBeCloseTo(4800, 6);
  });

  it("buckets by status", () => {
    expect(i.byStatus.draft).toEqual({ count: 1, value: 200 });
    expect(i.byStatus.sent).toEqual({ count: 2, value: 800 });
    expect(i.byStatus.approved).toEqual({ count: 2, value: 3000 });
    expect(i.byStatus.changes_requested).toEqual({ count: 1, value: 800 });
  });

  it("won value and open pipeline", () => {
    expect(i.wonValue).toBeCloseTo(3000, 6); // approved
    expect(i.openPipelineValue).toBeCloseTo(1600, 6); // sent + changes_requested
  });

  it("win rate = approved / sent-out", () => {
    // approved 2 / (sent 2 + approved 2 + changes 1 = 5) = 0.4
    expect(i.winRate).toBeCloseTo(0.4, 6);
  });

  it("average estimate value", () => {
    expect(i.avgEstimateValue).toBeCloseTo(800, 6); // 4800 / 6
  });

  it("this month vs last month (UTC)", () => {
    expect(i.thisMonth).toEqual({ count: 4, value: 2000 }); // Jul: 1000+500+300+200
    expect(i.lastMonth).toEqual({ count: 1, value: 800 }); // Jun: 800
  });

  it("six-month trend, oldest → newest, zero-filled", () => {
    expect(i.monthlyTrend).toHaveLength(6);
    expect(i.monthlyTrend[0].key).toBe("2026-02");
    expect(i.monthlyTrend[5].key).toBe("2026-07");
    expect(i.monthlyTrend[5].label).toBe("Jul 2026");
    const may = i.monthlyTrend.find((m) => m.key === "2026-05")!;
    expect(may).toMatchObject({ count: 1, value: 2000 });
    const jul = i.monthlyTrend[5];
    expect(jul).toMatchObject({ count: 4, value: 2000 });
    const feb = i.monthlyTrend[0];
    expect(feb).toMatchObject({ count: 0, value: 0 });
  });

  it("win rate is null when nothing has been sent", () => {
    const drafts = computeInsights(
      [{ status: "draft", createdAt: NOW, lineItems: items(100) }],
      NOW
    );
    expect(drafts.winRate).toBeNull();
  });

  it("handles an empty list", () => {
    const e = computeInsights([], NOW);
    expect(e.total).toEqual({ count: 0, value: 0 });
    expect(e.winRate).toBeNull();
    expect(e.avgEstimateValue).toBe(0);
    expect(e.monthlyTrend).toHaveLength(6);
  });
});

describe("needsFollowUp", () => {
  it("returns only stale 'sent' estimates, oldest first", () => {
    const flagged = needsFollowUp(estimates, NOW, 7);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].lineItems).toEqual(items(300)); // the 2026-07-01 sent one
  });

  it("respects the days threshold", () => {
    // With a 30-day window, nothing in July is stale yet relative to 2026-07-15.
    expect(needsFollowUp(estimates, NOW, 30)).toHaveLength(0);
  });

  it("ignores non-sent statuses", () => {
    const onlyApproved = [
      { status: "approved", createdAt: new Date("2020-01-01T00:00:00Z") },
    ];
    expect(needsFollowUp(onlyApproved, NOW, 7)).toHaveLength(0);
  });
});
