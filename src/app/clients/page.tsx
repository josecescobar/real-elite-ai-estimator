import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

function calcTotal(lineItems: { qty: number; unitCost: number; laborHours: number; laborRate: number; markupPct: number }[]) {
  let total = 0;
  for (const item of lineItems) {
    const materials = item.qty * item.unitCost;
    const labor = item.laborHours * item.laborRate;
    const subtotal = materials + labor;
    total += subtotal + subtotal * (item.markupPct / 100);
  }
  return total;
}

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    include: { estimates: { include: { lineItems: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Link
          href="/clients/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          + New Client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No clients yet.</p>
          <Link href="/clients/new" className="text-blue-600 hover:underline mt-2 inline-block">
            Add your first client
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => {
            const totalDue = client.estimates.reduce(
              (sum, est) => sum + calcTotal(est.lineItems),
              0
            );
            return (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all block"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{client.name}</h2>
                    {client.company && (
                      <p className="text-gray-600 text-sm">{client.company}</p>
                    )}
                    {client.phone && (
                      <p className="text-gray-400 text-sm">{client.phone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-700">
                      ${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {client.estimates.length} estimate{client.estimates.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
