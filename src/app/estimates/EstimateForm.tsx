"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface LineItem {
  name: string;
  unit: string;
  qty: number;
  unitCost: number;
  laborHours: number;
  laborRate: number;
  markupPct: number;
}

interface EstimateData {
  id?: string;
  customerName: string;
  jobName: string;
  address: string;
  notes: string;
  status?: string;
  shareToken?: string | null;
  lineItems: LineItem[];
}

const emptyLineItem: LineItem = {
  name: "",
  unit: "ea",
  qty: 1,
  unitCost: 0,
  laborHours: 0,
  laborRate: 0,
  markupPct: 0,
};

function calcLineTotal(item: LineItem) {
  const materials = item.qty * item.unitCost;
  const labor = item.laborHours * item.laborRate;
  const subtotal = materials + labor;
  return subtotal + subtotal * (item.markupPct / 100);
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

export default function EstimateForm({ initial }: { initial?: EstimateData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [customerName, setCustomerName] = useState(initial?.customerName || "");
  const [jobName, setJobName] = useState(initial?.jobName || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initial?.lineItems?.length ? initial.lineItems : [{ ...emptyLineItem }]
  );
  const [status, setStatus] = useState(initial?.status || "draft");
  const [shareToken, setShareToken] = useState(initial?.shareToken || null);

  // AI Suggest state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiJobType, setAiJobType] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Share state
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateItem = useCallback((index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addItem = () => setLineItems((prev) => [...prev, { ...emptyLineItem }]);

  const removeItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live totals
  let totalMaterials = 0;
  let totalLabor = 0;
  let totalMarkup = 0;
  for (const item of lineItems) {
    const materials = item.qty * item.unitCost;
    const labor = item.laborHours * item.laborRate;
    const subtotal = materials + labor;
    totalMaterials += materials;
    totalLabor += labor;
    totalMarkup += subtotal * (item.markupPct / 100);
  }
  const grandTotal = totalMaterials + totalLabor + totalMarkup;

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { customerName, jobName, address, notes, lineItems };
      const url = initial?.id ? `/api/estimates/${initial.id}` : "/api/estimates";
      const method = initial?.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      if (!initial?.id) {
        router.push(`/estimates/${data.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert("Error saving estimate: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("Delete this estimate? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/estimates/${initial.id}`, { method: "DELETE" });
      router.push("/estimates");
    } catch {
      alert("Error deleting estimate");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAiSuggest() {
    setAiError("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobType: aiJobType, description: aiDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get suggestions");
      setLineItems(data.lineItems);
      setShowAiModal(false);
      setAiJobType("");
      setAiDescription("");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleShare() {
    if (!initial?.id) return;
    setSharing(true);
    try {
      const res = await fetch(`/api/estimates/${initial.id}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to share");
      setShareToken(data.shareToken);
      setStatus("sent");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error sharing");
    } finally {
      setSharing(false);
    }
  }

  async function handleRevokeShare() {
    if (!initial?.id) return;
    try {
      await fetch(`/api/estimates/${initial.id}/share`, { method: "DELETE" });
      setShareToken(null);
    } catch {
      alert("Error revoking share link");
    }
  }

  function copyShareLink() {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* Status badge for existing estimates */}
      {initial?.id && (
        <div className="mb-4 flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[status] || statusColors.draft}`}>
            {status.replace("_", " ")}
          </span>
        </div>
      )}

      {/* Header info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">Estimate Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Name</label>
            <input
              type="text"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. Kitchen Remodel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. 123 Main St"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Any special notes..."
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Line Items</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAiModal(true)}
              className="bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 text-sm font-medium"
            >
              AI Suggest
            </button>
            <button
              onClick={addItem}
              className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              + Add Item
            </button>
          </div>
        </div>

        {/* Desktop table header */}
        <div className="hidden lg:grid lg:grid-cols-[2fr_80px_60px_100px_80px_100px_80px_40px] gap-2 text-xs font-medium text-gray-500 uppercase mb-2 px-1">
          <span>Name</span>
          <span>Unit</span>
          <span>Qty</span>
          <span>Unit Cost</span>
          <span>Labor Hrs</span>
          <span>Labor Rate</span>
          <span>Markup %</span>
          <span></span>
        </div>

        <div className="space-y-3">
          {lineItems.map((item, i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-lg p-3 lg:p-1 lg:border-0 lg:rounded-none"
            >
              {/* Desktop row */}
              <div className="hidden lg:grid lg:grid-cols-[2fr_80px_60px_100px_80px_100px_80px_40px] gap-2 items-center">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Item name"
                />
                <select
                  value={item.unit}
                  onChange={(e) => updateItem(i, "unit", e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="ea">ea</option>
                  <option value="sqft">sqft</option>
                  <option value="lnft">lnft</option>
                  <option value="job">job</option>
                  <option value="hr">hr</option>
                  <option value="ton">ton</option>
                  <option value="gal">gal</option>
                </select>
                <input
                  type="number"
                  value={item.qty}
                  onChange={(e) => updateItem(i, "qty", parseFloat(e.target.value) || 0)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  min="0"
                  step="any"
                />
                <input
                  type="number"
                  value={item.unitCost}
                  onChange={(e) => updateItem(i, "unitCost", parseFloat(e.target.value) || 0)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  min="0"
                  step="any"
                />
                <input
                  type="number"
                  value={item.laborHours}
                  onChange={(e) => updateItem(i, "laborHours", parseFloat(e.target.value) || 0)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  min="0"
                  step="any"
                />
                <input
                  type="number"
                  value={item.laborRate}
                  onChange={(e) => updateItem(i, "laborRate", parseFloat(e.target.value) || 0)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  min="0"
                  step="any"
                />
                <input
                  type="number"
                  value={item.markupPct}
                  onChange={(e) => updateItem(i, "markupPct", parseFloat(e.target.value) || 0)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  min="0"
                  step="any"
                />
                <button
                  onClick={() => removeItem(i)}
                  className="text-red-500 hover:text-red-700 text-lg font-bold"
                  title="Remove item"
                >
                  x
                </button>
              </div>

              {/* Mobile layout */}
              <div className="lg:hidden space-y-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Item name"
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(i, "unit", e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    >
                      <option value="ea">ea</option>
                      <option value="sqft">sqft</option>
                      <option value="lnft">lnft</option>
                      <option value="job">job</option>
                      <option value="hr">hr</option>
                      <option value="ton">ton</option>
                      <option value="gal">gal</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Qty</label>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateItem(i, "qty", parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      min="0"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Unit Cost</label>
                    <input
                      type="number"
                      value={item.unitCost}
                      onChange={(e) => updateItem(i, "unitCost", parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      min="0"
                      step="any"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Labor Hrs</label>
                    <input
                      type="number"
                      value={item.laborHours}
                      onChange={(e) => updateItem(i, "laborHours", parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      min="0"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Labor Rate</label>
                    <input
                      type="number"
                      value={item.laborRate}
                      onChange={(e) => updateItem(i, "laborRate", parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      min="0"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Markup %</label>
                    <input
                      type="number"
                      value={item.markupPct}
                      onChange={(e) => updateItem(i, "markupPct", parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      min="0"
                      step="any"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Line total: ${fmt(calcLineTotal(item))}
                  </span>
                  <button
                    onClick={() => removeItem(i)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Desktop line total */}
              <div className="hidden lg:block text-right text-sm text-gray-600 mt-1 pr-10">
                Line total: ${fmt(calcLineTotal(item))}
              </div>
            </div>
          ))}
        </div>

        {lineItems.length === 0 && (
          <p className="text-gray-400 text-center py-8">
            No line items. Click &quot;+ Add Item&quot; or &quot;AI Suggest&quot; to get started.
          </p>
        )}
      </div>

      {/* Totals */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-3">Totals</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-gray-700">
            <span>Materials</span>
            <span>${fmt(totalMaterials)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Labor</span>
            <span>${fmt(totalLabor)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Markup</span>
            <span>${fmt(totalMarkup)}</span>
          </div>
          <hr />
          <div className="flex justify-between text-xl font-bold text-green-700">
            <span>Total</span>
            <span>${fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Share section */}
      {initial?.id && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="text-lg font-semibold mb-3">Share with Customer</h2>
          {shareToken ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareToken}`}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
                />
                <button
                  onClick={copyShareLink}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <button
                onClick={handleRevokeShare}
                className="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                Revoke share link
              </button>
            </div>
          ) : (
            <button
              onClick={handleShare}
              disabled={sharing}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
            >
              {sharing ? "Generating..." : "Generate Share Link"}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : initial?.id ? "Update Estimate" : "Save Estimate"}
        </button>

        {initial?.id && (
          <>
            <a
              href={`/api/estimates/${initial.id}/pdf`}
              className="bg-gray-700 text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 font-medium inline-block"
            >
              Download PDF
            </a>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </>
        )}
      </div>

      {/* AI Suggest Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">AI Cost Suggestions</h3>
            <div className="space-y-4">
              {aiError && (
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{aiError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={aiJobType}
                  onChange={(e) => setAiJobType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  placeholder="e.g. Kitchen Remodel, Roof Repair"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  rows={4}
                  placeholder="Describe the job in detail... e.g. Full kitchen remodel including new countertops, backsplash, cabinet refacing, and plumbing updates. Kitchen is approximately 200 sqft."
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowAiModal(false);
                    setAiError("");
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAiSuggest}
                  disabled={aiLoading || !aiDescription.trim()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50"
                >
                  {aiLoading ? "Generating..." : "Generate Line Items"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
