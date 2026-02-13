const ALLOWED_UNITS = ["ea", "sqft", "lnft", "job", "hr", "ton", "gal"] as const;
type AllowedUnit = (typeof ALLOWED_UNITS)[number];

export interface AILineItem {
  name: string;
  description: string;
  unit: AllowedUnit;
  qty: number;
  unitCost: number;
  laborHours: number;
  laborRate: number;
  markupPct: number;
  sortOrder: number;
}

export interface LineItemTotals {
  materialsCost: number;
  laborCost: number;
  subtotal: number;
  markupAmount: number;
  finalTotal: number;
}

export function calculateLineItemTotals(item: AILineItem): LineItemTotals {
  const materialsCost = item.qty * item.unitCost;
  const laborCost = item.laborHours * item.laborRate;
  const subtotal = materialsCost + laborCost;
  const markupAmount = subtotal * (item.markupPct / 100);
  const finalTotal = subtotal + markupAmount;
  return {
    materialsCost: round2(materialsCost),
    laborCost: round2(laborCost),
    subtotal: round2(subtotal),
    markupAmount: round2(markupAmount),
    finalTotal: round2(finalTotal),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function validateLineItem(item: unknown, index: number): string | null {
  if (typeof item !== "object" || item === null) {
    return `Item ${index}: not an object`;
  }

  const obj = item as Record<string, unknown>;

  if (typeof obj.name !== "string" || obj.name.trim().length === 0) {
    return `Item ${index}: name must be a non-empty string`;
  }

  if (typeof obj.description !== "string" || obj.description.trim().length === 0) {
    return `Item ${index}: description must be a non-empty string`;
  }

  if (typeof obj.unit !== "string" || !ALLOWED_UNITS.includes(obj.unit as AllowedUnit)) {
    return `Item ${index}: unit must be one of ${ALLOWED_UNITS.join(", ")}`;
  }

  if (typeof obj.qty !== "number" || !isFinite(obj.qty) || obj.qty <= 0) {
    return `Item ${index}: qty must be a number > 0`;
  }

  if (typeof obj.unitCost !== "number" || !isFinite(obj.unitCost) || obj.unitCost < 0) {
    return `Item ${index}: unitCost must be a number >= 0`;
  }

  if (typeof obj.laborHours !== "number" || !isFinite(obj.laborHours) || obj.laborHours < 0) {
    return `Item ${index}: laborHours must be a number >= 0`;
  }

  if (typeof obj.laborRate !== "number" || !isFinite(obj.laborRate) || obj.laborRate < 45 || obj.laborRate > 95) {
    return `Item ${index}: laborRate must be between 45 and 95`;
  }

  if (typeof obj.markupPct !== "number" || !isFinite(obj.markupPct) || obj.markupPct < 10 || obj.markupPct > 25) {
    return `Item ${index}: markupPct must be between 10 and 25`;
  }

  return null;
}

export function validateAndNormalizeLineItems(raw: unknown): { items: AILineItem[] | null; error: string | null } {
  if (!Array.isArray(raw)) {
    return { items: null, error: "AI response is not an array" };
  }

  if (raw.length < 4 || raw.length > 8) {
    return { items: null, error: `Expected 4-8 line items, got ${raw.length}` };
  }

  const items: AILineItem[] = [];

  for (let i = 0; i < raw.length; i++) {
    const validationError = validateLineItem(raw[i], i);
    if (validationError) {
      return { items: null, error: validationError };
    }

    const obj = raw[i] as Record<string, unknown>;

    items.push({
      name: (obj.name as string).trim(),
      description: (obj.description as string).trim(),
      unit: obj.unit as AllowedUnit,
      qty: round2(obj.qty as number),
      unitCost: round2(obj.unitCost as number),
      laborHours: round2(obj.laborHours as number),
      laborRate: round2(obj.laborRate as number),
      markupPct: round2(obj.markupPct as number),
      sortOrder: i,
    });
  }

  return { items, error: null };
}
