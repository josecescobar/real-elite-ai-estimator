import "dotenv/config";
import { hashSync } from "bcryptjs";

const adapterMod = await import("@prisma/adapter-better-sqlite3");
const PrismaBetterSqlite3 = adapterMod.PrismaBetterSqlite3;

const clientMod = await import("../src/generated/prisma/client.js");
const PrismaClient = clientMod.PrismaClient;

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.customerResponse.deleteMany();
  await prisma.lineItem.deleteMany();
  await prisma.estimate.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: "demo@realelite.com",
      name: "Demo User",
      password: hashSync("password123", 10),
    },
  });

  const estimate = await prisma.estimate.create({
    data: {
      customerName: "John Smith",
      jobName: "Kitchen Remodel",
      address: "123 Main St, Austin, TX 78701",
      notes: "Customer wants granite countertops and new backsplash.",
      userId: user.id,
      lineItems: {
        create: [
          {
            name: "Granite Countertop",
            unit: "sqft",
            qty: 45,
            unitCost: 75,
            laborHours: 8,
            laborRate: 65,
            markupPct: 15,
            sortOrder: 0,
          },
          {
            name: "Tile Backsplash",
            unit: "sqft",
            qty: 30,
            unitCost: 12,
            laborHours: 6,
            laborRate: 55,
            markupPct: 15,
            sortOrder: 1,
          },
          {
            name: "Demolition",
            unit: "job",
            qty: 1,
            unitCost: 0,
            laborHours: 16,
            laborRate: 45,
            markupPct: 10,
            sortOrder: 2,
          },
          {
            name: "Plumbing Rough-in",
            unit: "job",
            qty: 1,
            unitCost: 350,
            laborHours: 4,
            laborRate: 85,
            markupPct: 10,
            sortOrder: 3,
          },
        ],
      },
    },
    include: { lineItems: true },
  });

  console.log(`Seeded user: ${user.email} (password: password123)`);
  console.log(`Seeded estimate: ${estimate.jobName} (${estimate.id})`);
  console.log(`  - ${estimate.lineItems.length} line items`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
