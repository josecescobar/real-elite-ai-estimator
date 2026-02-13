"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectData {
  id?: string;
  name: string;
  description: string;
  address: string;
  status: string;
}

export default function ProjectForm({ initial }: { initial?: ProjectData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [status, setStatus] = useState(initial?.status || "active");

  async function handleSave() {
    if (!name.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      const payload = { name, description, address, status };
      const url = initial?.id ? `/api/projects/${initial.id}` : "/api/projects";
      const method = initial?.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      if (!initial?.id) {
        router.push(`/projects/${data.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert("Error saving project: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/projects/${initial.id}`, { method: "DELETE" });
      router.push("/projects");
    } catch {
      alert("Error deleting project");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">Project Details</h2>
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
              placeholder="e.g. Smith Residence Remodel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows={3}
              placeholder="Describe the project scope..."
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
          {saving ? "Saving..." : initial?.id ? "Update Project" : "Save Project"}
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
