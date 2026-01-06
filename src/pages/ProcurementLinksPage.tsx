import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ProcurementChat } from '../components/ProcurementChat';
import { ProcurementLinkVerifier } from '../components/ProcurementLinkVerifier';
import { ScrapedProcurementDataGrid } from '../components/ScrapedProcurementDataGrid';
import { FeedbackComponent } from '../components/FeedbackComponent';

export function ProcurementLinksPage() {
  const { isSignedIn } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'verifier' | 'scraper' | 'feedback'>('chat');

  // If user is not signed in and tries to access scraper, redirect to chat
  useEffect(() => {
    if (!isSignedIn && activeSubTab === 'scraper') {
      setActiveSubTab('chat');
    }
  }, [isSignedIn, activeSubTab]);

  return (
    <div className="min-h-screen bg-tron-bg-deep">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="border-b border-tron-cyan/20">
            <nav className="-mb-px flex justify-center space-x-8">
              <button
                onClick={() => setActiveSubTab('chat')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeSubTab === 'chat'
                    ? 'border-tron-cyan text-tron-cyan'
                    : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40'
                }`}
              >
                AI Chat Assistant
              </button>
              <button
                onClick={() => setActiveSubTab('verifier')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeSubTab === 'verifier'
                    ? 'border-tron-cyan text-tron-cyan'
                    : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40'
                }`}
              >
                Link Verifier
              </button>
              {isSignedIn && (
                <button
                  onClick={() => setActiveSubTab('scraper')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeSubTab === 'scraper'
                      ? 'border-tron-cyan text-tron-cyan'
                      : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40'
                  }`}
                >
                  AI Scraper
                </button>
              )}
              <button
                onClick={() => setActiveSubTab('feedback')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeSubTab === 'feedback'
                    ? 'border-tron-cyan text-tron-cyan'
                    : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40'
                }`}
              >
                Feedback
              </button>
            </nav>
          </div>
          {activeSubTab === 'chat' && (
            <ProcurementChat
              onExportToVerifier={() => setActiveSubTab('verifier')}
            />
          )}
          {activeSubTab === 'verifier' && <ProcurementLinkVerifier />}
          {isSignedIn && activeSubTab === 'scraper' && <ScrapedProcurementDataGrid />}
          {activeSubTab === 'feedback' && <FeedbackComponent />}
        </div>
      </div>
    </div>
  );
}

