"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CustomerResponseForm({
  estimateId,
  shareToken,
}: {
  estimateId: string;
  shareToken: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"approved" | "changes_requested" | "">("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!status) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, message, shareToken }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
      router.refresh();
    } catch {
      alert("Error submitting response");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <p className="text-green-700 font-medium text-lg">Response submitted successfully!</p>
        <p className="text-green-600 text-sm mt-1">The contractor has been notified.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Your Response</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStatus("approved")}
            className={`flex-1 py-3 rounded-lg font-medium text-sm border-2 transition-all ${
              status === "approved"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-gray-200 text-gray-600 hover:border-green-300"
            }`}
          >
            Approve Estimate
          </button>
          <button
            type="button"
            onClick={() => setStatus("changes_requested")}
            className={`flex-1 py-3 rounded-lg font-medium text-sm border-2 transition-all ${
              status === "changes_requested"
                ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                : "border-gray-200 text-gray-600 hover:border-yellow-300"
            }`}
          >
            Request Changes
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message {status === "changes_requested" && <span className="text-gray-400">(describe what changes you&apos;d like)</span>}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            rows={3}
            placeholder={
              status === "changes_requested"
                ? "Please describe what changes you'd like..."
                : "Any comments (optional)..."
            }
          />
        </div>

        <button
          type="submit"
          disabled={!status || submitting}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Response"}
        </button>
      </form>
    </div>
  );
}
