// Frontend integration example for opportunities functionality
// This shows how to use the opportunities mutations and queries in a React component

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

interface Opportunity {
  _id: string;
  opportunityType: string;
  opportunityTitle: string;
  contractID?: string;
  issuingBody: {
    name: string;
    level: string;
  };
  location: {
    city?: string;
    county?: string;
    region: string;
  };
  status: string;
  estimatedValueUSD?: number;
  keyDates: {
    publishedDate: string;
    bidDeadline?: string;
    projectedStartDate?: string;
  };
  source: {
    documentName: string;
    url: string;
  };
  summary: string;
  category?: string;
  subcategory?: string;
  isActive?: boolean;
  createdAt: number;
  updatedAt: number;
}

export function OpportunitiesDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');

  // Queries
  const allOpportunities = useQuery(api.opportunities.getAllOpportunities, {});
  const opportunitiesStats = useQuery(api.opportunities.getOpportunitiesStats, {});
  const searchResults = useQuery(
    api.opportunities.searchOpportunities, 
    searchTerm ? { searchTerm } : "skip"
  );
  const filteredOpportunities = useQuery(
    api.opportunities.getOpportunitiesByFilters,
    {
      opportunityType: selectedType || undefined,
      issuingLevel: selectedLevel || undefined,
      region: selectedRegion || undefined,
      status: selectedStatus || undefined,
      category: selectedCategory || undefined,
      isActive: true,
      minValue: minValue ? parseFloat(minValue) : undefined,
      maxValue: maxValue ? parseFloat(maxValue) : undefined,
    }
  );

  // Mutations
  const createOpportunity = useMutation(api.opportunities.createOpportunity);
  const updateOpportunity = useMutation(api.opportunities.updateOpportunity);
  const deleteOpportunity = useMutation(api.opportunities.deleteOpportunity);
  const toggleOpportunityActive = useMutation(api.opportunities.toggleOpportunityActive);

  // Actions
  const importOpportunities = useAction(api.opportunitiesActions.importOpportunitiesFromJson);
  const exportOpportunities = useAction(api.opportunitiesActions.exportOpportunities);
  const getAnalytics = useAction(api.opportunitiesActions.getOpportunitiesAnalytics);

  // State for new opportunity form
  const [newOpportunity, setNewOpportunity] = useState({
    opportunityType: 'Public Sector',
    opportunityTitle: '',
    contractID: '',
    issuingBody: {
      name: '',
      level: 'State',
    },
    location: {
      city: '',
      county: '',
      region: '',
    },
    status: '',
    estimatedValueUSD: 0,
    keyDates: {
      publishedDate: '',
      bidDeadline: '',
      projectedStartDate: '',
    },
    source: {
      documentName: '',
      url: '',
    },
    summary: '',
    category: '',
    subcategory: '',
  });

  // Handle creating a new opportunity
  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOpportunity({
        ...newOpportunity,
        estimatedValueUSD: newOpportunity.estimatedValueUSD || undefined,
        contractID: newOpportunity.contractID || undefined,
        keyDates: {
          ...newOpportunity.keyDates,
          bidDeadline: newOpportunity.keyDates.bidDeadline || undefined,
          projectedStartDate: newOpportunity.keyDates.projectedStartDate || undefined,
        },
        location: {
          ...newOpportunity.location,
          city: newOpportunity.location.city || undefined,
          county: newOpportunity.location.county || undefined,
        },
        category: newOpportunity.category || undefined,
        subcategory: newOpportunity.subcategory || undefined,
      });
      // Reset form
      setNewOpportunity({
        opportunityType: 'Public Sector',
        opportunityTitle: '',
        contractID: '',
        issuingBody: { name: '', level: 'State' },
        location: { city: '', county: '', region: '' },
        status: '',
        estimatedValueUSD: 0,
        keyDates: { publishedDate: '', bidDeadline: '', projectedStartDate: '' },
        source: { documentName: '', url: '' },
        summary: '',
        category: '',
        subcategory: '',
      });
    } catch (error) {
      console.error('Error creating opportunity:', error);
    }
  };

  // Handle importing opportunities from JSON
  const handleImportOpportunities = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const opportunitiesData = data.opportunities || data; // Handle both formats
      await importOpportunities({
        opportunitiesData,
        sourceFile: file.name,
      });
    } catch (error) {
      console.error('Error importing opportunities:', error);
    }
  };

  // Handle exporting opportunities
  const handleExportOpportunities = async (format: 'json' | 'csv') => {
    try {
      const result = await exportOpportunities({ format });
      const blob = new Blob([result.data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opportunities-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting opportunities:', error);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get display opportunities based on search or filters
  const displayOpportunities = searchTerm ? searchResults : filteredOpportunities;

  if (!allOpportunities || !opportunitiesStats) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Texas Procurement Opportunities Dashboard</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">Total Opportunities</h3>
          <p className="text-2xl font-bold text-blue-900">{opportunitiesStats.total}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Active Opportunities</h3>
          <p className="text-2xl font-bold text-green-900">{opportunitiesStats.active}</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-800">Total Value</h3>
          <p className="text-2xl font-bold text-purple-900">
            {formatCurrency(opportunitiesStats.totalValue)}
          </p>
        </div>
        <div className="bg-orange-100 p-4 rounded-lg">
          <h3 className="font-semibold text-orange-800">Avg Value</h3>
          <p className="text-2xl font-bold text-orange-900">
            {formatCurrency(opportunitiesStats.averageValue)}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Search opportunities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Types</option>
            <option value="Public Sector">Public Sector</option>
            <option value="Private Sector">Private Sector</option>
          </select>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Levels</option>
            <option value="State">State</option>
            <option value="Regional">Regional</option>
            <option value="City">City</option>
            <option value="County">County</option>
          </select>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Regions</option>
            {Object.keys(opportunitiesStats.byRegion).map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Statuses</option>
            {Object.keys(opportunitiesStats.byStatus).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Categories</option>
            {Object.keys(opportunitiesStats.byCategory).map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Min Value ($)"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <input
            type="number"
            placeholder="Max Value ($)"
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        
        <div className="flex gap-2">
          <input
            type="file"
            accept=".json"
            onChange={(e) => e.target.files?.[0] && handleImportOpportunities(e.target.files[0])}
            className="hidden"
            id="import-file"
          />
          <label
            htmlFor="import-file"
            className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600"
          >
            Import JSON
          </label>
          <button
            onClick={() => handleExportOpportunities('json')}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Export JSON
          </button>
          <button
            onClick={() => handleExportOpportunities('csv')}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Add New Opportunity Form */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Opportunity</h2>
        <form onSubmit={handleCreateOpportunity} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Opportunity Title"
            value={newOpportunity.opportunityTitle}
            onChange={(e) => setNewOpportunity({...newOpportunity, opportunityTitle: e.target.value})}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="Contract ID (optional)"
            value={newOpportunity.contractID}
            onChange={(e) => setNewOpportunity({...newOpportunity, contractID: e.target.value})}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Issuing Body Name"
            value={newOpportunity.issuingBody.name}
            onChange={(e) => setNewOpportunity({
              ...newOpportunity, 
              issuingBody: {...newOpportunity.issuingBody, name: e.target.value}
            })}
            className="border rounded px-3 py-2"
            required
          />
          <select
            value={newOpportunity.issuingBody.level}
            onChange={(e) => setNewOpportunity({
              ...newOpportunity, 
              issuingBody: {...newOpportunity.issuingBody, level: e.target.value}
            })}
            className="border rounded px-3 py-2"
            required
          >
            <option value="State">State</option>
            <option value="Regional">Regional</option>
            <option value="City">City</option>
            <option value="County">County</option>
          </select>
          <input
            type="text"
            placeholder="City (optional)"
            value={newOpportunity.location.city}
            onChange={(e) => setNewOpportunity({
              ...newOpportunity, 
              location: {...newOpportunity.location, city: e.target.value}
            })}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="County (optional)"
            value={newOpportunity.location.county}
            onChange={(e) => setNewOpportunity({
              ...newOpportunity, 
              location: {...newOpportunity.location, county: e.target.value}
            })}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Region"
            value={newOpportunity.location.region}
            onChange={(e) => setNewOpportunity({
              ...newOpportunity, 
              location: {...newOpportunity.location, region: e.target.value}
            })}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="Status"
            value={newOpportunity.status}
            onChange={(e) => setNewOpportunity({...newOpportunity, status: e.target.value})}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="number"
            placeholder="Estimated Value (USD)"
            value={newOpportunity.estimatedValueUSD}
            onChange={(e) => setNewOpportunity({...newOpportunity, estimatedValueUSD: parseFloat(e.target.value) || 0})}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            placeholder="Published Date"
            value={newOpportunity.keyDates.publishedDate}
            onChange={(e) => setNewOpportunity({
              ...newOpportunity, 
              keyDates: {...newOpportunity.keyDates, publishedDate: e.target.value}
            })}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="date"
            placeholder="Bid Deadline (optional)"
            value={newOpportunity.keyDates.bidDeadline}
            onChange={(e) => setNewOpportunity({
              ...newOpportunity, 
              keyDates: {...newOpportunity.keyDates, bidDeadline: e.target.value}
            })}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            placeholder="Projected Start Date (optional)"
            value={newOpportunity.keyDates.projectedStartDate}
            onChange={(e) => setNewOpportunity({
              ...newOpportunity, 
              keyDates: {...newOpportunity.keyDates, projectedStartDate: e.target.value}
            })}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Source Document Name"
            value={newOpportunity.source.documentName}
            onChange={(e) => setNewOpportunity({
              ...newOpportunity, 
              source: {...newOpportunity.source, documentName: e.target.value}
            })}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="url"
            placeholder="Source URL"
            value={newOpportunity.source.url}
            onChange={(e) => setNewOpportunity({
              ...newOpportunity, 
              source: {...newOpportunity.source, url: e.target.value}
            })}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="Category (optional)"
            value={newOpportunity.category}
            onChange={(e) => setNewOpportunity({...newOpportunity, category: e.target.value})}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Subcategory (optional)"
            value={newOpportunity.subcategory}
            onChange={(e) => setNewOpportunity({...newOpportunity, subcategory: e.target.value})}
            className="border rounded px-3 py-2"
          />
          <textarea
            placeholder="Summary"
            value={newOpportunity.summary}
            onChange={(e) => setNewOpportunity({...newOpportunity, summary: e.target.value})}
            className="border rounded px-3 py-2 md:col-span-2"
            rows={3}
            required
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 md:col-span-2"
          >
            Add Opportunity
          </button>
        </form>
      </div>

      {/* Opportunities List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">
            Opportunities ({displayOpportunities?.length || 0})
          </h2>
        </div>
        <div className="divide-y">
          {displayOpportunities?.map((opportunity: Opportunity) => (
            <div key={opportunity._id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    <a 
                      href={opportunity.source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {opportunity.opportunityTitle}
                    </a>
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {opportunity.opportunityType}
                    </span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                      {opportunity.issuingBody.level}
                    </span>
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                      {opportunity.location.region}
                    </span>
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">
                      {opportunity.status}
                    </span>
                    {opportunity.category && (
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm">
                        {opportunity.category}
                      </span>
                    )}
                    {opportunity.contractID && (
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                        ID: {opportunity.contractID}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <p><strong>Issuing Body:</strong> {opportunity.issuingBody.name}</p>
                    <p><strong>Location:</strong> {opportunity.location.city && `${opportunity.location.city}, `}{opportunity.location.county && `${opportunity.location.county}, `}{opportunity.location.region}</p>
                    {opportunity.estimatedValueUSD && (
                      <p><strong>Estimated Value:</strong> {formatCurrency(opportunity.estimatedValueUSD)}</p>
                    )}
                    <p><strong>Published:</strong> {new Date(opportunity.keyDates.publishedDate).toLocaleDateString()}</p>
                    {opportunity.keyDates.bidDeadline && (
                      <p><strong>Bid Deadline:</strong> {new Date(opportunity.keyDates.bidDeadline).toLocaleDateString()}</p>
                    )}
                  </div>
                  <p className="text-gray-700 mt-2">{opportunity.summary}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => toggleOpportunityActive({ id: opportunity._id })}
                    className={`px-3 py-1 rounded text-sm ${
                      opportunity.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {opportunity.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => deleteOpportunity({ id: opportunity._id })}
                    className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OpportunitiesDashboard;
