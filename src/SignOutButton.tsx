"use client";
import { SignOutButton as ClerkSignOutButton } from "@clerk/clerk-react";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  iconOnly?: boolean;
}

export function SignOutButton({ iconOnly = false }: SignOutButtonProps) {
  return (
    <ClerkSignOutButton>
      {iconOnly ? (
        <button 
          className="p-2 rounded-md text-tron-gray hover:text-tron-white hover:bg-tron-cyan/10 transition-colors"
          aria-label="Sign out"
        >
          <LogOut size={24} />
        </button>
      ) : (
        <button className="px-4 py-2 rounded bg-yale_blue-500 text-mint_cream-500 border border-powder_blue-400 font-semibold hover:bg-yale_blue-600 hover:text-mint_cream-600 transition-colors shadow-sm hover:shadow">
          Sign out
        </button>
      )}
    </ClerkSignOutButton>
  );
}
