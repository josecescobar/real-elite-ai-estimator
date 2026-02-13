"use client";

import { useState, useEffect, useRef } from "react";
import { scoreDescription, getStaticTips } from "@/lib/description-scoring";

interface Props {
  description: string;
}

export default function DescriptionScore({ description }: Props) {
  const clientScore = scoreDescription(description);
  const staticTips = getStaticTips(clientScore.breakdown);

  const [aiTips, setAiTips] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedRef = useRef("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = description.trim();
    if (trimmed.length < 20 || trimmed === lastFetchedRef.current) return;

    debounceRef.current = setTimeout(async () => {
      lastFetchedRef.current = trimmed;
      setAiLoading(true);
      try {
        const res = await fetch("/api/ai/score-description", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: trimmed }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.tips?.length) setAiTips(data.tips);
        }
      } catch {
        // Silently fall back to static tips
      } finally {
        setAiLoading(false);
      }
    }, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [description]);

  const displayTips = aiTips.length > 0 ? aiTips : staticTips;
  const scorePercent = (clientScore.score / 10) * 100;

  // Color based on score
  let ringColor = "text-red-500";
  let bgColor = "text-red-50";
  if (clientScore.score > 6) { ringColor = "text-green-500"; bgColor = "text-green-50"; }
  else if (clientScore.score > 3) { ringColor = "text-yellow-500"; bgColor = "text-yellow-50"; }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Description Quality</h3>

      {/* Circular score indicator */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18" cy="18" r="15.9155"
              fill="none" stroke="#e5e7eb" strokeWidth="3"
            />
            <circle
              cx="18" cy="18" r="15.9155"
              fill="none"
              className={ringColor}
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${scorePercent} ${100 - scorePercent}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">{clientScore.score}</span>
          </div>
        </div>
        <div>
          <p className="font-medium text-gray-900">{clientScore.label}</p>
          <p className="text-xs text-gray-500">out of 10</p>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-2 mb-4">
        {([
          ["Length", clientScore.breakdown.length, 2],
          ["Specificity", clientScore.breakdown.specificity, 3],
          ["Dimensions", clientScore.breakdown.dimensions, 2],
          ["Materials", clientScore.breakdown.materials, 2],
          ["Scope", clientScore.breakdown.scope, 1],
        ] as [string, number, number][]).map(([label, value, max]) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-gray-600">{label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${value === max ? "bg-green-500" : value > 0 ? "bg-yellow-400" : "bg-gray-200"}`}
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
            <span className="text-gray-400 w-8 text-right">{value}/{max}</span>
          </div>
        ))}
      </div>

      {/* Tips */}
      {description.trim().length > 0 && displayTips.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
            {aiTips.length > 0 ? "AI Tips" : "Tips to improve"}
            {aiLoading && (
              <span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            )}
          </h4>
          <ul className="space-y-1.5">
            {displayTips.map((tip, i) => (
              <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                <span className="text-purple-500 flex-shrink-0 mt-0.5">&#x2022;</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
