import { describe, it, expect } from "vitest";
import { buildEmailSubject, buildEmailBody, buildMailtoLink } from "./estimate-email";

describe("buildEmailSubject", () => {
  it("includes job and company when present", () => {
    expect(buildEmailSubject({ jobName: "Deck Build", companyName: "Real Elite" })).toBe(
      "Your estimate for Deck Build from Real Elite"
    );
  });
  it("degrades gracefully when fields are missing", () => {
    expect(buildEmailSubject({})).toBe("Your estimate");
    expect(buildEmailSubject({ jobName: "Roof" })).toBe("Your estimate for Roof");
  });
});

describe("buildEmailBody", () => {
  it("greets the customer by name and includes the share url", () => {
    const body = buildEmailBody({
      shareUrl: "https://app.example/share/abc",
      jobName: "Deck",
      customerName: "Jane",
      companyName: "Real Elite",
    });
    expect(body).toContain("Hi Jane,");
    expect(body).toContain('for "Deck"');
    expect(body).toContain("https://app.example/share/abc");
    expect(body).toContain("Thank you,\nReal Elite");
  });
  it("falls back to a generic greeting and signature", () => {
    const body = buildEmailBody({ shareUrl: "https://app.example/share/abc" });
    expect(body).toContain("Hello,");
    expect(body.trimEnd().endsWith("Thank you")).toBe(true);
  });
});

describe("buildMailtoLink", () => {
  it("builds a mailto with recipient, subject, and body", () => {
    const link = buildMailtoLink({
      shareUrl: "https://app.example/share/abc",
      jobName: "Deck Build",
      customerName: "Jane",
      companyName: "Real Elite",
      toEmail: "jane@example.com",
    });
    expect(link.startsWith("mailto:jane%40example.com?")).toBe(true);
    expect(link).toContain("subject=");
    expect(link).toContain("body=");
  });

  it("encodes spaces as %20 (not +) so mail clients render them correctly", () => {
    const link = buildMailtoLink({ shareUrl: "https://app.example/share/abc", jobName: "Deck Build" });
    expect(link).not.toContain("+");
    expect(link).toContain("%20");
  });

  it("omits the recipient when no email is provided", () => {
    const link = buildMailtoLink({ shareUrl: "https://app.example/share/abc" });
    expect(link.startsWith("mailto:?")).toBe(true);
  });

  it("round-trips the share url through decoding", () => {
    const url = "https://app.example/share/xyz?a=1&b=2";
    const link = buildMailtoLink({ shareUrl: url, toEmail: "x@y.com" });
    const body = new URLSearchParams(link.split("?").slice(1).join("?")).get("body") || "";
    expect(body).toContain(url);
  });
});
