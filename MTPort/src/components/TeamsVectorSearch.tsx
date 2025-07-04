import React from 'react';
import { TeamsVectorSearchProps } from '../types';

export function TeamsVectorSearch({ teamsContext, onNavigate }: TeamsVectorSearchProps) {
  return (
    <div>
      <h2>Vector Search (Teams Version)</h2>
      <p>This component will be migrated from the original VectorSearchPage.</p>
      <p>Teams Context: {teamsContext ? 'Available' : 'Not Available'}</p>
      <button onClick={() => onNavigate('data-management')}>
        Navigate to Data Management
      </button>
      <button onClick={() => onNavigate('kfc-management')}>
        Navigate to KFC Management
      </button>
    </div>
  );
} 