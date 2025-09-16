import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { X, Save, Plus, Trash2, ExternalLink } from 'lucide-react';

interface Lead {
  _id?: Id<"leads">;
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
    publishedDate?: string;
    bidDeadline?: string;
    projectedStartDate?: string;
  };
  source: {
    documentName: string;
    url: string;
  };
  contacts: Array<{
    name?: string;
    title: string;
    email?: string;
    phone?: string;
    url?: string;
  }>;
  summary: string;
  verificationStatus?: string;
  category?: string;
  subcategory?: string;
  isActive?: boolean;
}

interface LeadFormProps {
  lead?: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const OPPORTUNITY_TYPES = [
  'Public Sector',
  'Private Subcontract',
  'Private Sector',
  'Federal',
  'State',
  'Regional',
  'City',
  'County',
  'School District',
  'Transit Authority'
];

const ISSUING_LEVELS = [
  'Federal',
  'State',
  'Regional',
  'City',
  'County',
  'School District',
  'Transit Authority',
  'Private',
  'Other'
];

const REGIONS = [
  'Texas Triangle',
  'Dallas-Fort Worth',
  'Houston',
  'Austin',
  'San Antonio',
  'El Paso',
  'Other'
];

const VERIFICATION_STATUSES = [
  'Verified',
  'Pending – Requires Portal Login',
  'Unverified',
  'Needs Review'
];

export function LeadForm({ lead, isOpen, onClose, onSave }: LeadFormProps) {
  const [formData, setFormData] = useState<Lead>({
    opportunityType: '',
    opportunityTitle: '',
    contractID: '',
    issuingBody: {
      name: '',
      level: ''
    },
    location: {
      city: '',
      county: '',
      region: ''
    },
    status: '',
    estimatedValueUSD: undefined,
    keyDates: {
      publishedDate: '',
      bidDeadline: '',
      projectedStartDate: ''
    },
    source: {
      documentName: '',
      url: ''
    },
    contacts: [{
      name: '',
      title: '',
      email: '',
      phone: '',
      url: ''
    }],
    summary: '',
    verificationStatus: '',
    category: '',
    subcategory: '',
    isActive: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createLead = useMutation(api.leads.createLead);
  const updateLead = useMutation(api.leads.updateLead);

  useEffect(() => {
    if (lead) {
      setFormData(lead);
    } else {
      // Reset form for new lead
      setFormData({
        opportunityType: '',
        opportunityTitle: '',
        contractID: '',
        issuingBody: {
          name: '',
          level: ''
        },
        location: {
          city: '',
          county: '',
          region: ''
        },
        status: '',
        estimatedValueUSD: undefined,
        keyDates: {
          publishedDate: '',
          bidDeadline: '',
          projectedStartDate: ''
        },
        source: {
          documentName: '',
          url: ''
        },
        contacts: [{
          name: '',
          title: '',
          email: '',
          phone: '',
          url: ''
        }],
        summary: '',
        verificationStatus: '',
        category: '',
        subcategory: '',
        isActive: true
      });
    }
    setErrors({});
  }, [lead, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.opportunityTitle.trim()) {
      newErrors.opportunityTitle = 'Opportunity title is required';
    }

    if (!formData.opportunityType) {
      newErrors.opportunityType = 'Opportunity type is required';
    }

    if (!formData.issuingBody.name.trim()) {
      newErrors.issuingBodyName = 'Issuing body name is required';
    }

    if (!formData.issuingBody.level) {
      newErrors.issuingBodyLevel = 'Issuing body level is required';
    }

    if (!formData.location.region) {
      newErrors.region = 'Region is required';
    }

    if (!formData.status.trim()) {
      newErrors.status = 'Status is required';
    }

    if (!formData.source.documentName.trim()) {
      newErrors.sourceDocumentName = 'Source document name is required';
    }

    if (!formData.source.url.trim()) {
      newErrors.sourceUrl = 'Source URL is required';
    } else {
      try {
        new URL(formData.source.url);
      } catch {
        newErrors.sourceUrl = 'Please enter a valid URL';
      }
    }

    if (!formData.summary.trim()) {
      newErrors.summary = 'Summary is required';
    }

    // Validate contacts
    formData.contacts.forEach((contact, index) => {
      if (!contact.title.trim()) {
        newErrors[`contact_${index}_title`] = 'Contact title is required';
      }
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        newErrors[`contact_${index}_email`] = 'Please enter a valid email address';
      }
      if (contact.url && contact.url.trim()) {
        try {
          new URL(contact.url);
        } catch {
          newErrors[`contact_${index}_url`] = 'Please enter a valid URL';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const leadData = {
        ...formData,
        estimatedValueUSD: formData.estimatedValueUSD || undefined,
        contractID: formData.contractID || undefined,
        verificationStatus: formData.verificationStatus || undefined,
        category: formData.category || undefined,
        subcategory: formData.subcategory || undefined,
        contacts: formData.contacts.filter(contact => contact.title.trim()),
        keyDates: {
          publishedDate: formData.keyDates.publishedDate || undefined,
          bidDeadline: formData.keyDates.bidDeadline || undefined,
          projectedStartDate: formData.keyDates.projectedStartDate || undefined,
        },
        location: {
          city: formData.location.city || undefined,
          county: formData.location.county || undefined,
          region: formData.location.region,
        }
      };

      if (lead?._id) {
        await updateLead({ id: lead._id, ...leadData });
      } else {
        await createLead(leadData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Failed to save lead. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2) {
        const nestedValue = prev[keys[0] as keyof Lead];
        if (typeof nestedValue === 'object' && nestedValue !== null && !Array.isArray(nestedValue)) {
          return {
            ...prev,
            [keys[0]]: {
              ...(nestedValue as Record<string, any>),
              [keys[1]]: value
            }
          };
        }
      }
      return prev;
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleContactChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));

    // Clear error when user starts typing
    const errorKey = `contact_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, {
        name: '',
        title: '',
        email: '',
        phone: '',
        url: ''
      }]
    }));
  };

  const removeContact = (index: number) => {
    if (formData.contacts.length > 1) {
      setFormData(prev => ({
        ...prev,
        contacts: prev.contacts.filter((_, i) => i !== index)
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {lead ? 'Edit Lead' : 'Create New Lead'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Opportunity Title *
                  </label>
                  <input
                    type="text"
                    value={formData.opportunityTitle}
                    onChange={(e) => handleInputChange('opportunityTitle', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors ${
                      errors.opportunityTitle ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter opportunity title"
                  />
                  {errors.opportunityTitle && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.opportunityTitle}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Opportunity Type *
                  </label>
                  <select
                    value={formData.opportunityType}
                    onChange={(e) => handleInputChange('opportunityType', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                      errors.opportunityType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">Select type</option>
                    {OPPORTUNITY_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.opportunityType && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.opportunityType}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contract ID
                  </label>
                  <input
                    type="text"
                    value={formData.contractID || ''}
                    onChange={(e) => handleInputChange('contractID', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors"
                    placeholder="Enter contract ID"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status *
                  </label>
                  <input
                    type="text"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors ${
                      errors.status ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter status"
                  />
                  {errors.status && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.status}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Issuing Body */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">Issuing Body</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Issuing Body Name *
                  </label>
                  <input
                    type="text"
                    value={formData.issuingBody.name}
                    onChange={(e) => handleInputChange('issuingBody.name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors ${
                      errors.issuingBodyName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter issuing body name"
                  />
                  {errors.issuingBodyName && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.issuingBodyName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Issuing Body Level *
                  </label>
                  <select
                    value={formData.issuingBody.level}
                    onChange={(e) => handleInputChange('issuingBody.level', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                      errors.issuingBodyLevel ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">Select level</option>
                    {ISSUING_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  {errors.issuingBodyLevel && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.issuingBodyLevel}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.location.city || ''}
                    onChange={(e) => handleInputChange('location.city', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors"
                    placeholder="Enter city"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    County
                  </label>
                  <input
                    type="text"
                    value={formData.location.county || ''}
                    onChange={(e) => handleInputChange('location.county', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors"
                    placeholder="Enter county"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Region *
                  </label>
                  <select
                    value={formData.location.region}
                    onChange={(e) => handleInputChange('location.region', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                      errors.region ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">Select region</option>
                    {REGIONS.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                  {errors.region && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.region}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">Financial Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Estimated Value (USD)
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedValueUSD || ''}
                    onChange={(e) => handleInputChange('estimatedValueUSD', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors"
                    placeholder="Enter estimated value"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Verification Status
                  </label>
                  <select
                    value={formData.verificationStatus || ''}
                    onChange={(e) => handleInputChange('verificationStatus', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                  >
                    <option value="">Select status</option>
                    {VERIFICATION_STATUSES.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Key Dates */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">Key Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Published Date
                  </label>
                  <input
                    type="date"
                    value={formData.keyDates.publishedDate || ''}
                    onChange={(e) => handleInputChange('keyDates.publishedDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Bid Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.keyDates.bidDeadline || ''}
                    onChange={(e) => handleInputChange('keyDates.bidDeadline', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Projected Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.keyDates.projectedStartDate || ''}
                    onChange={(e) => handleInputChange('keyDates.projectedStartDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Source Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">Source Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Source Document Name *
                  </label>
                  <input
                    type="text"
                    value={formData.source.documentName}
                    onChange={(e) => handleInputChange('source.documentName', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors ${
                      errors.sourceDocumentName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter source document name"
                  />
                  {errors.sourceDocumentName && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.sourceDocumentName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Source URL *
                  </label>
                  <input
                    type="url"
                    value={formData.source.url}
                    onChange={(e) => handleInputChange('source.url', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors ${
                      errors.sourceUrl ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter source URL"
                  />
                  {errors.sourceUrl && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.sourceUrl}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">Summary</h3>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Summary *
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors resize-none ${
                    errors.summary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter opportunity summary"
                />
                {errors.summary && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.summary}</p>
                )}
              </div>
            </div>

            {/* Contacts */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">Contacts</h3>
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Contact
                </button>
              </div>

              <div className="space-y-6">
                {formData.contacts.map((contact, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-xl p-6 bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contact {index + 1}</h4>
                      {formData.contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContact(index)}
                          className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Name
                        </label>
                        <input
                          type="text"
                          value={contact.name || ''}
                          onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors"
                          placeholder="Contact name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={contact.title}
                          onChange={(e) => handleContactChange(index, 'title', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors ${
                            errors[`contact_${index}_title`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                          placeholder="Contact title"
                        />
                        {errors[`contact_${index}_title`] && (
                          <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors[`contact_${index}_title`]}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Email
                        </label>
                        <input
                          type="email"
                          value={contact.email || ''}
                          onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors ${
                            errors[`contact_${index}_email`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                          placeholder="Contact email"
                        />
                        {errors[`contact_${index}_email`] && (
                          <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors[`contact_${index}_email`]}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={contact.phone || ''}
                          onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors"
                          placeholder="Contact phone"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          URL
                        </label>
                        <input
                          type="url"
                          value={contact.url || ''}
                          onChange={(e) => handleContactChange(index, 'url', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors ${
                            errors[`contact_${index}_url`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                          placeholder="Contact URL"
                        />
                        {errors[`contact_${index}_url`] && (
                          <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors[`contact_${index}_url`]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-8 border-t border-gray-200 dark:border-gray-600">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {lead ? 'Update Lead' : 'Create Lead'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
