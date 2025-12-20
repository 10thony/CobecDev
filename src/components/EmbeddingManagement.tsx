import React, { useState, useEffect } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import { TronStatCard } from './TronStatCard';
import { 
  Database, 
  RefreshCw, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  BarChart3,
  Download,
  Upload,
  Trash2,
  Settings,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';

interface EmbeddingManagementProps {
  className?: string;
}

interface EmbeddingStats {
  totalJobs: number;
  totalResumes: number;
  jobsWithEmbeddings: number;
  resumesWithEmbeddings: number;
  jobsNeedingEmbeddings: number;
  resumesNeedingEmbeddings: number;
  coveragePercentage: {
    jobs: number;
    resumes: number;
  };
}

interface ProcessingStatus {
  isProcessing: boolean;
  currentOperation: string;
  progress: number;
  totalItems: number;
  processedItems: number;
}

interface EmbeddingManagementConfig {
  selectedCollection: 'resumes' | 'jobpostings';
  selectedColumn: string;
  batchSize: 5 | 10 | 20 | 50;
  similarityThreshold: number;
  showAdvancedOptions: boolean;
  enableColumnEditing: boolean;
  qualityMetrics: {
    coveragePercentage: number;
    averageConfidence: number;
    lastRegeneration: Date;
    totalItems: number;
    itemsWithEmbeddings: number;
  };
}

interface ColumnDefinition {
  name: string;
  displayName: string;
  searchable: boolean;
  weight: number;
  validationRules: string[];
  sampleData: string[];
}

export function EmbeddingManagement({ className = '' }: EmbeddingManagementProps) {
  const [selectedTable, setSelectedTable] = useState<'jobs' | 'resumes' | 'both'>('both');
  const [batchSize, setBatchSize] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    currentOperation: '',
    progress: 0,
    totalItems: 0,
    processedItems: 0
  });

  // Enhanced configuration state
  const [config, setConfig] = useState<EmbeddingManagementConfig>({
    selectedCollection: 'jobpostings',
    selectedColumn: 'jobTitle',
    batchSize: 10,
    similarityThreshold: 0.5,
    showAdvancedOptions: false,
    enableColumnEditing: false,
    qualityMetrics: {
      coveragePercentage: 0,
      averageConfidence: 0,
      lastRegeneration: new Date(),
      totalItems: 0,
      itemsWithEmbeddings: 0
    }
  });

  // Column definitions for different collections
  const columnDefinitions: Record<string, ColumnDefinition[]> = {
    jobpostings: [
      { name: 'jobTitle', displayName: 'Job Title', searchable: true, weight: 1.0, validationRules: ['required', 'minLength:3'], sampleData: [] },
      { name: 'jobDescription', displayName: 'Job Description', searchable: true, weight: 0.8, validationRules: ['required', 'minLength:10'], sampleData: [] },
      { name: 'location', displayName: 'Location', searchable: true, weight: 0.6, validationRules: ['required'], sampleData: [] },
      { name: 'extractedSkills', displayName: 'Skills', searchable: true, weight: 0.9, validationRules: ['array'], sampleData: [] },
      { name: 'experienceLevel', displayName: 'Experience Level', searchable: true, weight: 0.7, validationRules: ['required'], sampleData: [] }
    ],
    resumes: [
      { name: 'processedMetadata.name', displayName: 'Name', searchable: true, weight: 0.5, validationRules: ['required'], sampleData: [] },
      { name: 'processedMetadata.summary', displayName: 'Summary', searchable: true, weight: 0.8, validationRules: ['required', 'minLength:10'], sampleData: [] },
      { name: 'extractedSkills', displayName: 'Skills', searchable: true, weight: 0.9, validationRules: ['array'], sampleData: [] },
      { name: 'processedMetadata.experience', displayName: 'Experience', searchable: true, weight: 0.7, validationRules: ['required'], sampleData: [] },
      { name: 'processedMetadata.education', displayName: 'Education', searchable: true, weight: 0.6, validationRules: ['required'], sampleData: [] }
    ]
  };

  // Fetch data
  const jobPostings = useQuery(api.jobPostings.list);
  const resumes = useQuery(api.resumes.list);
  const userRole = useQuery(api.userRoles.getCurrentUserRole);
  const semanticStats = useQuery(api.semanticEmbeddingQueries.getSemanticEmbeddingStats);
  const questionsStats = useQuery(api.semanticQuestions.getStats);

  // Actions
  const batchRegenerateEmbeddings = useAction(api.semanticEmbeddingService.batchRegenerateEmbeddings);
  const getNovelQueries = useQuery(api.vectorEmbeddingQueries.getNovelUserQueries, {});

  // Calculate embedding statistics
  const calculateStats = (): EmbeddingStats => {
    const totalJobs = jobPostings?.length || 0;
    const totalResumes = resumes?.length || 0;
    const jobsWithEmbeddings = jobPostings?.filter((job: any) => job.embedding)?.length || 0;
    const resumesWithEmbeddings = resumes?.filter((resume: any) => resume.embedding)?.length || 0;
    
    return {
      totalJobs,
      totalResumes,
      jobsWithEmbeddings,
      resumesWithEmbeddings,
      jobsNeedingEmbeddings: totalJobs - jobsWithEmbeddings,
      resumesNeedingEmbeddings: totalResumes - resumesWithEmbeddings,
      coveragePercentage: {
        jobs: totalJobs > 0 ? (jobsWithEmbeddings / totalJobs) * 100 : 0,
        resumes: totalResumes > 0 ? (resumesWithEmbeddings / totalResumes) * 100 : 0
      }
    };
  };

  const stats = calculateStats();

  // Update quality metrics when data changes
  React.useEffect(() => {
    if (jobPostings && resumes) {
      const totalItems = jobPostings.length + resumes.length;
      const itemsWithEmbeddings = 
        (jobPostings?.filter((job: any) => job.embedding)?.length || 0) +
        (resumes?.filter((resume: any) => resume.embedding)?.length || 0);
      
      setConfig(prev => ({
        ...prev,
        qualityMetrics: {
          ...prev.qualityMetrics,
          coveragePercentage: totalItems > 0 ? (itemsWithEmbeddings / totalItems) * 100 : 0,
          totalItems,
          itemsWithEmbeddings
        }
      }));
    }
  }, [jobPostings, resumes]);

  // Handle embedding generation with semantic questions
  const handleGenerateEmbeddings = async () => {
    if (!userRole || userRole !== 'admin') {
      alert('Only administrators can generate embeddings');
      return;
    }

    if (!questionsStats || questionsStats.active === 0) {
      alert('No active semantic questions found. Please seed questions first.');
      return;
    }

    setProcessingStatus({
      isProcessing: true,
      currentOperation: 'Generating semantic-enhanced embeddings...',
      progress: 0,
      totalItems: 0,
      processedItems: 0
    });

    try {
      const collections = selectedTable === 'both' ? ['jobpostings', 'resumes'] : 
                         [selectedTable === 'jobs' ? 'jobpostings' : 'resumes'];
      let totalProcessed = 0;
      let totalErrors = 0;

      for (const collection of collections) {
        setProcessingStatus(prev => ({
          ...prev,
          currentOperation: `Regenerating ${collection} with ${questionsStats.active} semantic questions...`,
        }));

        const result = await batchRegenerateEmbeddings({
          collection: collection as 'jobpostings' | 'resumes',
          batchSize: config.batchSize,
          delayMs: 2000 // 2 second delay between batches
        });

        totalProcessed += result.successful || 0;
        totalErrors += result.failed || 0;

        setProcessingStatus(prev => ({
          ...prev,
          processedItems: totalProcessed,
          totalItems: result.total || 0,
          progress: ((totalProcessed + totalErrors) / (result.total || 1)) * 100
        }));
      }

      setProcessingStatus(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        currentOperation: `✓ Completed: ${totalProcessed} embeddings regenerated with semantic Q&A pairs`
      }));

    } catch (error) {
      console.error('Failed to generate semantic embeddings:', error);
      setProcessingStatus(prev => ({
        ...prev,
        isProcessing: false,
        currentOperation: '✗ Error: ' + (error instanceof Error ? error.message : 'Unknown error')
      }));
      alert('Failed to generate embeddings. Check console for details.');
    }
  };





  // Check if user is admin
  if (userRole !== 'admin') {
    return (
      <TronPanel className={className} title="Access Restricted" icon={<AlertTriangle className="h-5 w-5" />}>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-neon-warning mx-auto mb-4" />
          <h3 className="text-lg font-medium text-tron-white mb-2">
            Access Restricted
          </h3>
          <p className="text-tron-gray">
            Only administrators can access embedding management features.
          </p>
        </div>
      </TronPanel>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <TronPanel title="Embedding Management" icon={<Database className="h-6 w-6" />}>
        <p className="text-tron-gray mb-6">
          Manage AI embeddings for semantic search optimization
        </p>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <TronStatCard
            title="Job Coverage"
            value={semanticStats?.jobPostings?.coverage || stats.coveragePercentage.jobs.toFixed(1) + '%'}
            subtitle={`${semanticStats?.jobPostings?.withEmbeddings || stats.jobsWithEmbeddings}/${semanticStats?.jobPostings?.total || stats.totalJobs} jobs`}
            icon={<BarChart3 className="h-5 w-5" />}
            color="cyan"
          />
          <TronStatCard
            title="Resume Coverage"
            value={semanticStats?.resumes?.coverage || stats.coveragePercentage.resumes.toFixed(1) + '%'}
            subtitle={`${semanticStats?.resumes?.withEmbeddings || stats.resumesWithEmbeddings}/${semanticStats?.resumes?.total || stats.totalResumes} resumes`}
            icon={<BarChart3 className="h-5 w-5" />}
            color="green"
          />
          <TronStatCard
            title="Active Questions"
            value={questionsStats?.active || 0}
            subtitle={`Of ${questionsStats?.total || 0} total`}
            icon={<Zap className="h-5 w-5" />}
            color="blue"
          />
          <TronStatCard
            title="Recent Embeddings"
            value={(semanticStats?.jobPostings?.withRecentEmbeddings || 0) + (semanticStats?.resumes?.withRecentEmbeddings || 0)}
            subtitle="Last 7 days"
            icon={<CheckCircle className="h-5 w-5" />}
            color="orange"
          />
        </div>

        {/* Semantic Questions Banner */}
        {questionsStats && (
          <div className="bg-tron-bg-card rounded-lg p-4 border border-tron-cyan/30">
            <div className="flex items-start">
              <Zap className="h-5 w-5 text-tron-cyan mr-3 mt-1" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-tron-white mb-1">
                  Semantic Questions System Active
                </h4>
                <p className="text-xs text-tron-gray">
                  Embeddings are enhanced with <strong>{questionsStats.active} semantic questions</strong> including:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(questionsStats.byCategory || {}).map(([category, count]) => (
                    <span key={category} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-tron-bg-panel text-tron-cyan border border-tron-cyan/20">
                      {category.replace('_', ' ')}: {count as number}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </TronPanel>

      {/* Configuration Panel */}
      <TronPanel title="Configuration" icon={<Settings className="h-5 w-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-tron-gray mb-2">
              Target Table
            </label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value as 'jobs' | 'resumes' | 'both')}
              className="tron-select w-full"
            >
              <option value="both">Both Jobs & Resumes</option>
              <option value="jobs">Jobs Only</option>
              <option value="resumes">Resumes Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-tron-gray mb-2">
              Batch Size
            </label>
            <select
              value={config.batchSize}
              onChange={(e) => setConfig(prev => ({ ...prev, batchSize: Number(e.target.value) as 5 | 10 | 20 | 50 }))}
              className="tron-select w-full"
            >
              <option value={5}>5 items</option>
              <option value={10}>10 items</option>
              <option value={20}>20 items</option>
              <option value={50}>50 items</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <TronButton
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            icon={<Settings className="h-4 w-4" />}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </TronButton>
        </div>

        {showAdvanced && (
          <div className="mt-4 p-4 bg-tron-bg-card rounded-lg border border-tron-cyan/20">
            <h4 className="text-sm font-medium text-tron-white mb-3">Advanced Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-sm text-tron-gray">
                <p><strong>Model:</strong> Gemini MRL 2048</p>
                <p><strong>Dimensions:</strong> 2048</p>
                <p><strong>Cost:</strong> $0.0001 per 1K tokens</p>
              </div>
              <div className="text-sm text-tron-gray">
                <p><strong>Processing:</strong> Real-time</p>
                <p><strong>Storage:</strong> Convex Vector DB</p>
                <p><strong>Update:</strong> On data change</p>
              </div>
            </div>
          </div>
        )}
      </TronPanel>

      {/* Enhanced Configuration */}
      <TronPanel title="Enhanced Configuration" icon={<Settings className="h-5 w-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Collection Selection */}
          <div>
            <label className="block text-sm font-medium text-tron-gray mb-2">
              Collection
            </label>
            <select
              value={config.selectedCollection}
              onChange={(e) => setConfig(prev => ({ ...prev, selectedCollection: e.target.value as 'resumes' | 'jobpostings' }))}
              className="tron-select w-full"
            >
              <option value="jobpostings">Job Postings</option>
              <option value="resumes">Resumes</option>
            </select>
          </div>

          {/* Column Selection */}
          <div>
            <label className="block text-sm font-medium text-tron-gray mb-2">
              Focus Column
            </label>
            <select
              value={config.selectedColumn}
              onChange={(e) => setConfig(prev => ({ ...prev, selectedColumn: e.target.value }))}
              className="tron-select w-full"
            >
              {columnDefinitions[config.selectedCollection]?.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-tron-bg-card p-4 rounded-lg border border-tron-cyan/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-tron-gray">Coverage</span>
              <span className="text-lg font-semibold text-tron-white">
                {config.qualityMetrics.coveragePercentage.toFixed(1)}%
              </span>
            </div>
            <div className="tron-progress mt-2">
              <div
                className="tron-progress-bar bg-neon-success"
                style={{ width: `${config.qualityMetrics.coveragePercentage}%` }}
              />
            </div>
          </div>

          <div className="bg-tron-bg-card p-4 rounded-lg border border-tron-cyan/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-tron-gray">Total Items</span>
              <span className="text-lg font-semibold text-tron-white">
                {config.qualityMetrics.totalItems}
              </span>
            </div>
          </div>

          <div className="bg-tron-bg-card p-4 rounded-lg border border-tron-cyan/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-tron-gray">With Embeddings</span>
              <span className="text-lg font-semibold text-tron-white">
                {config.qualityMetrics.itemsWithEmbeddings}
              </span>
            </div>
          </div>
        </div>
      </TronPanel>

      {/* Action Buttons */}
      <TronPanel title="Actions" icon={<Play className="h-5 w-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <TronButton
            onClick={handleGenerateEmbeddings}
            disabled={processingStatus.isProcessing}
            variant="primary"
            color="cyan"
            icon={<Play className="h-5 w-5" />}
            loading={processingStatus.isProcessing}
          >
            Generate New Embeddings
          </TronButton>
        </div>

        <div className="mt-4 space-y-2">
          <div className="bg-tron-bg-card rounded-lg p-3 border border-tron-cyan/30">
            <p className="text-sm text-tron-white font-medium mb-1">
              ✨ Semantic Enhancement Active
            </p>
            <p className="text-xs text-tron-gray">
              Each document will be analyzed using <strong>{questionsStats?.active || 0} semantic questions</strong>, 
              generating 13-15 Q&A pairs to create richer, more contextual embeddings for improved semantic matching.
            </p>
          </div>
          <div className="text-xs text-tron-gray space-y-1">
            <p><strong>⏱️ Processing Time:</strong> ~3-5 seconds per document</p>
            <p><strong>💰 Cost Estimate:</strong> $0.04-$0.08 for 200 documents (OpenAI API)</p>
            <p><strong>🎯 Batch Size:</strong> {config.batchSize} documents at a time with 2s delay</p>
            <p><strong>🔒 Permission:</strong> Admin access required</p>
          </div>
        </div>
      </TronPanel>

      {/* Novel User Queries Section */}
      {getNovelQueries && getNovelQueries.length > 0 && (
        <TronPanel title="Discovered Search Patterns" icon={<Zap className="h-5 w-5" />}>
          <p className="text-sm text-tron-gray mb-4">
            These user queries appear frequently and could enhance future embeddings:
          </p>
          
          <div className="space-y-3">
            {getNovelQueries.slice(0, 10).map((queryData: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-tron-bg-card rounded-lg border border-tron-cyan/20">
                <div className="flex-1">
                  <p className="text-sm font-medium text-tron-white">
                    "{queryData.query}"
                  </p>
                  <p className="text-xs text-tron-gray">
                    Used {queryData.usageCount} times | Confidence: {(queryData.averageConfidence * 100).toFixed(0)}%
                  </p>
                </div>
                <TronButton
                  onClick={() => {
                    // In a full implementation, this would add the query to the static prompts
                    console.log('Add to prompts:', queryData.query);
                  }}
                  variant="outline"
                  color="cyan"
                  size="sm"
                >
                  Add to Prompts
                </TronButton>
              </div>
            ))}
          </div>
        </TronPanel>
      )}

      {/* Processing Status */}
      {processingStatus.isProcessing && (
        <TronPanel title="Processing Status" icon={<RefreshCw className="h-5 w-5 animate-spin" />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-tron-gray">
                {processingStatus.currentOperation}
              </span>
              <span className="text-sm font-medium text-tron-white">
                {processingStatus.processedItems}/{processingStatus.totalItems}
              </span>
            </div>
            
            <div className="tron-progress">
              <div
                className="tron-progress-bar bg-tron-cyan"
                style={{ width: `${processingStatus.progress}%` }}
              />
            </div>
            
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-tron-cyan mx-auto"></div>
              <p className="text-sm text-tron-gray mt-2">
                Please wait while embeddings are being processed...
              </p>
            </div>
          </div>
        </TronPanel>
      )}

      {/* Processing Complete */}
      {!processingStatus.isProcessing && processingStatus.processedItems > 0 && (
        <TronPanel>
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-neon-success mx-auto mb-4" />
            <h3 className="text-lg font-medium text-tron-white mb-2">
              Processing Complete
            </h3>
            <p className="text-tron-gray">
              Successfully processed {processingStatus.processedItems} items.
            </p>
            <p className="text-sm text-tron-gray mt-1">
              The page will refresh automatically to show updated statistics.
            </p>
          </div>
        </TronPanel>
      )}

      {/* System Information */}
      <TronPanel title="System Information" icon={<Database className="h-5 w-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-tron-white mb-2">Semantic Embedding System</h4>
            <div className="space-y-2 text-sm text-tron-gray">
              <p><strong>Model:</strong> OpenAI text-embedding-3-small</p>
              <p><strong>Vector Dimensions:</strong> 1536</p>
              <p><strong>Enhancement:</strong> {questionsStats?.active || 0} semantic questions</p>
              <p><strong>Storage:</strong> Convex Database with vector fields</p>
              <p><strong>Q&A Generation:</strong> GPT-4 for semantic analysis</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-tron-white mb-2">Performance & Quality</h4>
            <div className="space-y-2 text-sm text-tron-gray">
              <p><strong>Search Accuracy:</strong> Enhanced with Q&A context</p>
              <p><strong>Question Categories:</strong> {Object.keys(questionsStats?.byCategory || {}).length}</p>
              <p><strong>Total Usage:</strong> {questionsStats?.totalUsage || 0} Q&A pairs generated</p>
              <p><strong>Avg Effectiveness:</strong> {questionsStats?.averageEffectiveness?.toFixed(1) || 0}%</p>
            </div>
          </div>
        </div>
      </TronPanel>
    </div>
  );
}
