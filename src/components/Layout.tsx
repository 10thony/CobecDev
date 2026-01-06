import { useQuery } from "convex/react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import { Target, ChevronLeft, ChevronRight, Map, Shield, Search, Database, Users, FileSearch, Globe, Settings, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const userRole = useQuery(api.userRoles.getCurrentUserRole);
  const isCobecAdmin = useQuery(api.cobecAdmins.checkIfUserIsCobecAdmin);
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);
  
  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);
  
  // Get HR dashboard components to build navigation
  const hrComponents = useQuery(api.hrDashboardComponents.getAllComponents);
  const visibleComponentIds = useQuery(api.hrDashboardComponents.getVisibleComponents);
  
  // Hide sidebar only on leads management page
  const isLeadsManagement = location.pathname === '/leads-management';
  
  // Check if user is admin (either system admin or cobec admin)
  const isAdmin = userRole === "admin" || isCobecAdmin === true;

  // Component ID to route and icon mapping
  const componentRouteMap: Record<string, { path: string; icon: typeof Target; defaultLabel: string }> = {
    'procurement-links': { path: '/', icon: Globe, defaultLabel: 'Procurement Links' },
    'overview': { path: '/hr-overview', icon: Target, defaultLabel: 'HR Overview' },
    'search': { path: '/semantic-search', icon: Search, defaultLabel: 'Semantic Search' },
    'leads-management': { path: '/leads-management', icon: FileSearch, defaultLabel: 'Leads Management' },
    'kfc-management': { path: '/kfc-management', icon: Users, defaultLabel: 'KFC Management' },
    'data-management': { path: '/data-management', icon: Database, defaultLabel: 'Data Management' },
    'embeddings': { path: '/embedding-management', icon: Settings, defaultLabel: 'Embedding Management' },
  };

  // Build navigation items from visible components
  const buildNavigationItems = () => {
    const items: Array<{ to: string; icon: typeof Target; label: string; path: string }> = [];

    if (!hrComponents || !visibleComponentIds) {
      // While loading, show default items
      return [
        { to: '/', icon: Globe, label: 'Procurement Links', path: '/' },
        { to: '/government-links', icon: Map, label: 'Government Links', path: '/government-links' },
      ];
    }

    // If no visible components, show all (backward compatibility)
    const componentsToShow = visibleComponentIds.length === 0
      ? Object.keys(componentRouteMap)
      : visibleComponentIds;

    // Get sorted visible components
    const sortedComponents = hrComponents
      .filter(comp => componentsToShow.includes(comp.componentId))
      .sort((a, b) => {
        // Sort by order if available, otherwise by creation time
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return a.createdAt - b.createdAt;
      });

    // Add navigation items for each visible component
    sortedComponents.forEach(comp => {
      const routeInfo = componentRouteMap[comp.componentId];
      if (routeInfo) {
        items.push({
          to: routeInfo.path,
          icon: routeInfo.icon,
          label: comp.componentName || routeInfo.defaultLabel,
          path: routeInfo.path,
        });
      }
    });

    // Always add Government Links
    items.push({
      to: '/government-links',
      icon: Map,
      label: 'Government Links',
      path: '/government-links',
    });

    return items;
  };

  const navigationItems = buildNavigationItems();

  // Add admin panel if user is admin
  if (isAdmin) {
    navigationItems.push({
      to: "/admin-panel",
      icon: Shield,
      label: "Admin Panel",
      path: "/admin-panel"
    });
  }


  return (
    <div className="flex h-screen bg-tron-bg-deep">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && !isLeadsManagement && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Hidden only on Leads Management */}
      {!isLeadsManagement && (
        <>
          {/* Desktop Sidebar */}
          <div className={`hidden lg:flex relative flex-col transition-all duration-300 ease-in-out ${
            isCollapsed ? 'w-16' : 'w-64'
          } bg-tron-bg-panel border-r border-tron-cyan/20`}>
            
            {/* Collapse Toggle Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="absolute -right-3 top-4 z-10 bg-tron-bg-panel rounded-full p-1 border border-tron-cyan/20 hover:bg-tron-cyan/10"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-tron-white" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-tron-white" />
              )}
            </button>

            {/* Logo */}
            <div className="p-4 border-b border-tron-cyan/20">
              <Link to="/" className="flex items-center space-x-3">
                {isCollapsed ? (
                  <div className="text-2xl font-bold text-tron-white">C</div>
                ) : (
                  <div className="text-2xl font-bold text-tron-white">Cobecium</div>
                )}
              </Link>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-tron-cyan/20 text-tron-white"
                          : "text-tron-gray hover:text-tron-white hover:bg-tron-cyan/10"
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon size={isCollapsed ? 24 : 18} className="flex-shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Bottom Controls */}
            <div className="p-4 border-t border-tron-cyan/20">
              <SignOutButton 
                iconOnly={isCollapsed} 
                showText={!isCollapsed}
                className={isCollapsed ? 'justify-center' : ''}
              />
            </div>
          </div>

          {/* Mobile Sidebar Drawer */}
          <div className={`lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-tron-bg-panel border-r border-tron-cyan/20 transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            {/* Mobile Header */}
            <div className="p-4 border-b border-tron-cyan/20 flex items-center justify-between">
              <Link to="/" className="text-xl font-bold text-tron-white">
                Cobecium
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-tron-gray hover:text-tron-white transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 p-4 overflow-y-auto">
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
                          ? "bg-tron-cyan/20 text-tron-white"
                          : "text-tron-gray hover:text-tron-white hover:bg-tron-cyan/10"
                      }`}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Bottom Controls */}
            <div className="p-4 border-t border-tron-cyan/20">
              <SignOutButton showText={true} />
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header with Menu Button */}
        {!isLeadsManagement && (
          <div className="lg:hidden bg-tron-bg-panel border-b border-tron-cyan/20 px-4 py-3 flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-tron-gray hover:text-tron-white transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="ml-3 text-lg font-bold text-tron-white">
              Cobecium
            </Link>
          </div>
        )}
        
        <main className="flex-1 overflow-auto bg-tron-bg-deep">
          {children}
        </main>
      </div>
    </div>
  );
}
