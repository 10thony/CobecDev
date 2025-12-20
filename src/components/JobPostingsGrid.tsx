import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  ExternalLink,
  Briefcase,
  MapPin,
  Building,
  Calendar,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';

interface JobPosting {
  _id: string;
  jobTitle: string;
  location: string;
  salary: string;
  openDate: string;
  closeDate: string;
  jobLink: string;
  jobType: string;
  jobSummary: string;
  duties: string;
  requirements: string;
  qualifications: string;
  education: string[];
  howToApply: string;
  additionalInformation: string;
  department: string;
  seriesGrade: string;
  travelRequired: string;
  workSchedule: string;
  securityClearance: string;
  experienceRequired: string;
  educationRequired: string;
  applicationDeadline: string;
  contactInfo: string;
  createdAt: number;
  updatedAt: number;
}

type SortField = keyof JobPosting;
type SortOrder = 'asc' | 'desc' | null;

interface JobPostingsGridProps {
  className?: string;
}

export function JobPostingsGrid({ className = '' }: JobPostingsGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  // Query all job postings
  const jobPostings = useQuery(api.jobPostings.list);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: null -> asc -> desc -> null
      if (sortOrder === null) {
        setSortOrder('asc');
      } else if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortOrder(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort job postings
  const filteredAndSortedJobs = useMemo(() => {
    if (!jobPostings) return [];

    let filtered = jobPostings.filter(job => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        job.jobTitle.toLowerCase().includes(searchLower) ||
        job.location.toLowerCase().includes(searchLower) ||
        job.department.toLowerCase().includes(searchLower) ||
        job.jobType.toLowerCase().includes(searchLower) ||
        job.jobSummary.toLowerCase().includes(searchLower) ||
        job.duties.toLowerCase().includes(searchLower) ||
        job.requirements.toLowerCase().includes(searchLower)
      );
    });

    // Apply sorting
    if (sortField && sortOrder) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        // Handle different types
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }

        return 0;
      });
    }

    return filtered;
  }, [jobPostings, searchTerm, sortField, sortOrder]);

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 opacity-50 text-tron-gray" />;
    }
    if (sortOrder === 'asc') {
      return <ArrowUp className="w-4 h-4 text-tron-cyan" />;
    }
    if (sortOrder === 'desc') {
      return <ArrowDown className="w-4 h-4 text-tron-cyan" />;
    }
    return <ArrowUpDown className="w-4 h-4 opacity-50 text-tron-gray" />;
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (!jobPostings) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <RefreshCw className="w-8 h-8 animate-spin text-tron-cyan" />
        <span className="ml-2 text-tron-gray">Loading job postings...</span>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-tron-white">Job Postings</h1>
          <p className="text-lg text-tron-gray">
            {filteredAndSortedJobs.length} of {jobPostings.length} postings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-tron-cyan" />
        </div>
      </div>

      {/* Search Bar */}
      <TronPanel title="Search Job Postings" className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tron-gray w-5 h-5" />
          <input
            type="text"
            placeholder="Search job postings by title, location, department, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tron-input w-full pl-12 pr-4 py-3"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tron-gray hover:text-tron-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </TronPanel>

      {/* Table */}
      <TronPanel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tron-table w-full">
            <thead>
              <tr>
                <th 
                  onClick={() => handleSort('jobTitle')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Job Title</span>
                    {renderSortIcon('jobTitle')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('location')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Location</span>
                    {renderSortIcon('location')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('department')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Department</span>
                    {renderSortIcon('department')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('jobType')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Job Type</span>
                    {renderSortIcon('jobType')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('salary')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Salary</span>
                    {renderSortIcon('salary')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('openDate')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Open Date</span>
                    {renderSortIcon('openDate')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('closeDate')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Close Date</span>
                    {renderSortIcon('closeDate')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('applicationDeadline')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>App Deadline</span>
                    {renderSortIcon('applicationDeadline')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('seriesGrade')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Series/Grade</span>
                    {renderSortIcon('seriesGrade')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('securityClearance')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Clearance</span>
                    {renderSortIcon('securityClearance')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('travelRequired')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Travel</span>
                    {renderSortIcon('travelRequired')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('workSchedule')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Schedule</span>
                    {renderSortIcon('workSchedule')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('experienceRequired')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Experience Req</span>
                    {renderSortIcon('experienceRequired')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('educationRequired')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Education Req</span>
                    {renderSortIcon('educationRequired')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('createdAt')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Created</span>
                    {renderSortIcon('createdAt')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('updatedAt')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Updated</span>
                    {renderSortIcon('updatedAt')}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedJobs.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-6 py-12 text-center">
                    <Briefcase className="w-12 h-12 mx-auto text-tron-gray mb-3" />
                    <p className="text-tron-gray text-lg">
                      {searchTerm ? 'No job postings found matching your search' : 'No job postings available'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedJobs.map((job) => (
                  <tr 
                    key={job._id}
                    className="hover:bg-tron-bg-card transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <Briefcase className="w-4 h-4 text-tron-gray mt-1 flex-shrink-0" />
                        <span className="font-medium text-tron-white">{job.jobTitle}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-tron-gray">
                        <MapPin className="w-4 h-4 text-tron-gray" />
                        <span>{job.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-tron-gray">
                        <Building className="w-4 h-4 text-tron-gray" />
                        <span>{job.department}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="tron-badge tron-badge-info">
                        {job.jobType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-tron-gray">
                      {job.salary}
                    </td>
                    <td className="px-6 py-4 text-tron-gray">
                      {formatDate(job.openDate)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-tron-gray">
                        <Calendar className="w-4 h-4 text-tron-gray" />
                        <span>{formatDate(job.closeDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-tron-gray">
                      {formatDate(job.applicationDeadline)}
                    </td>
                    <td className="px-6 py-4 text-tron-gray">
                      {job.seriesGrade}
                    </td>
                    <td className="px-6 py-4 text-tron-gray">
                      {job.securityClearance}
                    </td>
                    <td className="px-6 py-4 text-tron-gray">
                      {job.travelRequired}
                    </td>
                    <td className="px-6 py-4 text-tron-gray">
                      {job.workSchedule}
                    </td>
                    <td className="px-6 py-4 text-tron-gray">
                      {job.experienceRequired}
                    </td>
                    <td className="px-6 py-4 text-tron-gray">
                      {job.educationRequired}
                    </td>
                    <td className="px-6 py-4 text-tron-gray text-sm">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-tron-gray text-sm">
                      {new Date(job.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <TronButton
                          onClick={() => setSelectedJob(job)}
                          variant="ghost"
                          color="cyan"
                          size="sm"
                          icon={<Eye className="w-4 h-4" />}
                          title="View details"
                        />
                        {job.jobLink && (
                          <a
                            href={job.jobLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-tron-gray hover:text-tron-cyan hover:bg-tron-bg-card rounded-lg transition-all duration-200"
                            title="Open job link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TronPanel>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <TronPanel className="max-w-4xl w-full max-h-[90vh] overflow-hidden" title={selectedJob.jobTitle}>
            <div className="flex items-center justify-end mb-4">
              <TronButton
                onClick={() => setSelectedJob(null)}
                variant="ghost"
                color="orange"
                size="sm"
                icon={<X className="w-6 h-6" />}
              />
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Location</span>
                    <p className="text-tron-white">{selectedJob.location}</p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Department</span>
                    <p className="text-tron-white">{selectedJob.department}</p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Job Type</span>
                    <p className="text-tron-white">{selectedJob.jobType}</p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Salary</span>
                    <p className="text-tron-white">{selectedJob.salary}</p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Open Date</span>
                    <p className="text-tron-white">{formatDate(selectedJob.openDate)}</p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Close Date</span>
                    <p className="text-tron-white">{formatDate(selectedJob.closeDate)}</p>
                  </div>
                </div>

                <div>
                  <span className="block text-sm font-medium text-tron-gray mb-2">Job Summary</span>
                  <p className="text-tron-gray leading-relaxed">{selectedJob.jobSummary}</p>
                </div>

                <div>
                  <span className="block text-sm font-medium text-tron-gray mb-2">Duties</span>
                  <p className="text-tron-gray leading-relaxed whitespace-pre-wrap">{selectedJob.duties}</p>
                </div>

                <div>
                  <span className="block text-sm font-medium text-tron-gray mb-2">Requirements</span>
                  <p className="text-tron-gray leading-relaxed whitespace-pre-wrap">{selectedJob.requirements}</p>
                </div>

                <div>
                  <span className="block text-sm font-medium text-tron-gray mb-2">Qualifications</span>
                  <p className="text-tron-gray leading-relaxed whitespace-pre-wrap">{selectedJob.qualifications}</p>
                </div>

                {selectedJob.education && selectedJob.education.length > 0 && (
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-2">Education</span>
                    <ul className="list-disc list-inside text-tron-gray space-y-1">
                      {selectedJob.education.map((edu, index) => (
                        <li key={index}>{edu}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Security Clearance</span>
                    <p className="text-tron-white">{selectedJob.securityClearance}</p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Travel Required</span>
                    <p className="text-tron-white">{selectedJob.travelRequired}</p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Work Schedule</span>
                    <p className="text-tron-white">{selectedJob.workSchedule}</p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Series/Grade</span>
                    <p className="text-tron-white">{selectedJob.seriesGrade}</p>
                  </div>
                </div>

                {selectedJob.jobLink && (
                  <div className="pt-4 border-t border-tron-cyan/20">
                    <a
                      href={selectedJob.jobLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-tron-cyan hover:text-tron-blue font-medium"
                    >
                      <span>View Full Posting</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </TronPanel>
        </div>
      )}
    </div>
  );
}

