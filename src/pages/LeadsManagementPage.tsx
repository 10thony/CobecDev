import React from 'react';
import { LeadsManagement } from '../components/LeadsManagement';

export function LeadsManagementPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <LeadsManagement />
      </div>
    </div>
  );
}
