import React, { useState, useEffect } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
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

  // Actions
  const generateBatchEmbeddings = useAction(api.vectorEmbeddingService.generateBatchVectorEmbeddings);
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

  // Handle embedding generation
  const handleGenerateEmbeddings = async () => {
    if (!userRole || userRole !== 'admin') {
      alert('Only administrators can generate embeddings');
      return;
    }

    setProcessingStatus({
      isProcessing: true,
      currentOperation: 'Generating vector-aware embeddings...',
      progress: 0,
      totalItems: 0,
      processedItems: 0
    });

    try {
      const collections = selectedTable === 'both' ? ['jobs', 'resumes'] : [selectedTable];
      let totalProcessed = 0;
      let totalErrors = 0;

      for (const collectionType of collections) {
        const collection = collectionType === 'jobs' ? 'jobpostings' : 'resumes';
        
        setProcessingStatus(prev => ({
          ...prev,
          currentOperation: `Generating ${collection} embeddings with vector prompts...`,
        }));

        const result = await generateBatchEmbeddings({
          collection,
          batchSize: config.batchSize,
          forceRegenerate: false
        });

        totalProcessed += result.successful;
        totalErrors += result.failed;

        setProcessingStatus(prev => ({
          ...prev,
          processedItems: totalProcessed,
          progress: ((totalProcessed + totalErrors) / (result.total || 1)) * 100
        }));
      }

      setProcessingStatus(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        currentOperation: `Completed: ${totalProcessed} updated, ${totalErrors} errors`
      }));

      // Data will automatically refresh via Convex reactive queries
      // No need for manual page reload

    } catch (error) {
      console.error('Failed to generate vector-aware embeddings:', error);
      setProcessingStatus(prev => ({
        ...prev,
        isProcessing: false,
        currentOperation: 'Error occurred during processing'
      }));
      alert('Failed to generate embeddings. Check console for details.');
    }
  };





  // Check if user is admin
  if (userRole !== 'admin') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Only administrators can access embedding management features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Embedding Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage AI embeddings for semantic search optimization
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Database className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Job Coverage</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.coveragePercentage.jobs.toFixed(1)}%
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {stats.jobsWithEmbeddings}/{stats.totalJobs} jobs
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Resume Coverage</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {stats.coveragePercentage.resumes.toFixed(1)}%
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {stats.resumesWithEmbeddings}/{stats.totalResumes} resumes
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Jobs Pending</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {stats.jobsNeedingEmbeddings}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Need embeddings
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Resumes Pending</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {stats.resumesNeedingEmbeddings}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  Need embeddings
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Table
            </label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value as 'jobs' | 'resumes' | 'both')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="both">Both Jobs & Resumes</option>
              <option value="jobs">Jobs Only</option>
              <option value="resumes">Resumes Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Batch Size
            </label>
            <select
              value={config.batchSize}
              onChange={(e) => setConfig(prev => ({ ...prev, batchSize: Number(e.target.value) as 5 | 10 | 20 | 50 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value={5}>5 items</option>
              <option value={10}>10 items</option>
              <option value={20}>20 items</option>
              <option value={50}>50 items</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
          >
            <Settings className="h-4 w-4 mr-1" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Advanced Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Model:</strong> Gemini MRL 2048</p>
                <p><strong>Dimensions:</strong> 2048</p>
                <p><strong>Cost:</strong> $0.0001 per 1K tokens</p>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Processing:</strong> Real-time</p>
                <p><strong>Storage:</strong> Convex Vector DB</p>
                <p><strong>Update:</strong> On data change</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Collection Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Collection
            </label>
            <select
              value={config.selectedCollection}
              onChange={(e) => setConfig(prev => ({ ...prev, selectedCollection: e.target.value as 'resumes' | 'jobpostings' }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="jobpostings">Job Postings</option>
              <option value="resumes">Resumes</option>
            </select>
          </div>

          {/* Column Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Focus Column
            </label>
            <select
              value={config.selectedColumn}
              onChange={(e) => setConfig(prev => ({ ...prev, selectedColumn: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Coverage</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {config.qualityMetrics.coveragePercentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${config.qualityMetrics.coveragePercentage}%` }}
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {config.qualityMetrics.totalItems}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">With Embeddings</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {config.qualityMetrics.itemsWithEmbeddings}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Actions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <button
            onClick={handleGenerateEmbeddings}
            disabled={processingStatus.isProcessing}
            className="flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            <Play className="h-5 w-5 mr-2" />
            Generate New Embeddings
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>Generate New:</strong> Creates vector-aware embeddings using prompt enhancement</p>
          <p><strong>Note:</strong> Only administrators can generate embeddings</p>
        </div>
      </div>

      {/* Novel User Queries Section */}
      {getNovelQueries && getNovelQueries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Discovered Search Patterns
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            These user queries appear frequently and could enhance future embeddings:
          </p>
          
          <div className="space-y-3">
            {getNovelQueries.slice(0, 10).map((queryData: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    "{queryData.query}"
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Used {queryData.usageCount} times | Confidence: {(queryData.averageConfidence * 100).toFixed(0)}%
                  </p>
                </div>
                <button
                  onClick={() => {
                    // In a full implementation, this would add the query to the static prompts
                    console.log('Add to prompts:', queryData.query);
                  }}
                  className="ml-4 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Add to Prompts
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Status */}
      {processingStatus.isProcessing && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Processing Status
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {processingStatus.currentOperation}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {processingStatus.processedItems}/{processingStatus.totalItems}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingStatus.progress}%` }}
              />
            </div>
            
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Please wait while embeddings are being processed...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Processing Complete */}
      {!processingStatus.isProcessing && processingStatus.processedItems > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Processing Complete
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Successfully processed {processingStatus.processedItems} items.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              The page will refresh automatically to show updated statistics.
            </p>
          </div>
        </div>
      )}

      {/* System Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Embedding System</h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p><strong>Model:</strong> Google Gemini MRL 2048</p>
              <p><strong>Vector Dimensions:</strong> 2048</p>
              <p><strong>Storage:</strong> Convex Built-in Vector DB</p>
              <p><strong>Update Strategy:</strong> Real-time on data change</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Performance</h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p><strong>Search Speed:</strong> Sub-second response</p>
              <p><strong>Accuracy:</strong> 50%+ similarity threshold</p>
              <p><strong>Scalability:</strong> Handles 10K+ documents</p>
              <p><strong>Cost:</strong> ~$0.01 per 100 embeddings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
