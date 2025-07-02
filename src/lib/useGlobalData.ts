import { useState, useEffect } from 'react';
import globalDataService, { GlobalDataState } from './globalDataService';

export function useGlobalData() {
  const [state, setState] = useState<GlobalDataState>(globalDataService.getState());

  useEffect(() => {
    // Subscribe to global data changes
    const unsubscribe = globalDataService.subscribe(setState);
    
    // Load data if not already loaded
    if (state.kfcEntries.length === 0 && !state.isLoading) {
      globalDataService.loadAllData();
    }

    return unsubscribe;
  }, []);

  return {
    ...state,
    refreshData: () => globalDataService.loadAllData(true),
    refreshKfcData: () => globalDataService.refreshKfcData(),
    addEmployee: (name: string) => globalDataService.addEmployee(name),
    removeEmployee: (employeeId: string) => globalDataService.removeEmployee(employeeId)
  };
} 