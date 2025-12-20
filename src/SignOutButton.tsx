"use client";
import { SignOutButton as ClerkSignOutButton } from "@clerk/clerk-react";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  iconOnly?: boolean;
  showText?: boolean;
  className?: string;
}

export function SignOutButton({ iconOnly = false, showText = false, className = "" }: SignOutButtonProps) {
  return (
    <ClerkSignOutButton>
      {iconOnly ? (
        <button 
          className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-tron-gray hover:text-tron-white hover:bg-tron-cyan/10 ${className}`}
          aria-label="Sign out"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {showText && <span>Sign Out</span>}
        </button>
      ) : (
        <button className="px-4 py-2 rounded bg-yale_blue-500 text-mint_cream-500 border border-powder_blue-400 font-semibold hover:bg-yale_blue-600 hover:text-mint_cream-600 transition-colors shadow-sm hover:shadow">
          Sign out
        </button>
      )}
    </ClerkSignOutButton>
  );
}
