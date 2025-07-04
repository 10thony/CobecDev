import React from 'react';
import { TeamsDataManagementProps } from '../types';

export function TeamsDataManagement({ teamsContext, onNavigate }: TeamsDataManagementProps) {
  return (
    <div>
      <h2>Data Management (Teams Version)</h2>
      <p>This component will be migrated from the original DataManagementPage.</p>
      <p>Teams Context: {teamsContext ? 'Available' : 'Not Available'}</p>
      <button onClick={() => onNavigate('vector-search')}>
        Navigate to Vector Search
      </button>
      <button onClick={() => onNavigate('kfc-management')}>
        Navigate to KFC Management
      </button>
    </div>
  );
} 