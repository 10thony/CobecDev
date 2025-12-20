import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  FileText,
  Mail,
  Phone,
  User,
  Award,
  Briefcase,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';

interface Resume {
  _id: string;
  filename: string;
  originalText: string;
  personalInfo: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phone: string;
    yearsOfExperience: number;
  };
  professionalSummary: string;
  education: string[];
  experience: Array<{
    title: string;
    company: string;
    location: string;
    duration: string;
    responsibilities: string[];
  }>;
  skills: string[];
  certifications: string;
  professionalMemberships: string;
  securityClearance: string;
  createdAt: number;
  updatedAt: number;
}

type SortField = 'filename' | 'firstName' | 'middleName' | 'lastName' | 'email' | 'phone' | 'yearsOfExperience' | 'securityClearance' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc' | null;

interface ResumesGridProps {
  className?: string;
}

export function ResumesGrid({ className = '' }: ResumesGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);

  // Query all resumes
  const resumes = useQuery(api.resumes.list);

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

  // Filter and sort resumes
  const filteredAndSortedResumes = useMemo(() => {
    if (!resumes) return [];

    let filtered = resumes.filter(resume => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      const fullName = `${resume.personalInfo.firstName} ${resume.personalInfo.middleName} ${resume.personalInfo.lastName}`.toLowerCase();
      
      return (
        fullName.includes(searchLower) ||
        resume.filename.toLowerCase().includes(searchLower) ||
        resume.personalInfo.email.toLowerCase().includes(searchLower) ||
        resume.professionalSummary.toLowerCase().includes(searchLower) ||
        resume.skills.some(skill => skill.toLowerCase().includes(searchLower)) ||
        resume.experience.some(exp => 
          exp.title.toLowerCase().includes(searchLower) ||
          exp.company.toLowerCase().includes(searchLower)
        )
      );
    });

    // Apply sorting
    if (sortField && sortOrder) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        // Handle nested personalInfo fields
        if (['firstName', 'middleName', 'lastName', 'email', 'phone', 'yearsOfExperience'].includes(sortField)) {
          aValue = a.personalInfo[sortField as keyof typeof a.personalInfo];
          bValue = b.personalInfo[sortField as keyof typeof b.personalInfo];
        } else {
          aValue = a[sortField];
          bValue = b[sortField];
        }

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
  }, [resumes, searchTerm, sortField, sortOrder]);

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

  if (!resumes) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <RefreshCw className="w-8 h-8 animate-spin text-tron-cyan" />
        <span className="ml-2 text-tron-gray">Loading resumes...</span>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-tron-white">Resumes</h1>
          <p className="text-lg text-tron-gray">
            {filteredAndSortedResumes.length} of {resumes.length} resumes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-tron-cyan" />
        </div>
      </div>

      {/* Search Bar */}
      <TronPanel title="Search Resumes" className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tron-gray w-5 h-5" />
          <input
            type="text"
            placeholder="Search resumes by name, email, skills, or experience..."
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
                  onClick={() => handleSort('filename')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Filename</span>
                    {renderSortIcon('filename')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('firstName')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>First Name</span>
                    {renderSortIcon('firstName')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('middleName')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Middle Name</span>
                    {renderSortIcon('middleName')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('lastName')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Last Name</span>
                    {renderSortIcon('lastName')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('email')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Email</span>
                    {renderSortIcon('email')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('phone')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Phone</span>
                    {renderSortIcon('phone')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('yearsOfExperience')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Experience</span>
                    {renderSortIcon('yearsOfExperience')}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Professional Summary
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Top Skills
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Certifications
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Prof. Memberships
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
              {filteredAndSortedResumes.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-tron-gray mb-3" />
                    <p className="text-tron-gray text-lg">
                      {searchTerm ? 'No resumes found matching your search' : 'No resumes available'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedResumes.map((resume) => (
                  <tr 
                    key={resume._id}
                    className="hover:bg-tron-bg-card transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-tron-gray flex-shrink-0" />
                        <span className="font-medium text-tron-white truncate max-w-xs">
                          {resume.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-tron-gray">
                        <User className="w-4 h-4 text-tron-gray" />
                        <span>{resume.personalInfo.firstName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-tron-gray">
                      {resume.personalInfo.middleName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-tron-gray">
                      {resume.personalInfo.lastName}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-tron-gray">
                        <Mail className="w-4 h-4 text-tron-gray" />
                        <span className="truncate max-w-xs">{resume.personalInfo.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-tron-gray">
                        <Phone className="w-4 h-4 text-tron-gray" />
                        <span>{resume.personalInfo.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-tron-gray" />
                        <span className="font-medium text-tron-white">
                          {resume.personalInfo.yearsOfExperience} years
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-tron-gray max-w-xs truncate">
                        {resume.professionalSummary}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {resume.skills.slice(0, 3).map((skill, index) => (
                          <span 
                            key={index}
                            className="tron-badge tron-badge-info"
                          >
                            {skill}
                          </span>
                        ))}
                        {resume.skills.length > 3 && (
                          <span className="tron-badge tron-badge-info">
                            +{resume.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-tron-gray max-w-xs truncate">
                        {resume.certifications || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-tron-gray max-w-xs truncate">
                        {resume.professionalMemberships || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-tron-gray">
                      {resume.securityClearance || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-tron-gray text-sm">
                      {new Date(resume.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-tron-gray text-sm">
                      {new Date(resume.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <TronButton
                        onClick={() => setSelectedResume(resume)}
                        variant="ghost"
                        color="cyan"
                        size="sm"
                        icon={<Eye className="w-4 h-4" />}
                        title="View details"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TronPanel>

      {/* Resume Details Modal */}
      {selectedResume && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <TronPanel className="max-w-4xl w-full max-h-[90vh] overflow-hidden" title={`${selectedResume.personalInfo.firstName} ${selectedResume.personalInfo.middleName} ${selectedResume.personalInfo.lastName}`}>
            <p className="text-sm text-tron-gray mt-1 mb-4">{selectedResume.filename}</p>
            <div className="flex items-center justify-end mb-4">
              <TronButton
                onClick={() => setSelectedResume(null)}
                variant="ghost"
                color="orange"
                size="sm"
                icon={<X className="w-6 h-6" />}
              />
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Email</span>
                    <div className="flex items-center gap-2 text-tron-white">
                      <Mail className="w-4 h-4 text-tron-gray" />
                      <a href={`mailto:${selectedResume.personalInfo.email}`} className="hover:text-tron-cyan">
                        {selectedResume.personalInfo.email}
                      </a>
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Phone</span>
                    <div className="flex items-center gap-2 text-tron-white">
                      <Phone className="w-4 h-4 text-tron-gray" />
                      <a href={`tel:${selectedResume.personalInfo.phone}`} className="hover:text-tron-cyan">
                        {selectedResume.personalInfo.phone}
                      </a>
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Years of Experience</span>
                    <p className="text-tron-white font-medium">{selectedResume.personalInfo.yearsOfExperience} years</p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Security Clearance</span>
                    <p className="text-tron-white">{selectedResume.securityClearance || 'N/A'}</p>
                  </div>
                </div>

                {/* Professional Summary */}
                <div>
                  <span className="block text-sm font-medium text-tron-gray mb-2">Professional Summary</span>
                  <p className="text-tron-gray leading-relaxed">{selectedResume.professionalSummary}</p>
                </div>

                {/* Skills */}
                <div>
                  <span className="block text-sm font-medium text-tron-gray mb-2">Skills</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedResume.skills.map((skill, index) => (
                      <span 
                        key={index}
                        className="tron-badge tron-badge-info"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                {selectedResume.experience && selectedResume.experience.length > 0 && (
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-3">Experience</span>
                    <div className="space-y-4">
                      {selectedResume.experience.map((exp, index) => (
                        <div key={index} className="p-4 bg-tron-bg-card rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-tron-white">{exp.title}</h4>
                              <p className="text-sm text-tron-gray">{exp.company} • {exp.location}</p>
                            </div>
                            <span className="text-sm text-tron-gray">{exp.duration}</span>
                          </div>
                          {exp.responsibilities && exp.responsibilities.length > 0 && (
                            <ul className="list-disc list-inside text-sm text-tron-gray space-y-1 mt-2">
                              {exp.responsibilities.map((resp, respIndex) => (
                                <li key={respIndex}>{resp}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {selectedResume.education && selectedResume.education.length > 0 && (
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-2">Education</span>
                    <ul className="list-disc list-inside text-tron-gray space-y-1">
                      {selectedResume.education.map((edu, index) => (
                        <li key={index}>{edu}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Certifications */}
                {selectedResume.certifications && (
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-2">Certifications</span>
                    <div className="flex items-start gap-2">
                      <Award className="w-4 h-4 text-tron-gray mt-1 flex-shrink-0" />
                      <p className="text-tron-gray leading-relaxed">{selectedResume.certifications}</p>
                    </div>
                  </div>
                )}

                {/* Professional Memberships */}
                {selectedResume.professionalMemberships && (
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-2">Professional Memberships</span>
                    <p className="text-tron-gray leading-relaxed">{selectedResume.professionalMemberships}</p>
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

