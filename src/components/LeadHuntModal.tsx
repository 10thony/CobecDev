import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { X, Play, Pause, Square, Search, Loader2, User, Bot } from 'lucide-react';
import { LeadReviewPanel } from './LeadReviewPanel';
import { SystemPromptSelect } from './SystemPromptSelect';
import { ClickableJsonViewer } from './ClickableJsonViewer';

interface LeadHuntModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialState?: string;
}

export function LeadHuntModal({ isOpen, onClose, initialState = '' }: LeadHuntModalProps) {
  const [selectedPromptId, setSelectedPromptId] = useState<Id<"chatSystemPrompts"> | null | undefined>(undefined);
  const [userInput, setUserInput] = useState('');
  const [workflowId, setWorkflowId] = useState<Id<"leadHuntWorkflows"> | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const createWorkflow = useMutation(api.leadHuntWorkflows.createWorkflow);
  const startWorkflow = useAction(api.leadHuntWorkflows.startWorkflow);
  const cancelWorkflow = useAction(api.leadHuntWorkflows.cancelWorkflow);
  const resumeWorkflow = useMutation(api.leadHuntWorkflows.resumeWorkflow);
  const triggerResumeEvent = useAction(api.leadHuntWorkflows.triggerResumeEvent);
  
  // Get system prompts and types
  const systemPrompts = useQuery(api.chatSystemPrompts.list, {});
  const promptTypes = useQuery(api.chatSystemPromptTypes.list, {});
  
  // Get active workflows to auto-load if one exists
  const activeWorkflows = useQuery(api.leadHuntWorkflows.getActiveWorkflows);
  
  // Filter to only "leads" type prompts
  const leadsTypeId = useMemo(() => {
    return promptTypes?.find(t => t.name === "leads")?._id;
  }, [promptTypes]);
  
  const leadsPrompts = useMemo(() => {
    if (!systemPrompts || !leadsTypeId) return undefined;
    return systemPrompts.filter(p => p.type === leadsTypeId);
  }, [systemPrompts, leadsTypeId]);
  
  // Auto-load the most recent active workflow if no workflowId is set
  // Only load if it's actually running or paused (not canceled/failed/completed)
  useEffect(() => {
    if (isOpen && !workflowId && activeWorkflows && activeWorkflows.length > 0) {
      // Filter to only truly active workflows
      const trulyActive = activeWorkflows.filter(
        w => w.status === "running" || w.status === "paused"
      );
      
      if (trulyActive.length > 0) {
        // Load the most recent active workflow
        const mostRecent = trulyActive.sort((a, b) => b.createdAt - a.createdAt)[0];
        setWorkflowId(mostRecent._id);
        setSelectedPromptId(mostRecent.systemPromptId || undefined);
        setUserInput(mostRecent.userInput);
      }
    }
  }, [isOpen, workflowId, activeWorkflows]);

  const workflow = useQuery(
    api.leadHuntWorkflows.getWorkflow,
    workflowId ? { workflowId } : "skip"
  );

  const handleStart = async () => {
    if (selectedPromptId === null) {
      alert('Please select a state lead system prompt');
      return;
    }

    // Extract state from prompt title if a specific prompt is selected
    // Otherwise use "Primary" for the default primary prompt
    let stateName = 'Primary';
    if (selectedPromptId) {
      const selectedPrompt = leadsPrompts?.find(p => p._id === selectedPromptId);
      if (selectedPrompt) {
        // Try to extract state name from title
        // Common patterns: "Texas", "Texas Lead Generation", "Texas - Lead Generation", etc.
        const titleParts = selectedPrompt.title.split(/[\s-–—]/);
        stateName = titleParts[0] || selectedPrompt.title || 'Selected State';
      }
    } else if (selectedPromptId === undefined) {
      // Using primary/default prompt
      stateName = 'Primary';
    }

    try {
      const newWorkflowId = await createWorkflow({
        state: stateName,
        userInput: userInput.trim() || `Find procurement leads in ${stateName}`,
        systemPromptId: selectedPromptId || undefined,
      });

      setWorkflowId(newWorkflowId);

      // Start the workflow
      await startWorkflow({ workflowId: newWorkflowId });
    } catch (error) {
      console.error('Error starting workflow:', error);
      alert(`Failed to start workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancel = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!workflowId || isCanceling) {
      return;
    }

    setIsCanceling(true);
    
    try {
      const result = await cancelWorkflow({ workflowId });
      
      // Always reset state after cancel attempt, even if it fails
      // This prevents the UI from getting stuck
      setWorkflowId(null);
      setSelectedPromptId(undefined);
      setUserInput('');
      
      if (!result?.success) {
        console.warn('Cancel may not have completed successfully');
      }
    } catch (error) {
      console.error('Error canceling workflow:', error);
      // Still reset the UI even on error
      setWorkflowId(null);
      setSelectedPromptId(undefined);
      setUserInput('');
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to cancel workflow: ${errorMessage}. UI has been reset.`);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleReset = () => {
    setWorkflowId(null);
    setSelectedPromptId(undefined);
    setUserInput('');
  };

  const handleResume = async () => {
    if (!workflowId) return;

    try {
      await resumeWorkflow({ workflowId });
      // Trigger the resume event
      await triggerResumeEvent({ workflowId });
    } catch (error) {
      console.error('Error resuming workflow:', error);
      alert(`Failed to resume workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-tron-cyan';
      case 'paused':
        return 'text-yellow-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'canceled':
        return 'text-gray-400';
      default:
        return 'text-tron-gray';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-gray-500',
      running: 'bg-tron-cyan',
      paused: 'bg-yellow-500',
      completed: 'bg-green-500',
      canceled: 'bg-gray-500',
      failed: 'bg-red-500',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status as keyof typeof colors] || 'bg-gray-500'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-tron-bg-panel border border-tron-cyan/30 rounded-lg shadow-tron-glow w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-tron-white flex items-center gap-2">
              <Search className="w-6 h-6 text-tron-cyan" />
              Lead Hunt
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-tron-cyan/10 rounded-lg transition-colors text-tron-gray hover:text-tron-cyan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Workflow Status */}
          {workflow && (
            <div className="mb-6 p-4 bg-tron-bg-card border border-tron-cyan/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getStatusBadge(workflow.status)}
                  <span className={`text-sm font-medium ${getStatusColor(workflow.status)}`}>
                    {workflow.currentTask || 'Idle'}
                  </span>
                </div>
                {workflow.currentStep && workflow.totalSteps && (
                  <span className="text-sm text-tron-gray">
                    Step {workflow.currentStep} of {workflow.totalSteps}
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              {workflow.currentStep && workflow.totalSteps && (
                <div className="mt-3 w-full bg-tron-bg-panel rounded-full h-2">
                  <div
                    className="bg-tron-cyan h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(workflow.currentStep / workflow.totalSteps) * 100}%`,
                    }}
                  />
                </div>
              )}

              {/* Leads Found */}
              {workflow.leadsFound > 0 && (
                <div className="mt-3 text-sm text-tron-gray">
                  Found {workflow.leadsFound} lead{workflow.leadsFound !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {/* Raw AI Response - Always show for debugging when workflow has run */}
          {workflow && workflow.status !== 'pending' && (
            <div className="mb-6 p-4 bg-tron-bg-card border border-tron-cyan/20 rounded-lg">
              <h3 className="text-lg font-semibold text-tron-white mb-3 flex items-center gap-2">
                <span>Raw AI Response</span>
                <span className="text-xs text-tron-gray font-normal">(for debugging and system improvement)</span>
              </h3>
              {workflow.rawAiResponse ? (
                <div className="bg-tron-bg-deep border border-tron-cyan/10 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <ClickableJsonViewer content={workflow.rawAiResponse} />
                </div>
              ) : (
                <div className="bg-tron-bg-deep border border-tron-cyan/10 rounded-lg p-4 text-sm text-tron-gray">
                  <p className="text-yellow-400 mb-2">⚠️ Raw AI response not available</p>
                  <p>This may indicate the workflow failed before receiving a response, or the response was not stored.</p>
                  {workflow.status === 'failed' && workflow.currentTask && (
                    <p className="mt-2 text-tron-orange">Error: {workflow.currentTask}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Lead Review Panel - Show when workflow is paused (waiting for review) or has leads found */}
          {workflow && workflowId && (workflow.status === 'paused' || workflow.leadsFound > 0) && (
            <div className="mb-6">
              <LeadReviewPanel workflowId={workflowId} workflowLeadsFound={workflow.leadsFound} />
            </div>
          )}
          

          {/* Form */}
          {!workflow && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-tron-white mb-2">
                  State Lead System Prompt
                </label>
                <SystemPromptSelect
                  value={selectedPromptId}
                  onChange={setSelectedPromptId}
                  systemPrompts={leadsPrompts}
                  promptTypes={promptTypes}
                  disabled={leadsPrompts === undefined}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tron-white mb-2">
                  Additional Query (Optional)
                </label>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="e.g., Focus on NASA contracts, DOT initiatives, or technology procurement"
                  rows={3}
                  className="w-full px-4 py-2 bg-tron-bg-card border border-tron-cyan/30 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:border-tron-cyan resize-none"
                />
                <div className="mt-2 text-xs text-tron-gray">
                  <p className="mb-1">Example queries by state:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Texas:</strong> "Focus on NASA Johnson Space Center contracts, Texas DOT technology initiatives, and state technology procurement"</li>
                    <li><strong>Florida:</strong> "Focus on NASA Kennedy Space Center contracts, Florida DOT infrastructure projects, and aerospace technology procurement"</li>
                    <li><strong>California:</strong> "Focus on NASA JPL contracts, Caltrans technology initiatives, and state innovation procurement"</li>
                    <li><strong>General:</strong> "Focus on technology procurement, IT services, and digital transformation initiatives"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            {workflow && (
              <>
                {workflow.status === 'paused' && (
                  <button
                    onClick={handleResume}
                    className="px-4 py-2 bg-tron-cyan text-tron-black rounded-lg font-semibold hover:bg-tron-cyan/80 transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </button>
                )}
                {(workflow.status === 'running' || workflow.status === 'paused') && (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={isCanceling}
                      className="px-4 py-2 bg-tron-orange text-tron-white rounded-lg font-semibold hover:bg-tron-orange/80 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCanceling ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Canceling...
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4" />
                          Cancel
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-tron-bg-card border border-tron-cyan/30 text-tron-white rounded-lg font-semibold hover:bg-tron-cyan/10 transition-colors"
                    >
                      Start New Hunt
                    </button>
                  </>
                )}
                {(workflow.status === 'completed' || workflow.status === 'failed' || workflow.status === 'canceled') && (
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-tron-cyan text-tron-black rounded-lg font-semibold hover:bg-tron-cyan/80 transition-colors"
                  >
                    New Hunt
                  </button>
                )}
              </>
            )}

            {!workflow && (
              <button
                onClick={handleStart}
                disabled={selectedPromptId === null || leadsPrompts === undefined}
                className="px-4 py-2 bg-tron-cyan text-tron-black rounded-lg font-semibold hover:bg-tron-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Hunt
              </button>
            )}

            <button
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="px-4 py-2 bg-tron-bg-card border border-tron-cyan/30 text-tron-white rounded-lg font-semibold hover:bg-tron-cyan/10 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
