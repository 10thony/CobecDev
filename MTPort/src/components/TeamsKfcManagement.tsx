import React from 'react';
import { TeamsKfcManagementProps } from '../types';

export function TeamsKfcManagement({ teamsContext, onNavigate }: TeamsKfcManagementProps) {
  return (
    <div>
      <h2>KFC Management (Teams Version)</h2>
      <p>This component will be migrated from the original KfcManagementPage.</p>
      <p>Teams Context: {teamsContext ? 'Available' : 'Not Available'}</p>
      <button onClick={() => onNavigate('vector-search')}>
        Navigate to Vector Search
      </button>
      <button onClick={() => onNavigate('data-management')}>
        Navigate to Data Management
      </button>
    </div>
  );
} 