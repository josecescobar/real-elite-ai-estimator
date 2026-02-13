"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Nav() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-700">
          Real Elite Estimator
        </Link>
        <div className="flex gap-4 items-center">
          {session?.user ? (
            <>
              <Link href="/estimates" className="text-gray-600 hover:text-blue-700 font-medium">
                Estimates
              </Link>
              <Link href="/clients" className="text-gray-600 hover:text-blue-700 font-medium">
                Clients
              </Link>
              <Link href="/projects" className="text-gray-600 hover:text-blue-700 font-medium">
                Projects
              </Link>
              <Link
                href="/estimates/new"
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 font-medium text-sm"
              >
                + New Estimate
              </Link>
              <span className="text-sm text-gray-500">{session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-gray-500 hover:text-red-600 text-sm font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-blue-700 font-medium">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 font-medium text-sm"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
