import { describe, it, expect } from "vitest";
import { ESTIMATE_STATUSES, STATUS_LABELS, isValidStatus } from "./estimate-status";

describe("isValidStatus", () => {
  it("accepts every known status", () => {
    for (const s of ESTIMATE_STATUSES) {
      expect(isValidStatus(s)).toBe(true);
    }
  });

  it("rejects unknown or non-string values", () => {
    expect(isValidStatus("shipped")).toBe(false);
    expect(isValidStatus("")).toBe(false);
    expect(isValidStatus(null)).toBe(false);
    expect(isValidStatus(undefined)).toBe(false);
    expect(isValidStatus(3)).toBe(false);
    expect(isValidStatus({ status: "draft" })).toBe(false);
  });
});

describe("STATUS_LABELS", () => {
  it("has a human label for every status", () => {
    for (const s of ESTIMATE_STATUSES) {
      expect(STATUS_LABELS[s]).toBeTruthy();
    }
  });
});
