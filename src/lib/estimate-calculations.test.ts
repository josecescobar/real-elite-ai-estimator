import { describe, it, expect } from "vitest";
import {
  lineItemBreakdown,
  lineItemTotal,
  estimateTotals,
  estimateTotal,
  calculateLineItemTotals,
  validateAndNormalizeLineItems,
  type TotalsInput,
} from "./estimate-calculations";

const itemA: TotalsInput = { qty: 45, unitCost: 75, laborHours: 8, laborRate: 65, markupPct: 15 };
const itemB: TotalsInput = { qty: 30, unitCost: 12, laborHours: 6, laborRate: 55, markupPct: 15 };

describe("lineItemBreakdown", () => {
  it("computes materials, labor, markup, and total", () => {
    const b = lineItemBreakdown(itemA);
    expect(b.materials).toBeCloseTo(3375, 6); // 45 * 75
    expect(b.labor).toBeCloseTo(520, 6); // 8 * 65
    expect(b.markup).toBeCloseTo(584.25, 6); // 3895 * 0.15
    expect(b.total).toBeCloseTo(4479.25, 6);
  });

  it("returns materials + labor when markup is 0", () => {
    const b = lineItemBreakdown({ qty: 2, unitCost: 100, laborHours: 1, laborRate: 50, markupPct: 0 });
    expect(b.markup).toBe(0);
    expect(b.total).toBeCloseTo(250, 6);
  });
});

describe("lineItemTotal", () => {
  it("matches the breakdown total", () => {
    expect(lineItemTotal(itemA)).toBeCloseTo(lineItemBreakdown(itemA).total, 6);
    expect(lineItemTotal(itemB)).toBeCloseTo(793.5, 6);
  });
});

describe("estimateTotals", () => {
  it("aggregates across line items", () => {
    const t = estimateTotals([itemA, itemB]);
    expect(t.materials).toBeCloseTo(3735, 6);
    expect(t.labor).toBeCloseTo(850, 6);
    expect(t.markup).toBeCloseTo(687.75, 6);
    expect(t.total).toBeCloseTo(5272.75, 6);
  });

  it("is all zeros for an empty list", () => {
    expect(estimateTotals([])).toEqual({ materials: 0, labor: 0, markup: 0, total: 0 });
  });

  it("total equals the sum of individual line totals", () => {
    const t = estimateTotals([itemA, itemB]);
    expect(t.total).toBeCloseTo(lineItemTotal(itemA) + lineItemTotal(itemB), 6);
  });
});

describe("estimateTotal", () => {
  it("returns the aggregate grand total", () => {
    expect(estimateTotal([itemA, itemB])).toBeCloseTo(5272.75, 6);
    expect(estimateTotal([])).toBe(0);
  });
});

describe("calculateLineItemTotals (AI flow, rounded to cents)", () => {
  it("rounds sub-cent amounts to 2 decimals", () => {
    const r = calculateLineItemTotals({
      name: "Widget",
      description: "desc",
      unit: "ea",
      qty: 3,
      unitCost: 3.333, // 9.999 materials
      laborHours: 1,
      laborRate: 50,
      markupPct: 10,
      sortOrder: 0,
    });
    expect(r.materialsCost).toBeCloseTo(10.0, 2);
    expect(r.laborCost).toBe(50);
    expect(r.finalTotal).toBeCloseTo(66.0, 2);
  });
});

describe("validateAndNormalizeLineItems", () => {
  const valid = Array.from({ length: 4 }, (_, i) => ({
    name: `Item ${i}`,
    description: "desc",
    unit: "ea",
    qty: 1,
    unitCost: 10,
    laborHours: 1,
    laborRate: 60,
    markupPct: 15,
  }));

  it("accepts a valid 4-8 item array and assigns sortOrder", () => {
    const { items, error } = validateAndNormalizeLineItems(valid);
    expect(error).toBeNull();
    expect(items).toHaveLength(4);
    expect(items![0].sortOrder).toBe(0);
    expect(items![3].sortOrder).toBe(3);
  });

  it("rejects fewer than 4 items", () => {
    const { items, error } = validateAndNormalizeLineItems(valid.slice(0, 3));
    expect(items).toBeNull();
    expect(error).toMatch(/4-8/);
  });

  it("rejects an out-of-range laborRate", () => {
    const bad = valid.map((v) => ({ ...v }));
    bad[0].laborRate = 200;
    const { error } = validateAndNormalizeLineItems(bad);
    expect(error).toMatch(/laborRate/);
  });

  it("rejects a non-array", () => {
    const { error } = validateAndNormalizeLineItems("nope");
    expect(error).toMatch(/not an array/);
  });
});
