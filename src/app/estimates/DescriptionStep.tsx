"use client";

import { useState } from "react";
import DescriptionScore from "./DescriptionScore";

interface Props {
  onContinue: (jobType: string, description: string) => void;
}

export default function DescriptionStep({ onContinue }: Props) {
  const [jobType, setJobType] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
      {/* Left column: inputs */}
      <div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-semibold mb-4">Describe the Job</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Type <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g. Kitchen Remodel, Roof Repair, Bathroom Renovation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                rows={8}
                placeholder="Describe the project in detail. Include measurements, materials, scope of work, and any special requirements. The more detail you provide, the more accurate your AI-generated estimate will be."
              />
              <p className="text-xs text-gray-400 mt-1">
                {description.trim().split(/\s+/).filter(Boolean).length} words
              </p>
            </div>
            <button
              onClick={() => onContinue(jobType, description)}
              disabled={!description.trim()}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 w-full sm:w-auto"
            >
              Continue to Estimate
            </button>
          </div>
        </div>
      </div>

      {/* Right column: scoring */}
      <div>
        <DescriptionScore description={description} />
      </div>
    </div>
  );
}
