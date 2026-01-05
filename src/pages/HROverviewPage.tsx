import React from 'react';
import { HRDashboard } from '../components/HRDashboard';

export function HROverviewPage() {
  return (
    <div className="min-h-screen bg-tron-bg-deep">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HRDashboard />
      </div>
    </div>
  );
}

