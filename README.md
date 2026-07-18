# Real Elite AI Estimator

AI-assisted construction estimating for Real Elite Contracting — describe the job, get a priced line-item breakdown, share it with the customer, and track approval.

Built with Next.js 16 (App Router), Prisma 7 + Turso (libSQL), NextAuth v5, Tailwind CSS v4, and PDFKit.

> **Project status & backlog:** see [PLAN.md](./PLAN.md).

## Features

- **Accounts** — email/password signup and login; every user sees only their own data.
- **Description-first estimates** — write the job description, get a live quality score with tips (heuristic + AI), then build the estimate.
- **AI Suggest** — generates 4–8 realistic line items (materials, labor hours/rates, markup) from the description using your choice of provider: Anthropic, OpenAI, Groq, or Gemini. Output is strictly validated and totals are recomputed server-side.
- **Estimate builder** — add/edit/delete line items with live materials, labor, markup, and grand totals.
- **Clients & Projects** — manage clients and projects, link estimates to them, see per-client totals.
- **Customer portal** — generate a tokenized share link; the customer can approve or request changes (with a message) without an account. Links are revocable.
- **Status tracking** — `draft → sent → approved / changes_requested`, with a filterable stats dashboard.
- **PDF export** — customer-friendly PDF download per estimate.

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env   # then fill in values (see table below)

# Generate the Prisma client (required — output is gitignored)
npx prisma generate

# Apply migrations
# Local file database:
PRISMA_MIGRATE_LOCAL=1 npx prisma migrate dev
# Hosted Turso database (uses TURSO_* from .env):
npx prisma migrate deploy

# (Optional) seed demo data — WARNING: wipes existing data in the target DB
npx prisma db seed

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TURSO_DATABASE_URL` | ✅ | libSQL URL. Turso: `libsql://<db>.turso.io`. Local dev: `file:./prisma/dev.db` |
| `TURSO_AUTH_TOKEN` | For Turso | Auth token for the hosted database (not needed for `file:` URLs) |
| `AUTH_SECRET` | ✅ | NextAuth JWT secret — generate with `npx auth secret` or `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | optional | Enables the Claude provider for AI Suggest |
| `OPENAI_API_KEY` | optional | Enables the GPT provider |
| `GROQ_API_KEY` | optional | Enables the Llama (Groq) provider |
| `GEMINI_API_KEY` | optional | Enables the Gemini provider |

At least one AI key is needed for AI Suggest and AI description tips; the rest of the app works without any.

## Project structure

```
prisma/
├── schema.prisma            # User, Estimate, LineItem, Client, Project, CustomerResponse
├── migrations/              # SQL migrations
└── seed.mts                 # Demo data seed (destructive — see PLAN.md)
src/
├── middleware.ts            # Auth gate for app + API routes
├── lib/
│   ├── prisma.ts            # Prisma client (libSQL adapter)
│   ├── auth.ts              # NextAuth v5 config (credentials provider)
│   ├── auth-helpers.ts      # getAuthUser() for API routes
│   ├── ai-providers.ts      # Provider registry (Anthropic/OpenAI/Groq/Gemini)
│   ├── estimate-calculations.ts  # Line-item validation + totals math
│   └── description-scoring.ts    # Heuristic description quality score
└── app/
    ├── page.tsx / Dashboard.tsx  # Stats dashboard (or landing page when signed out)
    ├── login/ · signup/          # Auth pages
    ├── estimates/                # List, new (description-first flow), edit, form
    ├── clients/ · projects/      # CRUD pages
    ├── share/[token]/            # Public customer portal page
    └── api/
        ├── auth/                 # NextAuth handlers + signup
        ├── estimates/            # CRUD + /pdf + /share + /respond (public)
        ├── clients/ · projects/  # CRUD
        └── ai/                   # providers, suggest, score-description
```

## Line item fields

Each line item: **name**, **unit** (`ea, sqft, lnft, job, hr, ton, gal`), **qty**, **unit cost** (materials), **labor hours**, **labor rate**, **markup %**. Line total = (qty × unit cost + hours × rate) × (1 + markup).

## Deployment notes (Vercel + Turso)

- Set all required env vars in Vercel.
- The build must run `prisma generate` before `next build` (see PLAN.md P0 — the default build script doesn't yet).
- Migrations are applied against Turso with `npx prisma migrate deploy` (locally or in CI), not during the Vercel build.
