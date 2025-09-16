// Frontend integration example for leads functionality
// This shows how to use the leads mutations and queries in a React component

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

interface Lead {
  _id: string;
  name: string;
  url: string;
  level: string;
  updateFrequency: string;
  keywordDateFilteringAvailable: boolean;
  category?: string;
  region?: string;
  isActive?: boolean;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export function LeadsDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  // Queries
  const allLeads = useQuery(api.leads.getAllLeads, {});
  const leadsStats = useQuery(api.leads.getLeadsStats, {});
  const searchResults = useQuery(
    api.leads.searchLeads, 
    searchTerm ? { searchTerm } : "skip"
  );
  const filteredLeads = useQuery(
    api.leads.getLeadsByFilters,
    {
      level: selectedLevel || undefined,
      category: selectedCategory || undefined,
      region: selectedRegion || undefined,
      isActive: true,
    }
  );

  // Mutations
  const createLead = useMutation(api.leads.createLead);
  const updateLead = useMutation(api.leads.updateLead);
  const deleteLead = useMutation(api.leads.deleteLead);
  const toggleLeadActive = useMutation(api.leads.toggleLeadActive);

  // Actions
  const importLeads = useAction(api.leadsActions.importLeadsFromJson);
  const exportLeads = useAction(api.leadsActions.exportLeads);
  const getAnalytics = useAction(api.leadsActions.getLeadsAnalytics);

  // State for new lead form
  const [newLead, setNewLead] = useState({
    name: '',
    url: '',
    level: '',
    updateFrequency: '',
    keywordDateFilteringAvailable: false,
    description: '',
    category: '',
    region: '',
  });

  // Handle creating a new lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLead(newLead);
      setNewLead({
        name: '',
        url: '',
        level: '',
        updateFrequency: '',
        keywordDateFilteringAvailable: false,
        description: '',
        category: '',
        region: '',
      });
    } catch (error) {
      console.error('Error creating lead:', error);
    }
  };

  // Handle importing leads from JSON
  const handleImportLeads = async (file: File) => {
    try {
      const text = await file.text();
      const leadsData = JSON.parse(text);
      await importLeads({
        leadsData,
        sourceFile: file.name,
      });
    } catch (error) {
      console.error('Error importing leads:', error);
    }
  };

  // Handle exporting leads
  const handleExportLeads = async (format: 'json' | 'csv') => {
    try {
      const result = await exportLeads({ format });
      const blob = new Blob([result.data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting leads:', error);
    }
  };

  // Get display leads based on search or filters
  const displayLeads = searchTerm ? searchResults : filteredLeads;

  if (!allLeads || !leadsStats) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Texas Leads Dashboard</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">Total Leads</h3>
          <p className="text-2xl font-bold text-blue-900">{leadsStats.total}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Active Leads</h3>
          <p className="text-2xl font-bold text-green-900">{leadsStats.active}</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-800">With Filtering</h3>
          <p className="text-2xl font-bold text-purple-900">{leadsStats.withFiltering}</p>
        </div>
        <div className="bg-orange-100 p-4 rounded-lg">
          <h3 className="font-semibold text-orange-800">Categories</h3>
          <p className="text-2xl font-bold text-orange-900">
            {Object.keys(leadsStats.byCategory).length}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-2"
          />
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Categories</option>
            {Object.keys(leadsStats.byCategory).map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Regions</option>
            {Object.keys(leadsStats.byRegion).map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-2">
          <input
            type="file"
            accept=".json"
            onChange={(e) => e.target.files?.[0] && handleImportLeads(e.target.files[0])}
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
            onClick={() => handleExportLeads('json')}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Export JSON
          </button>
          <button
            onClick={() => handleExportLeads('csv')}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Add New Lead Form */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Lead</h2>
        <form onSubmit={handleCreateLead} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Lead Name"
            value={newLead.name}
            onChange={(e) => setNewLead({...newLead, name: e.target.value})}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="url"
            placeholder="URL"
            value={newLead.url}
            onChange={(e) => setNewLead({...newLead, url: e.target.value})}
            className="border rounded px-3 py-2"
            required
          />
          <select
            value={newLead.level}
            onChange={(e) => setNewLead({...newLead, level: e.target.value})}
            className="border rounded px-3 py-2"
            required
          >
            <option value="">Select Level</option>
            <option value="State">State</option>
            <option value="Regional">Regional</option>
            <option value="City">City</option>
            <option value="County">County</option>
          </select>
          <input
            type="text"
            placeholder="Update Frequency"
            value={newLead.updateFrequency}
            onChange={(e) => setNewLead({...newLead, updateFrequency: e.target.value})}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="Category"
            value={newLead.category}
            onChange={(e) => setNewLead({...newLead, category: e.target.value})}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Region"
            value={newLead.region}
            onChange={(e) => setNewLead({...newLead, region: e.target.value})}
            className="border rounded px-3 py-2"
          />
          <textarea
            placeholder="Description"
            value={newLead.description}
            onChange={(e) => setNewLead({...newLead, description: e.target.value})}
            className="border rounded px-3 py-2 md:col-span-2"
            rows={3}
          />
          <div className="flex items-center md:col-span-2">
            <input
              type="checkbox"
              id="filtering"
              checked={newLead.keywordDateFilteringAvailable}
              onChange={(e) => setNewLead({...newLead, keywordDateFilteringAvailable: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="filtering">Keyword/Date Filtering Available</label>
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 md:col-span-2"
          >
            Add Lead
          </button>
        </form>
      </div>

      {/* Leads List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">
            Leads ({displayLeads?.length || 0})
          </h2>
        </div>
        <div className="divide-y">
          {displayLeads?.map((lead: Lead) => (
            <div key={lead._id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    <a 
                      href={lead.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {lead.name}
                    </a>
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {lead.level}
                    </span>
                    {lead.category && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                        {lead.category}
                      </span>
                    )}
                    {lead.region && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                        {lead.region}
                      </span>
                    )}
                    {lead.keywordDateFilteringAvailable && (
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">
                        Filtering Available
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mt-2">{lead.updateFrequency}</p>
                  {lead.description && (
                    <p className="text-gray-700 mt-2">{lead.description}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => toggleLeadActive({ id: lead._id })}
                    className={`px-3 py-1 rounded text-sm ${
                      lead.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {lead.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => deleteLead({ id: lead._id })}
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

export default LeadsDashboard;
