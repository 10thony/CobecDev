"use client";
import { SignOutButton as ClerkSignOutButton } from "@clerk/clerk-react";

export function SignOutButton() {
  return (
    <ClerkSignOutButton>
      <button className="px-4 py-2 rounded bg-white dark:bg-gray-800 text-secondary dark:text-gray-200 border border-gray-200 dark:border-gray-700 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-secondary-hover dark:hover:text-white transition-colors shadow-sm hover:shadow">
        Sign out
      </button>
    </ClerkSignOutButton>
  );
}
