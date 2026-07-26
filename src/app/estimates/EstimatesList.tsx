"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface EstimateRow {
  id: string;
  jobName: string;
  customerName: string;
  address: string;
  status: string;
  total: number;
  itemCount: number;
  createdAt: string; // ISO
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  changes_requested: "bg-yellow-100 text-yellow-700",
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "changes_requested", label: "Changes" },
];

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EstimatesList({ estimates }: { estimates: EstimateRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: estimates.length };
    for (const e of estimates) c[e.status] = (c[e.status] || 0) + 1;
    return c;
  }, [estimates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return estimates.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (!q) return true;
      return (
        e.jobName.toLowerCase().includes(q) ||
        e.customerName.toLowerCase().includes(q) ||
        e.address.toLowerCase().includes(q)
      );
    });
  }, [estimates, query, status]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const byDate = (a: EstimateRow, b: EstimateRow) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    switch (sort) {
      case "oldest":
        return arr.sort(byDate);
      case "highest":
        return arr.sort((a, b) => b.total - a.total);
      case "lowest":
        return arr.sort((a, b) => a.total - b.total);
      default: // newest
        return arr.sort((a, b) => byDate(b, a));
    }
  }, [filtered, sort]);

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by job, customer, or address..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Sort estimates"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest total</option>
            <option value="lowest">Lowest total</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`text-sm px-3 py-1.5 rounded-full font-medium border transition-colors ${
                status === f.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {f.label}
              <span className={status === f.value ? "text-blue-100" : "text-gray-400"}>
                {" "}
                {counts[f.value] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No estimates match your search.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sorted.map((est) => (
            <Link
              key={est.id}
              href={`/estimates/${est.id}`}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all block"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold text-gray-900">{est.jobName}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[est.status] || statusColors.draft}`}>
                      {est.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-gray-600">{est.customerName}</p>
                  {est.address && <p className="text-gray-400 text-sm">{est.address}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-700">${money(est.total)}</p>
                  <p className="text-gray-400 text-sm">
                    {est.itemCount} item{est.itemCount !== 1 ? "s" : ""}
                  </p>
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
  );
}
