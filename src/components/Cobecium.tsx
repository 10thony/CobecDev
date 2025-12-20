import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Search, Heart, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import type { Id } from '../../convex/_generated/dataModel';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';

type EntityType = 'resume' | 'jobposting' | 'both';
type FilterType = 'all' | 'favorites';

interface JobPosting {
  _id: Id<"jobpostings">;
  jobTitle: string;
  location: string;
  salary: string;
  jobSummary: string;
  duties: string;
  requirements: string;
  qualifications: string;
  education: string[];
  department: string;
  securityClearance: string;
  educationRequired: string;
  createdAt: number;
  updatedAt: number;
}

interface Resume {
  _id: Id<"resumes">;
  filename: string;
  personalInfo: {
    firstName: string;
    middleName: string;
    lastName: string;
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
  securityClearance: string;
  createdAt: number;
  updatedAt: number;
}

interface CobeciumCardProps {
  entity: JobPosting | Resume;
  entityType: 'resume' | 'jobposting';
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

function CobeciumCard({ entity, entityType, isFavorited, onToggleFavorite }: CobeciumCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  if (entityType === 'jobposting') {
    const job = entity as JobPosting;
    return (
      <TronPanel className="relative">
        {/* Favor Button */}
        <button
          onClick={onToggleFavorite}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-tron-bg-card transition-colors z-10"
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`w-6 h-6 ${isFavorited ? 'fill-neon-error text-neon-error' : 'text-tron-gray'}`} />
        </button>

        <div className="mb-4 pr-12">
          <h2 className="text-2xl font-bold text-tron-white">{job.jobTitle}</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-4">
            <div className="bg-tron-bg-card rounded-lg p-4">
              <h3 className="font-semibold text-tron-gray mb-2">Education & Requirements</h3>
              <p className="text-sm text-tron-gray">{job.educationRequired}</p>
              <p className="text-sm text-tron-gray mt-1">Security: {job.securityClearance}</p>
            </div>
            <div className="bg-tron-bg-elevated rounded-lg p-4 border-2 border-tron-cyan">
              <button
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="w-full text-left"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-tron-white">Job Summary</h3>
                  <ChevronDown className={`w-4 h-4 text-tron-cyan transition-transform ${isSummaryExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>
              <p className={`text-sm text-tron-gray ${isSummaryExpanded ? '' : 'line-clamp-3'}`}>
                {job.jobSummary}
              </p>
            </div>
          </div>
          <div className="bg-tron-bg-card rounded-lg p-4">
            <h3 className="font-semibold text-tron-white mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.requirements.split('.').filter(r => r.trim()).slice(0, 5).map((req, idx) => (
                <span key={idx} className="tron-badge tron-badge-info">
                  {req.trim().substring(0, 20)}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-tron-bg-card rounded-lg p-4">
          <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-between items-center">
            <h3 className="font-semibold text-tron-white">Details</h3>
            <ChevronDown className={`transition-transform text-tron-cyan ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          {isExpanded && (
            <div className="mt-4 space-y-4">
              <div><h4 className="font-medium mb-1 text-tron-white">Duties</h4><p className="text-sm text-tron-gray">{job.duties}</p></div>
              <div><h4 className="font-medium mb-1 text-tron-white">Requirements</h4><p className="text-sm text-tron-gray">{job.requirements}</p></div>
            </div>
          )}
        </div>
      </TronPanel>
    );
  }
  
  const resume = entity as Resume;
  return (
    <TronPanel className="relative">
      {/* Favor Button */}
      <button
        onClick={onToggleFavorite}
        className="absolute top-6 right-6 p-2 rounded-full hover:bg-tron-bg-card transition-colors z-10"
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart className={`w-6 h-6 ${isFavorited ? 'fill-neon-error text-neon-error' : 'text-tron-gray'}`} />
      </button>

      <div className="mb-4 pr-12">
        <h2 className="text-2xl font-bold text-tron-white">{resume.personalInfo.firstName} {resume.personalInfo.middleName} {resume.personalInfo.lastName}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-4">
          <div className="bg-tron-bg-card rounded-lg p-4">
            <h3 className="font-semibold text-tron-white mb-2">Education</h3>
            <div className="text-sm space-y-1 text-tron-gray">{resume.education.map((edu, idx) => <p key={idx}>{edu}</p>)}</div>
            <p className="text-sm mt-2 text-tron-gray">Clearance: {resume.securityClearance}</p>
          </div>
          <div className="bg-tron-bg-elevated rounded-lg p-4 border-2 border-tron-cyan">
            <h3 className="font-semibold text-tron-white mb-2">Current Position</h3>
            {resume.experience.length > 0 && (
              <div className="text-sm text-tron-gray">
                <p className="font-medium">{resume.experience[0].title}</p>
                <p>{resume.experience[0].company}</p>
              </div>
            )}
          </div>
        </div>
        <div className="bg-tron-bg-card rounded-lg p-4">
          <h3 className="font-semibold text-tron-white mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {resume.skills.slice(0, 8).map((skill, idx) => (
              <span key={idx} className="tron-badge tron-badge-info">{skill}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-tron-bg-card rounded-lg p-4">
        <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-between items-center mb-2">
          <h3 className="font-semibold text-tron-white">Experience</h3>
          <ChevronDown className={`transition-transform text-tron-cyan ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isExpanded && (
          <div className="space-y-4 mt-4">
            {resume.experience.map((exp, idx) => (
              <div key={idx} className="border-l-2 border-tron-cyan pl-4">
                <h4 className="font-medium text-tron-white">{exp.title}</h4>
                <p className="text-sm text-tron-gray">{exp.company}</p>
                <ul className="mt-2">
                  {exp.responsibilities.slice(0, 2).map((resp, ridx) => (
                    <li key={ridx} className="text-sm list-disc text-tron-gray">{resp}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </TronPanel>
  );
}

export function Cobecium() {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<EntityType>('both');
  const [favoriteFilter, setFavoriteFilter] = useState<FilterType>('all');
  const [currentIndex, setCurrentIndex] = useState(0);

  const resumes = useQuery(api.resumes.list);
  const jobPostings = useQuery(api.jobPostings.list);

  const addFavorite = useMutation(api.favorites.add);
  const removeFavorite = useMutation(api.favorites.remove);
  
  // Get favorites for both types
  const favoriteJobPostingIds = useQuery(api.favorites.getFavoriteIds, { entityType: 'jobposting' });
  const favoriteResumeIds = useQuery(api.favorites.getFavoriteIds, { entityType: 'resume' });
  
  // Combine all favorite IDs
  const favoriteIds = useMemo(() => {
    const allIds: string[] = [];
    if (favoriteJobPostingIds) allIds.push(...favoriteJobPostingIds);
    if (favoriteResumeIds) allIds.push(...favoriteResumeIds);
    return allIds;
  }, [favoriteJobPostingIds, favoriteResumeIds]);

  const filteredItems = useMemo(() => {
    let items: (JobPosting | Resume)[] = [];
    if (entityFilter === 'both') items = [...(jobPostings || []), ...(resumes || [])];
    else if (entityFilter === 'jobposting') items = jobPostings || [];
    else items = resumes || [];

    if (searchTerm) {
      items = items.filter(item => {
        if ('jobTitle' in item) {
          const job = item as JobPosting;
          return job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
        }
        const resume = item as Resume;
        const fullName = `${resume.personalInfo.firstName} ${resume.personalInfo.lastName}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      });
    }

    // Filter by favorites if selected
    if (favoriteFilter === 'favorites') {
      if (favoriteIds && favoriteIds.length > 0) {
        items = items.filter(item => favoriteIds.includes(item._id));
      } else {
        items = [];
      }
    }
    return items;
  }, [searchTerm, entityFilter, favoriteFilter, resumes, jobPostings, favoriteIds]);

  const currentEntity = filteredItems[currentIndex];
  const getCurrentEntityType = (entity: JobPosting | Resume) => 'jobTitle' in entity ? 'jobposting' : 'resume';

  useEffect(() => setCurrentIndex(0), [searchTerm, entityFilter, favoriteFilter]);

  return (
    <div className="min-h-screen bg-tron-bg-deep p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-tron-white">COBECIUM</h1>
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tron-gray" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="tron-input w-full pl-10 pr-4 py-2"
            />
          </div>
          <select 
            value={entityFilter} 
            onChange={(e) => setEntityFilter(e.target.value as EntityType)} 
            className="tron-select px-4 py-2"
          >
            <option value="both">Both</option>
            <option value="jobposting">Job Postings</option>
            <option value="resume">Resumes</option>
          </select>

          {/* View Favorites Button */}
          <TronButton
            onClick={() => setFavoriteFilter(favoriteFilter === 'favorites' ? 'all' : 'favorites')}
            variant={favoriteFilter === 'favorites' ? 'primary' : 'outline'}
            color={favoriteFilter === 'favorites' ? 'orange' : 'cyan'}
            icon={<Heart className={`w-4 h-4 ${favoriteFilter === 'favorites' ? 'fill-current' : ''}`} />}
          >
            {favoriteFilter === 'favorites' ? 'Show All' : 'View Favorites'}
          </TronButton>
        </div>
        {currentEntity && (
          <>
            <CobeciumCard 
              entity={currentEntity} 
              entityType={getCurrentEntityType(currentEntity)} 
              isFavorited={favoriteIds?.includes(currentEntity._id as string) || false} 
              onToggleFavorite={async () => {
                const entityType = getCurrentEntityType(currentEntity);
                const isCurrentlyFavorited = favoriteIds?.includes(currentEntity._id) || false;
                
                if (isCurrentlyFavorited) {
                  await removeFavorite({ entityType, entityId: currentEntity._id as string });
                } else {
                  await addFavorite({ entityType, entityId: currentEntity._id as string });
                }
              }} 
            />
            <TronPanel className="flex justify-between items-center p-4">
              <TronButton 
                onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)} 
                disabled={currentIndex === 0}
                variant="primary"
                color="cyan"
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </TronButton>
              <div className="flex items-center gap-2 text-tron-gray">
                <input
                  type="number"
                  min="1"
                  max={filteredItems.length}
                  value={currentIndex + 1}
                  onChange={(e) => {
                    const num = Number(e.target.value) - 1;
                    if (num >= 0 && num < filteredItems.length) setCurrentIndex(num);
                  }}
                  className="tron-input w-16 px-2 py-1 text-center"
                />
                <span className="text-sm">of {filteredItems.length}</span>
              </div>
              <TronButton 
                onClick={() => setCurrentIndex(Math.min(filteredItems.length - 1, currentIndex + 1))} 
                disabled={currentIndex === filteredItems.length - 1}
                variant="primary"
                color="cyan"
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </TronButton>
            </TronPanel>
          </>
        )}
      </div>
    </div>
  );
}

