"use client";

import Link from "next/link";
import { useState } from "react";

interface EstimateSummary {
  id: string;
  jobName: string;
  customerName: string;
  status: string;
  total: number;
  createdAt: string;
}

interface DashboardProps {
  estimates: EstimateSummary[];
  stats: {
    all: { count: number; total: number };
    draft: { count: number; total: number };
    sent: { count: number; total: number };
    approved: { count: number; total: number };
  };
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  changes_requested: "bg-yellow-100 text-yellow-700",
};

export default function Dashboard({ estimates, stats }: DashboardProps) {
  const [filter, setFilter] = useState<"all" | "draft" | "sent" | "approved">("all");

  const filtered = filter === "all"
    ? estimates
    : estimates.filter((e) => e.status === filter);

  const cards = [
    { key: "all" as const, label: "All", color: "border-blue-500 bg-blue-50", textColor: "text-blue-700" },
    { key: "draft" as const, label: "Draft", color: "border-gray-400 bg-gray-50", textColor: "text-gray-700" },
    { key: "sent" as const, label: "Sent", color: "border-indigo-500 bg-indigo-50", textColor: "text-indigo-700" },
    { key: "approved" as const, label: "Approved", color: "border-green-500 bg-green-50", textColor: "text-green-700" },
  ];

  return (
    <div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ key, label, color, textColor }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-lg border-l-4 p-4 text-left transition-all hover:shadow-sm ${color} ${filter === key ? "ring-2 ring-blue-400" : ""}`}
          >
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className={`text-2xl font-bold ${textColor}`}>{stats[key].count}</p>
            <p className="text-sm text-gray-500">${fmt(stats[key].total)}</p>
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          href="/estimates/new"
          className="bg-blue-600 text-white rounded-lg p-4 text-center hover:bg-blue-700 font-medium transition-colors"
        >
          + New Estimate
        </Link>
        <Link
          href="/clients/new"
          className="bg-white border border-gray-200 text-gray-700 rounded-lg p-4 text-center hover:border-blue-300 hover:shadow-sm font-medium transition-all"
        >
          + Add Client
        </Link>
        <Link
          href="/projects/new"
          className="bg-white border border-gray-200 text-gray-700 rounded-lg p-4 text-center hover:border-blue-300 hover:shadow-sm font-medium transition-all"
        >
          + Add Project
        </Link>
      </div>

      {/* Recent Estimates */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {filter === "all" ? "Recent Estimates" : `${cards.find((c) => c.key === filter)?.label} Estimates`}
        </h2>
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No estimates found.</p>
            <Link href="/estimates/new" className="text-blue-600 hover:underline mt-2 inline-block">
              Create your first estimate
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.slice(0, 10).map((est) => (
              <Link
                key={est.id}
                href={`/estimates/${est.id}`}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all block"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{est.jobName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[est.status] || statusColors.draft}`}>
                        {est.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm">{est.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-700">${fmt(est.total)}</p>
                    <p className="text-gray-400 text-xs">
                      {new Date(est.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
