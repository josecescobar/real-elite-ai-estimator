import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Real Elite AI Estimator
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md">
        Create professional construction estimates with materials, labor, and markup calculations.
      </p>
      <div className="flex gap-4">
        <Link
          href="/estimates/new"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold text-lg"
        >
          Create New Estimate
        </Link>
        <Link
          href="/estimates"
          className="bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 font-semibold text-lg"
        >
          View Estimates
        </Link>
      </div>
    </div>
  );
}
