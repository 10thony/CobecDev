import { Link, useLocation } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import * as LucideIcons from 'lucide-react';

// Component ID to icon mapping for hrDashboardComponents
const componentIconMap: Record<string, string> = {
  'procurement-links': 'Globe',
  'government-links': 'Map',
  'leads-management': 'FileSearch',
};

// Icon mapping - maps string icon names to lucide-react icon components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe: LucideIcons.Globe,
  Map: LucideIcons.Map,
  Home: LucideIcons.Home,
  Link: LucideIcons.Link,
  Navigation: LucideIcons.Navigation,
  Menu: LucideIcons.Menu,
  Settings: LucideIcons.Settings,
  Search: LucideIcons.Search,
  FileText: LucideIcons.FileText,
  Building: LucideIcons.Building,
  Building2: LucideIcons.Building2,
  MapPin: LucideIcons.MapPin,
  Target: LucideIcons.Target,
  Briefcase: LucideIcons.Briefcase,
  Folder: LucideIcons.Folder,
  FolderOpen: LucideIcons.FolderOpen,
  FileSearch: LucideIcons.FileSearch,
  // Add more icons as needed
};

// Default icon if icon name not found
const DefaultIcon = LucideIcons.Link;

export function PublicNavigation() {
  const location = useLocation();
  const navItems = useQuery(api.publicNavigation.getVisible);
  const publicComponents = useQuery(api.hrDashboardComponents.getPublicComponents);

  // Fallback items if query fails or returns empty
  const fallbackItems = [
    { _id: 'fallback-1' as any, path: '/', label: 'Procurement Links', icon: 'Globe' },
    { _id: 'fallback-2' as any, path: '/government-links', label: 'Government Links', icon: 'Map' },
  ];

  // Show nothing while loading
  if (navItems === undefined || publicComponents === undefined) {
    return (
      <nav className="flex items-center gap-1 overflow-x-auto">
        <div className="flex items-center gap-2 px-2 sm:px-3 md:px-4 py-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-tron-cyan/30 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </nav>
    );
  }

  // Merge publicNavigationItems with public components from hrDashboardComponents
  const publicNavItems = (navItems || []).map(item => ({
    _id: item._id,
    path: item.path,
    label: item.label,
    icon: item.icon,
    order: item.order,
  }));

  // Add public components from hrDashboardComponents that aren't already in publicNavItems
  const existingPaths = new Set(publicNavItems.map(item => item.path));
  const additionalItems = (publicComponents || [])
    .filter(comp => !existingPaths.has(comp.path))
    .map(comp => ({
      _id: `hr-${comp.componentId}` as any,
      path: comp.path,
      label: comp.componentName,
      icon: comp.icon,
      order: comp.order || 999,
    }));

  // Combine and sort by order
  const allItems = [...publicNavItems, ...additionalItems].sort((a, b) => {
    const orderA = a.order || 999;
    const orderB = b.order || 999;
    return orderA - orderB;
  });

  // Use fallback items if no items found
  const itemsToRender = (allItems && allItems.length > 0) ? allItems : fallbackItems;

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {itemsToRender.map((item) => {
        // Get icon component from map, fallback to DefaultIcon
        const IconComponent = iconMap[item.icon] || DefaultIcon;
        const isActive = location.pathname === item.path || 
          (item.path === '/' && location.pathname === '/procurement-links');
        
        return (
          <Link
            key={item._id}
            to={item.path}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-tron-cyan/20 text-tron-cyan border border-tron-cyan/30'
                : 'text-tron-gray hover:text-tron-white hover:bg-tron-bg-elevated'
            }`}
          >
            <IconComponent className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.label.split(' ')[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

