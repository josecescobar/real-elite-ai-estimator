# Real Elite AI Estimator

A professional construction estimating web app built with Next.js, Prisma, and SQLite.

## Features

- **Estimate Builder** - Add/edit/delete line items with materials, labor, and markup calculations
- **Live Totals** - Real-time materials, labor, markup, and grand total calculations
- **Estimates List** - View all saved estimates, sorted by most recent
- **PDF Export** - Download customer-friendly PDF summaries
- **Mobile Responsive** - Works on desktop and mobile devices

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4** for styling
- **Prisma v7** + SQLite for data storage
- **PDFKit** for PDF generation

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Setup & Run

```bash
cd web

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed with sample data
npx prisma db seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## Project Structure

```
web/
├── prisma/
│   ├── schema.prisma      # Database schema (Estimate + LineItem models)
│   ├── migrations/        # Database migrations
│   └── seed.mts           # Sample data seed script
├── src/
│   ├── app/
│   │   ├── api/estimates/          # REST API routes
│   │   │   ├── route.ts            # GET all, POST new
│   │   │   └── [id]/
│   │   │       ├── route.ts        # GET one, PUT update, DELETE
│   │   │       └── pdf/route.ts    # PDF export endpoint
│   │   ├── estimates/
│   │   │   ├── page.tsx            # Estimates list page
│   │   │   ├── new/page.tsx        # New estimate page
│   │   │   ├── [id]/page.tsx       # Edit estimate page
│   │   │   └── EstimateForm.tsx    # Shared estimate form component
│   │   ├── layout.tsx              # App layout with navigation
│   │   └── page.tsx                # Home page
│   ├── generated/prisma/          # Generated Prisma client
│   └── lib/prisma.ts              # Prisma client singleton
├── .env                           # DATABASE_URL config
└── prisma.config.ts               # Prisma configuration
```

## Line Item Fields

Each line item includes:
- **Name** - Description of the work/material
- **Unit** - Unit of measurement (ea, sqft, lnft, job, hr, ton, gal)
- **Qty** - Quantity
- **Unit Cost** - Cost per unit (materials)
- **Labor Hours** - Hours of labor
- **Labor Rate** - Hourly labor rate
- **Markup %** - Markup percentage on (materials + labor)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `file:./dev.db` |
