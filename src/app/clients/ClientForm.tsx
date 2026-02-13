"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ClientData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  notes: string;
}

export default function ClientForm({ initial }: { initial?: ClientData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(initial?.name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [company, setCompany] = useState(initial?.company || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  async function handleSave() {
    if (!name.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      const payload = { name, email, phone, company, address, notes };
      const url = initial?.id ? `/api/clients/${initial.id}` : "/api/clients";
      const method = initial?.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      if (!initial?.id) {
        router.push(`/clients/${data.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert("Error saving client: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("Delete this client? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/clients/${initial.id}`, { method: "DELETE" });
      router.push("/clients");
    } catch {
      alert("Error deleting client");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">Client Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. (555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. Smith Construction"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. 123 Main St, City, State"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows={3}
              placeholder="Any notes about this client..."
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : initial?.id ? "Update Client" : "Save Client"}
        </button>
        {initial?.id && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}
