// Build a pre-filled `mailto:` link so the contractor can send a customer the
// share link from their own email client — zero-config, no email provider or
// API key required. Pure so it can be unit tested.

export interface MailtoOptions {
  shareUrl: string;
  jobName?: string;
  customerName?: string;
  companyName?: string;
  toEmail?: string;
}

export function buildEmailSubject(opts: Pick<MailtoOptions, "jobName" | "companyName">): string {
  const job = opts.jobName?.trim();
  const company = opts.companyName?.trim();
  return `Your estimate${job ? ` for ${job}` : ""}${company ? ` from ${company}` : ""}`;
}

export function buildEmailBody(opts: MailtoOptions): string {
  const name = opts.customerName?.trim();
  const job = opts.jobName?.trim();
  const company = opts.companyName?.trim() || "Thank you";
  return [
    name ? `Hi ${name},` : "Hello,",
    "",
    `Please review your estimate${job ? ` for "${job}"` : ""} using the link below. You can approve it or request changes right on the page, and download a PDF copy for your records:`,
    "",
    opts.shareUrl,
    "",
    company === "Thank you" ? "Thank you" : `Thank you,\n${company}`,
  ].join("\n");
}

/** Build a `mailto:` URL with subject + body pre-filled (spaces as %20, not +). */
export function buildMailtoLink(opts: MailtoOptions): string {
  const params = new URLSearchParams();
  params.set("subject", buildEmailSubject(opts));
  params.set("body", buildEmailBody(opts));
  // URLSearchParams encodes spaces as "+"; mail clients read "+" literally in a
  // mailto query, so normalize to %20. (Literal "+" in input is already %2B.)
  const query = params.toString().replace(/\+/g, "%20");
  const to = opts.toEmail?.trim() ? encodeURIComponent(opts.toEmail.trim()) : "";
  return `mailto:${to}?${query}`;
}
