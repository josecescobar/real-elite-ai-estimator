// Single source of truth for estimate statuses. Used by the status route (to
// validate) and the estimate form (to render the picker).

export const ESTIMATE_STATUSES = ["draft", "sent", "approved", "changes_requested"] as const;

export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

export const STATUS_LABELS: Record<EstimateStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  changes_requested: "Changes requested",
};

export function isValidStatus(value: unknown): value is EstimateStatus {
  return typeof value === "string" && (ESTIMATE_STATUSES as readonly string[]).includes(value);
}
