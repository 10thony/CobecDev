import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { CheckCircle, XCircle, ExternalLink, Building, MapPin, Calendar, DollarSign, AlertCircle } from 'lucide-react';

interface LeadReviewPanelProps {
  workflowId: Id<"leadHuntWorkflows">;
  workflowLeadsFound?: number; // Total leads found by the workflow
}

interface Lead {
  _id: Id<"leads">;
  opportunityTitle: string;
  opportunityType: string;
  location: {
    region: string;
    city?: string;
    county?: string;
  };
  issuingBody: {
    name: string;
    level: string;
  };
  source: {
    url: string;
    documentName: string;
  };
  summary: string;
  estimatedValueUSD?: number;
  keyDates?: {
    publishedDate?: string;
    bidDeadline?: string;
  };
  viabilityStatus?: "pending" | "viable" | "not_viable";
}

export function LeadReviewPanel({ workflowId, workflowLeadsFound }: LeadReviewPanelProps) {
  const pendingLeads = useQuery(api.leadHuntWorkflows.getPendingLeads, { workflowId });
  const markViable = useMutation(api.leadHuntWorkflows.markLeadViable);
  const markNotViable = useMutation(api.leadHuntWorkflows.markLeadNotViable);

  const handleMarkViable = async (leadId: Id<"leads">) => {
    try {
      await markViable({ leadId, workflowId });
    } catch (error) {
      console.error('Error marking lead as viable:', error);
      alert(`Failed to mark lead as viable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleMarkNotViable = async (leadId: Id<"leads">) => {
    if (!confirm('Are you sure you want to mark this lead as not viable? It will be deleted.')) {
      return;
    }

    try {
      await markNotViable({ leadId, workflowId });
    } catch (error) {
      console.error('Error marking lead as not viable:', error);
      alert(`Failed to mark lead as not viable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!pendingLeads) {
    return (
      <div className="p-6 text-center text-tron-gray">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tron-cyan mx-auto"></div>
        <p className="mt-2">Loading leads...</p>
      </div>
    );
  }

  if (pendingLeads.length === 0) {
    // Distinguish between "no leads found" vs "all leads reviewed"
    if (workflowLeadsFound === 0 || workflowLeadsFound === undefined) {
      return (
        <div className="p-6 text-center text-tron-gray">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
          <p className="text-lg font-semibold text-tron-white mb-2">No Leads Found</p>
          <p className="text-sm">
            The AI agent did not return any leads that could be parsed and stored.
            <br />
            Check the "Raw AI Response" section above to see what the AI returned.
            <br />
            This may indicate an issue with the system prompt or the AI's response format.
          </p>
        </div>
      );
    }
    
    // If leads were found but all have been reviewed
    return (
      <div className="p-6 text-center text-tron-gray">
        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
        <p className="text-lg font-semibold text-tron-white mb-2">All Leads Reviewed</p>
        <p className="text-sm">
          You've reviewed all {workflowLeadsFound} lead{workflowLeadsFound !== 1 ? 's' : ''} found by this hunt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-tron-bg-card border border-tron-cyan/20 rounded-lg overflow-hidden">
        <h3 className="text-lg font-semibold text-tron-white mb-2">
          Review Leads ({pendingLeads.length} pending)
        </h3>
        <p className="text-sm text-tron-gray">
          Review each lead and mark it as viable or not viable. Open the source URL in a new tab to review the opportunity.
        </p>
      </div>

      <div className="space-y-4">
        {pendingLeads.map((lead: Lead) => (
          <div
            key={lead._id}
            className="p-5 border border-tron-cyan/20 rounded-lg bg-tron-bg-card hover:border-tron-cyan/40 transition-colors overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-tron-white mb-2">
                  {lead.opportunityTitle}
                </h4>
                <div className="flex flex-wrap items-center gap-4 text-sm text-tron-gray mb-3">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    <span>{lead.issuingBody.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{lead.location.region}{lead.location.city ? `, ${lead.location.city}` : ''}</span>
                  </div>
                  {lead.estimatedValueUSD && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold text-tron-white">
                        ${lead.estimatedValueUSD.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {lead.keyDates?.bidDeadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Deadline: {lead.keyDates.bidDeadline}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-tron-gray line-clamp-3 mb-3">
                  {lead.summary}
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={lead.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      openUrl(lead.source.url);
                    }}
                    className="text-sm text-tron-cyan hover:text-tron-cyan/80 flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {lead.source.url}
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-tron-cyan/20">
              <button
                onClick={() => handleMarkNotViable(lead._id)}
                className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg font-semibold hover:bg-red-500/30 transition-colors flex items-center gap-2 overflow-hidden"
              >
                <XCircle className="w-4 h-4" />
                Not Viable
              </button>
              <button
                onClick={() => handleMarkViable(lead._id)}
                className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg font-semibold hover:bg-green-500/30 transition-colors flex items-center gap-2 overflow-hidden"
              >
                <CheckCircle className="w-4 h-4" />
                Mark Viable
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
