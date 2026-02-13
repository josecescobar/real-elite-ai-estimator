"use client";

import { useState } from "react";
import DescriptionStep from "./DescriptionStep";
import EstimateForm from "./EstimateForm";

export default function NewEstimateFlow() {
  const [step, setStep] = useState<1 | 2>(1);
  const [jobType, setJobType] = useState("");
  const [description, setDescription] = useState("");

  function handleContinue(jt: string, desc: string) {
    setJobType(jt);
    setDescription(desc);
    setStep(2);
  }

  if (step === 1) {
    return <DescriptionStep onContinue={handleContinue} />;
  }

  return (
    <div>
      <button
        onClick={() => setStep(1)}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-flex items-center gap-1"
      >
        &larr; Back to description
      </button>
      <EstimateForm
        initialDescription={description}
        initialJobType={jobType}
      />
    </div>
  );
}
