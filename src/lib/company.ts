// Company profile shown on customer-facing documents (the PDF, the share page).
// Configured via environment variables so no per-user DB schema is required;
// ships with sensible defaults for Real Elite Contracting.

export interface CompanyProfile {
  name: string;
  phone: string;
  email: string;
  license: string;
  address: string;
  website: string;
}

export function getCompanyProfile(): CompanyProfile {
  return {
    name: process.env.COMPANY_NAME || "Real Elite Contracting",
    phone: process.env.COMPANY_PHONE || "",
    email: process.env.COMPANY_EMAIL || "",
    license: process.env.COMPANY_LICENSE || "",
    address: process.env.COMPANY_ADDRESS || "",
    website: process.env.COMPANY_WEBSITE || "",
  };
}
