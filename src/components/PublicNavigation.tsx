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
    <nav className="flex items-center gap-1 overflow-x-auto">
      {publicNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || 
          (item.path === '/' && location.pathname === '/procurement-links');
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-tron-cyan/20 text-tron-cyan border border-tron-cyan/30'
                : 'text-tron-gray hover:text-tron-white hover:bg-tron-bg-elevated'
            }`}
          >
            <Icon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.label.split(' ')[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

