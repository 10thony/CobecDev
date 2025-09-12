import { useQuery } from "convex/react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import { DarkModeToggle } from "./DarkModeToggle";
import { Palette, Database, Trophy, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const userRole = useQuery(api.userRoles.getCurrentUserRole);
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Hide sidebar on HR dashboard page
  const isHRDashboard = location.pathname === '/hr-dashboard';

  const navigationItems = [
    {
      to: "/data-management",
      icon: Database,
      label: "Data Management",
      path: "/data-management"
    },
    {
      to: "/kfc-management", 
      icon: Trophy,
      label: "KFC Management",
      path: "/kfc-management"
    },
    {
      to: "/hr-dashboard",
      icon: Target,
      label: "HR Dashboard", 
      path: "/hr-dashboard"
    }
  ];


  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Hidden on HR Dashboard */}
      {!isHRDashboard && (
        <div className={`relative flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}>
        
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-4 z-10 bg-white dark:bg-gray-800 rounded-full p-1 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* Logo */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Link to="/" className="flex items-center space-x-3">
            {isCollapsed ? (
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">A</div>
            ) : (
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">AJAI</div>
            )}
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <Icon size={18} />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Controls */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Link
            to="/theme-config"
            className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === "/theme-config"
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
            aria-label="Theme Configuration"
          >
            <Palette size={18} />
            {!isCollapsed && <span>Theme Config</span>}
          </Link>
          
          <div className="flex items-center space-x-3 px-3 py-2">
            <DarkModeToggle />
            {!isCollapsed && <span className="text-sm text-gray-600 dark:text-gray-300">Dark Mode</span>}
          </div>
          
          <div className="flex items-center space-x-3 px-3 py-2">
            <SignOutButton />
            {!isCollapsed && <span className="text-sm text-gray-600 dark:text-gray-300">Sign Out</span>}
          </div>
        </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}
