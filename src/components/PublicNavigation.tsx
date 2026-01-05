import { Link, useLocation } from 'react-router-dom';
import { Globe, Map } from 'lucide-react';

interface PublicNavItem {
  path: string;
  label: string;
  icon: typeof Globe;
}

const publicNavItems: PublicNavItem[] = [
  { path: '/', label: 'Procurement Links', icon: Globe },
  { path: '/government-links', label: 'Government Links', icon: Map },
];

export function PublicNavigation() {
  const location = useLocation();

  return (
    <nav className="flex items-center gap-1">
      {publicNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || 
          (item.path === '/' && location.pathname === '/procurement-links');
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-tron-cyan/20 text-tron-cyan border border-tron-cyan/30'
                : 'text-tron-gray hover:text-tron-white hover:bg-tron-bg-elevated'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

