import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface VisibilityWrapperProps {
  componentId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wrapper component that only renders children if the component is enabled.
 * Uses the hrDashboardComponents visibility system to check if a component should be shown.
 */
export function VisibilityWrapper({
  componentId,
  children,
  fallback = null,
}: VisibilityWrapperProps) {
  const visibleComponents = useQuery(api.hrDashboardComponents.getVisibleComponents);

  // While loading, don't render anything (or show a loading state)
  if (visibleComponents === undefined) {
    return (
      <div className="min-h-screen bg-tron-bg-deep flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tron-cyan"></div>
      </div>
    );
  }

  // Always include government-links even if not in visibleComponents
  // This ensures it's always available for authenticated users
  const alwaysVisibleComponents = ["government-links"];
  const isAlwaysVisible = alwaysVisibleComponents.includes(componentId);

  // If visibleComponents is empty array, show all components (backward compatibility)
  // Otherwise, only show if componentId is in the visibleComponents array
  const isVisible =
    isAlwaysVisible ||
    visibleComponents.length === 0 ||
    visibleComponents.includes(componentId);

  if (!isVisible) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

