import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { TronPanel } from '../TronPanel';
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  Zap, 
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Bot,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { Id } from '../../../convex/_generated/dataModel';

interface AnalyticsEntry {
  _id: Id<"resumeParsingAnalytics">;
  _creationTime: number;
  resumeId?: Id<"resumes">;
  filename: string;
  userId: string;
  inputText: string;
  outputJson: string;
  model: string;
  provider: string;
  requestTokens: number;
  responseTokens: number;
  totalTokens: number;
  requestCostCents: number;
  responseCostCents: number;
  totalCostCents: number;
  isError?: boolean;
  errorMessage?: string;
  latencyMs?: number;
  parserType: string;
  createdAt: number;
}

export function ResumeParsingAnalytics() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30');
  
  // Memoize date calculations to prevent infinite query loops
  const days = useMemo(() => parseInt(dateRange) || 30, [dateRange]);
  const startDate = useMemo(() => {
    if (dateRange === 'all') return undefined;
    // Round to nearest hour to prevent constant recalculation
    const now = Math.floor(Date.now() / (60 * 60 * 1000)) * (60 * 60 * 1000);
    return now - (days * 24 * 60 * 60 * 1000);
  }, [dateRange, days]);

  // Fetch analytics data
  const analyticsData = useQuery(api.resumeParsingAnalytics.list, { limit: 100 });
  const stats = useQuery(api.resumeParsingAnalytics.getStats, {
    startDate,
  });
  const dailyStats = useQuery(api.resumeParsingAnalytics.getDailyStats, {
    days,
  });

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(4)}`;
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString();
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (!analyticsData || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tron-cyan"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-tron-white flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-400" />
            AI Resume Parser Analytics
          </h2>
          <p className="text-tron-gray mt-1">
            Monitor usage, costs, and performance of the AI resume parser (Beta)
          </p>
        </div>
        
        {/* Date Range Filter */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as '7' | '30' | '90' | 'all')}
          className="px-4 py-2 bg-tron-bg-elevated border border-tron-cyan/20 rounded-md text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-tron-gray">Total Parses</p>
              <p className="text-2xl font-bold text-tron-white">{stats.totalRequests}</p>
            </div>
          </div>
        </div>
        
        {/* Total Cost */}
        <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-tron-gray">Total Cost</p>
              <p className="text-2xl font-bold text-tron-white">
                ${stats.totalCostDollars.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Total Tokens */}
        <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-tron-gray">Total Tokens</p>
              <p className="text-2xl font-bold text-tron-white">
                {stats.totalTokens.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Unique Users */}
        <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-tron-gray">Unique Users</p>
              <p className="text-2xl font-bold text-tron-white">{stats.uniqueUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-tron-bg-card rounded-lg border border-tron-cyan/10 p-4">
          <p className="text-sm text-tron-gray">Avg. Tokens/Parse</p>
          <p className="text-lg font-semibold text-tron-white mt-1">
            {stats.avgTokensPerRequest.toLocaleString()}
          </p>
        </div>
        <div className="bg-tron-bg-card rounded-lg border border-tron-cyan/10 p-4">
          <p className="text-sm text-tron-gray">Avg. Cost/Parse</p>
          <p className="text-lg font-semibold text-tron-white mt-1">
            ${stats.avgCostPerRequest.toFixed(4)}
          </p>
        </div>
        <div className="bg-tron-bg-card rounded-lg border border-tron-cyan/10 p-4">
          <p className="text-sm text-tron-gray">Error Rate</p>
          <p className={`text-lg font-semibold mt-1 ${
            stats.errorRate > 5 ? 'text-red-400' : 'text-green-400'
          }`}>
            {stats.errorRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-tron-bg-card rounded-lg border border-tron-cyan/10 p-4">
          <p className="text-sm text-tron-gray">Input/Output Ratio</p>
          <p className="text-lg font-semibold text-tron-white mt-1">
            {stats.totalResponseTokens > 0 
              ? (stats.totalRequestTokens / stats.totalResponseTokens).toFixed(2) 
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Daily Stats Chart */}
      {dailyStats && dailyStats.length > 0 && (
        <TronPanel 
          title="Daily Usage Trend" 
          icon={<TrendingUp className="w-5 h-5" />}
          glowColor="purple"
        >
          <div className="overflow-x-auto">
            <div className="flex items-end gap-2 h-32 min-w-fit">
              {dailyStats.map((day) => {
                const maxTokens = Math.max(...dailyStats.map(d => d.tokens));
                const height = maxTokens > 0 ? (day.tokens / maxTokens) * 100 : 0;
                return (
                  <div key={day.date} className="flex flex-col items-center min-w-[40px]">
                    <div 
                      className="w-8 bg-purple-500/60 rounded-t hover:bg-purple-500 transition-colors cursor-pointer"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${day.date}: ${day.tokens.toLocaleString()} tokens, ${day.requests} requests, $${day.costDollars.toFixed(4)}`}
                    />
                    <span className="text-xs text-tron-gray mt-1 rotate-45 origin-left">
                      {day.date.split('-').slice(1).join('/')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </TronPanel>
      )}

      {/* Model Stats */}
      {Object.keys(stats.modelStats).length > 0 && (
        <TronPanel 
          title="Model Breakdown" 
          icon={<Bot className="w-5 h-5" />}
          glowColor="blue"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.modelStats).map(([model, modelStats]) => (
              <div key={model} className="bg-tron-bg-elevated rounded-lg p-4 border border-tron-cyan/10">
                <h4 className="text-sm font-medium text-tron-cyan mb-2">{model}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-tron-gray">Parses:</span>
                    <span className="text-tron-white">{modelStats.requests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tron-gray">Tokens:</span>
                    <span className="text-tron-white">{modelStats.tokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tron-gray">Cost:</span>
                    <span className="text-green-400">${(modelStats.costCents / 100).toFixed(4)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TronPanel>
      )}

      {/* Analytics Grid */}
      <TronPanel 
        title="Parsing Log" 
        icon={<Sparkles className="w-5 h-5" />}
        glowColor="purple"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-tron-bg-elevated">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Filename
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Model / Provider
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Request Tokens
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Response Tokens
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tron-cyan/10">
              {analyticsData.map((entry: AnalyticsEntry) => (
                <React.Fragment key={entry._id}>
                  <tr className="hover:bg-tron-bg-elevated transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-tron-gray">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(entry.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-tron-cyan flex-shrink-0" />
                        <p className="text-sm text-tron-white truncate" title={entry.filename}>
                          {truncateText(entry.filename, 30)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code className="text-xs text-tron-cyan font-mono bg-tron-bg-deep px-2 py-1 rounded">
                        {truncateText(entry.userId, 16)}
                      </code>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="text-tron-white font-medium">{entry.model}</span>
                        <span className="text-tron-gray"> / {entry.provider}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-tron-white">
                      {entry.requestTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-tron-white">
                      {entry.responseTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-green-400">
                      {formatCurrency(entry.totalCostCents)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {entry.isError ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          Error
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">
                          Success
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => setExpandedRow(expandedRow === entry._id ? null : entry._id)}
                        className="p-1 hover:bg-purple-500/10 rounded transition-colors"
                      >
                        {expandedRow === entry._id ? (
                          <ChevronUp className="w-4 h-4 text-purple-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-purple-400" />
                        )}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Details Row */}
                  {expandedRow === entry._id && (
                    <tr className="bg-tron-bg-deep">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-tron-cyan mb-2">Input Text (Resume)</h4>
                            <div className="text-sm text-tron-white bg-tron-bg-card p-3 rounded border border-tron-cyan/10 max-h-96 overflow-y-auto">
                              <pre className="whitespace-pre-wrap font-mono text-xs break-words">
                                {entry.inputText || '(No input captured)'}
                              </pre>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-tron-cyan mb-2">Output JSON (Parsed Data)</h4>
                            <div className="text-sm text-tron-white bg-tron-bg-card p-3 rounded border border-tron-cyan/10 max-h-96 overflow-y-auto">
                              <pre className="whitespace-pre-wrap font-mono text-xs break-words">
                                {entry.outputJson || '(No output captured)'}
                              </pre>
                            </div>
                          </div>
                          {entry.latencyMs && (
                            <div>
                              <h4 className="text-sm font-medium text-tron-cyan mb-2">Latency</h4>
                              <p className="text-sm text-tron-white">{entry.latencyMs}ms</p>
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-medium text-tron-cyan mb-2">Parser Type</h4>
                            <p className="text-sm text-tron-white">{entry.parserType}</p>
                          </div>
                          {entry.isError && entry.errorMessage && (
                            <div className="col-span-2">
                              <h4 className="text-sm font-medium text-red-400 mb-2">Error Message</h4>
                              <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded">
                                {entry.errorMessage}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              
              {analyticsData.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-tron-gray">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No analytics data yet</p>
                    <p className="text-sm mt-1">Start parsing resumes with the AI parser to generate analytics</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TronPanel>
    </div>
  );
}
