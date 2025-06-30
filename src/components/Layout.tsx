import { useQuery } from "convex/react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import { Sidebar } from "./Sidebar";
import { DarkModeToggle } from "./DarkModeToggle";
import { Palette, Search, Database } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const userRole = useQuery(api.userRoles.getCurrentUserRole);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                AJ.Chat
              </Link>
              <Link
                to="/vector-search"
                className={`px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-1 ${
                  location.pathname === "/vector-search"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Search size={14} />
                <span>Vector Search</span>
              </Link>
              <Link
                to="/data-management"
                className={`px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-1 ${
                  location.pathname === "/data-management"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Database size={14} />
                <span>Data Management</span>
              </Link>
              {userRole === "admin" && (
                <Link
                  to="/admin"
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    location.pathname === "/admin"
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/theme-config"
                className={`p-2 rounded-md text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors ${
                  location.pathname === "/theme-config"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : ""
                }`}
                aria-label="Theme Configuration"
              >
                <Palette className="w-5 h-5" />
              </Link>
              <DarkModeToggle />
              <SignOutButton />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}
