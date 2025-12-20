import React from 'react';
import { JobPostingsGrid } from '../components/JobPostingsGrid';

export function JobPostingsPage() {
  return (
    <div className="min-h-screen bg-oxford_blue-500">
      <div className="max-w-7xl mx-auto">
        <JobPostingsGrid />
      </div>
    </div>
  );
}

