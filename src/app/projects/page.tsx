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

const projectStatusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  on_hold: "bg-yellow-100 text-yellow-700",
};

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: { estimates: { include: { lineItems: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link
          href="/projects/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          + New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No projects yet.</p>
          <Link href="/projects/new" className="text-blue-600 hover:underline mt-2 inline-block">
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const totalValue = project.estimates.reduce(
              (sum, est) => sum + calcTotal(est.lineItems),
              0
            );
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all block"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${projectStatusColors[project.status] || projectStatusColors.active}`}>
                        {project.status.replace("_", " ")}
                      </span>
                    </div>
                    {project.address && (
                      <p className="text-gray-400 text-sm">{project.address}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-700">
                      ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {project.estimates.length} estimate{project.estimates.length !== 1 ? "s" : ""}
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
