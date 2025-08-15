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

  // Fetch data
  const jobPostings = useQuery(api.jobPostings.list);
  const resumes = useQuery(api.resumes.list);
  const userRole = useQuery(api.userRoles.getCurrentUserRole);

  // Actions
  const generateJobEmbeddings = useAction(api.embeddingService.generateJobEmbeddings);
  const generateResumeEmbeddings = useAction(api.embeddingService.generateResumeEmbeddings);
  const regenerateEmbeddings = useAction(api.embeddingService.regenerateEmbeddings);
  const deleteEmbeddings = useAction(api.embeddingService.deleteEmbeddings);

  // Calculate embedding statistics
  const calculateStats = (): EmbeddingStats => {
    const totalJobs = jobPostings?.length || 0;
    const totalResumes = resumes?.length || 0;
    const jobsWithEmbeddings = jobPostings?.filter(job => job.embedding)?.length || 0;
    const resumesWithEmbeddings = resumes?.filter(resume => resume.embedding)?.length || 0;
    
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

  // Handle embedding generation
  const handleGenerateEmbeddings = async () => {
    if (!userRole || userRole !== 'admin') {
      alert('Only administrators can generate embeddings');
      return;
    }

    setProcessingStatus({
      isProcessing: true,
      currentOperation: 'Generating embeddings...',
      progress: 0,
      totalItems: 0,
      processedItems: 0
    });

    try {
      let totalProcessed = 0;
      let totalItems = 0;

      if (selectedTable === 'jobs' || selectedTable === 'both') {
        const jobsNeedingEmbeddings = jobPostings?.filter(job => !job.embedding) || [];
        totalItems += jobsNeedingEmbeddings.length;
        
        if (jobsNeedingEmbeddings.length > 0) {
          setProcessingStatus(prev => ({
            ...prev,
            currentOperation: 'Generating job embeddings...',
            totalItems: jobsNeedingEmbeddings.length
          }));

          await generateJobEmbeddings({
            batchSize,
            limit: jobsNeedingEmbeddings.length
          });
          
          totalProcessed += jobsNeedingEmbeddings.length;
        }
      }

      if (selectedTable === 'resumes' || selectedTable === 'both') {
        const resumesNeedingEmbeddings = resumes?.filter(resume => !resume.embedding) || [];
        totalItems += resumesNeedingEmbeddings.length;
        
        if (resumesNeedingEmbeddings.length > 0) {
          setProcessingStatus(prev => ({
            ...prev,
            currentOperation: 'Generating resume embeddings...',
            totalItems: resumesNeedingEmbeddings.length
          }));

          await generateResumeEmbeddings({
            batchSize,
            limit: resumesNeedingEmbeddings.length
          });
          
          totalProcessed += resumesNeedingEmbeddings.length;
        }
      }

      setProcessingStatus(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        processedItems: totalProcessed
      }));

      // Refresh data after processing
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      setProcessingStatus(prev => ({
        ...prev,
        isProcessing: false,
        currentOperation: 'Error occurred during processing'
      }));
      alert('Failed to generate embeddings. Check console for details.');
    }
  };

  // Handle embedding regeneration
  const handleRegenerateEmbeddings = async () => {
    if (!userRole || userRole !== 'admin') {
      alert('Only administrators can regenerate embeddings');
      return;
    }

    if (!confirm('This will regenerate all embeddings for the selected table(s). This may take some time and will overwrite existing embeddings. Continue?')) {
      return;
    }

    setProcessingStatus({
      isProcessing: true,
      currentOperation: 'Regenerating embeddings...',
      progress: 0,
      totalItems: 0,
      processedItems: 0
    });

    try {
      let totalItems = 0;

      if (selectedTable === 'jobs' || selectedTable === 'both') {
        totalItems += jobPostings?.length || 0;
      }

      if (selectedTable === 'resumes' || selectedTable === 'both') {
        totalItems += resumes?.length || 0;
      }

      setProcessingStatus(prev => ({
        ...prev,
        totalItems
      }));

      await regenerateEmbeddings({
        table: selectedTable,
        batchSize
      });

      setProcessingStatus(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        processedItems: totalItems
      }));

      // Refresh data after processing
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Failed to regenerate embeddings:', error);
      setProcessingStatus(prev => ({
        ...prev,
        isProcessing: false,
        currentOperation: 'Error occurred during processing'
      }));
      alert('Failed to regenerate embeddings. Check console for details.');
    }
  };

  // Handle embedding deletion
  const handleDeleteEmbeddings = async () => {
    if (!userRole || userRole !== 'admin') {
      alert('Only administrators can delete embeddings');
      return;
    }

    if (!confirm('This will delete ALL embeddings for the selected table(s). This action cannot be undone. Continue?')) {
      return;
    }

    try {
      await deleteEmbeddings({
        table: selectedTable
      });

      alert('Embeddings deleted successfully');
      
      // Refresh data after deletion
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Failed to delete embeddings:', error);
      alert('Failed to delete embeddings. Check console for details.');
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
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value))}
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

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Actions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleGenerateEmbeddings}
            disabled={processingStatus.isProcessing}
            className="flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            <Play className="h-5 w-5 mr-2" />
            Generate New
          </button>

          <button
            onClick={handleRegenerateEmbeddings}
            disabled={processingStatus.isProcessing}
            className="flex items-center justify-center px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Regenerate All
          </button>

          <button
            onClick={handleDeleteEmbeddings}
            disabled={processingStatus.isProcessing}
            className="flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Delete All
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>Generate New:</strong> Creates embeddings for items that don't have them</p>
          <p><strong>Regenerate All:</strong> Recreates all embeddings (overwrites existing)</p>
          <p><strong>Delete All:</strong> Removes all embeddings (irreversible)</p>
        </div>
      </div>

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
